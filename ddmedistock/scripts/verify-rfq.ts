// Workflow verification: drives the real RFQ → matching → AI draft quotation →
// submit → approve → publish lifecycle end-to-end against the database, then
// checks the Phase-12 invariants. It creates clearly-tagged temporary rows
// (reference "RFQ-VERIFY-…") and deletes them in a finally block. It does NOT
// modify business logic — it only calls the existing services.
// Run standalone: `npx tsx scripts/verify-rfq.ts`.

import { Reporter, printSection, type Section } from "./verify/lib";

export async function verifyRfq(): Promise<Section> {
  const r = new Reporter("Workflows (RFQ · Quotation · Approval)");
  const { prisma } = await import("../src/lib/db");
  // Run jobs inline (no Redis dependency for the verifier).
  delete process.env.REDIS_URL;

  let rfqId: string | undefined;
  let quotationId: string | undefined;

  try {
    const org = await prisma.organization.findFirst({ where: { deletedAt: null } });
    const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER", deletedAt: null } });
    const pm = await prisma.user.findFirst({ where: { role: "PROCUREMENT_MANAGER", deletedAt: null } });
    if (!org || !customer || !pm) {
      r.warn("Seed prerequisites", "missing org/customer/PM — run `npm run db:seed`");
      return r.section();
    }

    // 8. RFQ processing workflow: create + parse + match.
    await r.check("RFQ processing: create → parse → match", async () => {
      const { createAndProcessRfq } = await import("../src/lib/services/rfq");
      const rfq = await createAndProcessRfq({
        title: "VERIFY harness RFQ",
        rawText: "Disposable Syringe 5ml - 200 nos\nExamination Gloves Nitrile Medium - 50 box\nMicroscope Glass Slides - 10 box",
        sourceType: "TEXT",
        organizationId: org.id,
        createdById: customer.id,
      });
      rfqId = rfq.id;
      const full = await prisma.rFQ.findUnique({
        where: { id: rfq.id },
        include: { lineItems: { include: { matches: true } } },
      });
      const items = full?.lineItems.length ?? 0;
      if (items === 0) throw new Error("no line items parsed");
      const matched = full!.lineItems.filter((li) => li.matches.length > 0).length;
      if (full!.status !== "MATCHING_COMPLETED") throw new Error(`status=${full!.status}`);
      return `${items} line items parsed, ${matched} matched, status=MATCHING_COMPLETED`;
    });

    // 9. Supplier quotation workflow: AI draft generation with pricing.
    await r.check("Quotation generation: AI draft with pricing + margin", async () => {
      if (!rfqId) throw new Error("no RFQ from previous step");
      const { generateDraftQuotation } = await import("../src/lib/services/quotation");
      const q = await generateDraftQuotation(rfqId, pm.id);
      quotationId = q.id;
      const full = await prisma.quotation.findUnique({ where: { id: q.id }, include: { items: true } });
      if (!full) throw new Error("quotation not created");
      if (full.status !== "DRAFT") throw new Error(`status=${full.status}, expected DRAFT`);
      if (full.items.length === 0) throw new Error("draft has no items");
      const priced = full.items.filter((i) => i.unitPrice > 0).length;
      return `draft ${full.number}: ${full.items.length} items, ${priced} priced (cost→margin→price)`;
    });

    // 10. Admin approval workflow: submit → approve → publish + Phase-12 guards.
    await r.check("Approval: AI/customer CANNOT approve (capability denied)", async () => {
      if (!quotationId) throw new Error("no quotation");
      const { decideApproval } = await import("../src/lib/services/quotation");
      const { ForbiddenError } = await import("../src/lib/rbac");
      try {
        await decideApproval(quotationId, "APPROVED", { id: customer.id, role: "CUSTOMER" });
        throw new Error("customer approval was NOT blocked");
      } catch (e) {
        if (e instanceof ForbiddenError) return "customer approval correctly blocked";
        throw e;
      }
    });

    await r.check("Approval: submit → approve → publish (Procurement Manager)", async () => {
      if (!quotationId) throw new Error("no quotation");
      const { submitForApproval, decideApproval, publishQuotation } = await import("../src/lib/services/quotation");
      const actor = { id: pm.id, role: pm.role };
      await submitForApproval(quotationId, actor);
      let s = (await prisma.quotation.findUnique({ where: { id: quotationId } }))!.status;
      if (s !== "PENDING_APPROVAL") throw new Error(`after submit: ${s}`);
      await decideApproval(quotationId, "APPROVED", actor, "verify harness");
      await publishQuotation(quotationId, actor.id, actor.role);
      s = (await prisma.quotation.findUnique({ where: { id: quotationId } }))!.status;
      if (s !== "PUBLISHED") throw new Error(`after publish: ${s}`);
      return "DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED";
    });

    await r.check("Workflow history recorded (approval audit trail)", async () => {
      if (!quotationId) throw new Error("no quotation");
      const { workflowHistory } = await import("../src/lib/services/workflow-log");
      const hist = await workflowHistory("QUOTATION", quotationId);
      if (hist.length === 0) throw new Error("no workflow history entries");
      return `${hist.length} transition/approval events logged`;
    });

    // Phase-12 confidentiality: customer projection must omit cost/margin/vendor.
    await r.check("Customer quotation view hides cost / margin / vendor", async () => {
      if (!quotationId) throw new Error("no quotation");
      const { toCustomerData } = await import("../src/lib/services/pdf/quotation-data");
      const { loadQuotation } = await import("../src/lib/services/pdf/quotation-data");
      const q = await loadQuotation(quotationId);
      if (!q) throw new Error("quotation not loadable");
      const cust = toCustomerData(q);
      const json = JSON.stringify(cust);
      for (const leak of ["unitCost", "marginPct", "vendorName", "internalNote"]) {
        if (json.includes(leak)) throw new Error(`customer data leaked field: ${leak}`);
      }
      return "no cost/margin/vendor/internalNote in customer projection";
    });

    return r.section();
  } catch (e) {
    r.fail("Workflow harness", e instanceof Error ? e.message : String(e));
    return r.section();
  } finally {
    // Clean up the temporary rows this harness created.
    try {
      if (quotationId) {
        await prisma.quotationVersion.deleteMany({ where: { quotationId } });
        await prisma.quotationItem.deleteMany({ where: { quotationId } });
        await prisma.quotation.deleteMany({ where: { id: quotationId } });
      }
      if (rfqId) {
        const lis = await prisma.rFQLineItem.findMany({ where: { rfqId }, select: { id: true } });
        await prisma.productMatch.deleteMany({ where: { lineItemId: { in: lis.map((l) => l.id) } } });
        await prisma.rFQLineItem.deleteMany({ where: { rfqId } });
        await prisma.auditLog.deleteMany({ where: { entityId: rfqId } });
        await prisma.rFQ.deleteMany({ where: { id: rfqId } });
      }
      if (quotationId) await prisma.auditLog.deleteMany({ where: { entityId: quotationId } });
    } catch {
      /* best-effort cleanup */
    }
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyRfq().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
