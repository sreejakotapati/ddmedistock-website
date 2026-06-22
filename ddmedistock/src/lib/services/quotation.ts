// AI Draft Quotation generation + lifecycle.
//
// The AI generates a DRAFT quotation visible ONLY to admins. Admins review,
// edit, and publish. Customers only ever see PUBLISHED quotations, and even
// then never see unitCost / marginPct / vendorName / internalNote.

import { prisma } from "@/lib/db";
import { priceProduct } from "./pricing";
import { QUOTATION_STATUS, RFQ_STATUS } from "@/lib/constants";
import { audit } from "./audit";
import { assertCan, CAPABILITIES } from "@/lib/rbac";
import { transition, recordApproval } from "./workflow-log";
import { notifyApprovalRequested, notifyQuotationPublished } from "./notifications";

let counter = 0;
function genNumber(prefix: string) {
  const y = new Date().getFullYear();
  const rand = Date.now().toString(36).slice(-5).toUpperCase();
  counter += 1;
  return `${prefix}-${y}-${rand}${counter}`;
}

/**
 * Build an AI draft quotation from the currently-selected product match of
 * each RFQ line item, with pricing computed by the margin engine.
 */
export async function generateDraftQuotation(rfqId: string, actorId?: string) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: {
      lineItems: {
        orderBy: { lineNo: "asc" },
        include: { matches: { include: { product: { include: { category: true } } } } },
      },
    },
  });
  if (!rfq) throw new Error("RFQ not found");

  const quotation = await prisma.quotation.create({
    data: {
      number: genNumber("QT"),
      rfqId,
      status: QUOTATION_STATUS.DRAFT,
      customerNotes: "",
      internalNotes: "AI-generated draft. Review pricing and sourcing before publishing.",
    },
  });

  let sortOrder = 0;
  for (const li of rfq.lineItems) {
    const selected =
      li.matches.find((m) => m.isSelected) ||
      li.matches.sort((a, b) => b.score - a.score)[0];

    if (!selected) {
      // No catalog match — add an unmatched placeholder for admin to resolve.
      await prisma.quotationItem.create({
        data: {
          quotationId: quotation.id,
          description: `${li.productName} (no catalog match — manual sourcing needed)`,
          quantity: li.quantity,
          unit: li.unit,
          sortOrder: sortOrder++,
          internalNote: "AI found no confident match.",
        },
      });
      continue;
    }

    const pricing = await priceProduct({
      id: selected.product.id,
      originType: selected.product.originType,
      categoryId: selected.product.categoryId,
    });

    await prisma.quotationItem.create({
      data: {
        quotationId: quotation.id,
        productId: selected.product.id,
        description: selected.product.name + (selected.product.brand ? ` (${selected.product.brand})` : ""),
        quantity: li.quantity,
        unit: li.unit,
        unitCost: pricing.unitCost,
        marginPct: pricing.marginPct,
        unitPrice: pricing.unitPrice,
        leadTimeDays: pricing.leadTimeDays,
        originType: selected.product.originType,
        vendorName: pricing.vendorName,
        internalNote: `Match ${selected.score}% (${selected.matchType}). ${selected.reason}`,
        sortOrder: sortOrder++,
      },
    });
  }

  await prisma.rFQ.update({
    where: { id: rfqId },
    data: { status: RFQ_STATUS.QUOTATION_IN_PROGRESS },
  });

  await audit(actorId ?? null, "QUOTATION_DRAFTED", "Quotation", quotation.id, { rfqId });
  return quotation;
}

/** Customer-safe totals (no cost/margin leakage). */
export function computeTotals(
  items: { quantity: number; unitPrice: number; taxPct: number }[],
) {
  let subtotal = 0;
  let tax = 0;
  for (const it of items) {
    const line = it.quantity * it.unitPrice;
    subtotal += line;
    tax += (line * it.taxPct) / 100;
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

/** Internal totals including cost & margin (admin-only). */
export function computeInternalTotals(
  items: { quantity: number; unitPrice: number; unitCost: number }[],
) {
  let revenue = 0;
  let cost = 0;
  for (const it of items) {
    revenue += it.quantity * it.unitPrice;
    cost += it.quantity * it.unitCost;
  }
  const profit = revenue - cost;
  return {
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
  };
}

/**
 * Submit a draft for approval. Moves a quotation into PENDING_APPROVAL and
 * records the workflow transition. Requires QUOTATION_SUBMIT_APPROVAL.
 */
export async function submitForApproval(quotationId: string, actor: { id: string; role: string }) {
  assertCan(actor.role, CAPABILITIES.QUOTATION_SUBMIT_APPROVAL);
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q) throw new Error("Quotation not found");
  await transition({
    kind: "QUOTATION",
    entityId: quotationId,
    from: q.status,
    to: QUOTATION_STATUS.PENDING_APPROVAL,
    actorId: actor.id,
    note: "Submitted for approval",
  });
  // Alert approvers (in-app + email) that a quotation awaits approval.
  await notifyApprovalRequested(quotationId);
  return q;
}

/**
 * Approve or reject a quotation pending approval. Requires QUOTATION_APPROVE —
 * which the AI never holds, enforcing "AI cannot approve". On rejection the
 * quotation returns to DRAFT for further editing.
 */
export async function decideApproval(
  quotationId: string,
  decision: "APPROVED" | "REJECTED",
  actor: { id: string; role: string },
  note?: string,
) {
  assertCan(actor.role, CAPABILITIES.QUOTATION_APPROVE);
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q) throw new Error("Quotation not found");

  await recordApproval({ kind: "QUOTATION", entityId: quotationId, decision, actorId: actor.id, note });
  // PENDING_APPROVAL → DRAFT on reject (re-editable); approval is realized at publish.
  if (decision === "REJECTED") {
    await transition({
      kind: "QUOTATION",
      entityId: quotationId,
      from: q.status,
      to: QUOTATION_STATUS.DRAFT,
      actorId: actor.id,
      note: note ?? "Rejected — returned to draft",
    });
  }
  return q;
}

/** Publish: snapshot a version, flip status, notify the customer. */
export async function publishQuotation(quotationId: string, actorId?: string, actorRole?: string) {
  // Only roles with QUOTATION_PUBLISH may publish (Admin/PM/Super Admin).
  // actorRole is optional for backward compatibility; when provided it is enforced.
  if (actorRole !== undefined) assertCan(actorRole, CAPABILITIES.QUOTATION_PUBLISH);

  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true, rfq: { include: { createdBy: true } } },
  });
  if (!q) throw new Error("Quotation not found");

  const version = q.version;
  await prisma.quotationVersion.create({
    data: {
      quotationId,
      version,
      note: "Published to customer",
      createdById: actorId,
      snapshot: { items: q.items, customerNotes: q.customerNotes, taxPct: q.taxPct } as object,
    },
  });

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: QUOTATION_STATUS.PUBLISHED, publishedAt: new Date(), version: version + 1 },
  });

  await prisma.rFQ.update({
    where: { id: q.rfqId },
    data: { status: RFQ_STATUS.QUOTATION_UPLOADED },
  });

  // Notify the customer (in-app + email) via the queue-backed fan-out.
  await notifyQuotationPublished(quotationId);

  await audit(actorId ?? null, "QUOTATION_PUBLISHED", "Quotation", quotationId, {});
  return q;
}
