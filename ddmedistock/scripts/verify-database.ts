// Database verification: connectivity, extensions, seeded data, and that the
// key entity relationships traverse correctly via Prisma.
// Run standalone: `npx tsx scripts/verify-database.ts`.

import { Reporter, printSection, type Section } from "./verify/lib";

export async function verifyDatabase(): Promise<Section> {
  const r = new Reporter("Database");
  const { prisma } = await import("../src/lib/db");

  try {
    await r.check("Database connectivity", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return "connected";
    });

    await r.check("pgvector + pg_trgm extensions", async () => {
      const rows = await prisma.$queryRaw<{ extname: string }[]>`
        SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm')`;
      const found = rows.map((x) => x.extname).sort();
      if (!found.includes("vector")) throw new Error("pgvector missing");
      if (!found.includes("pg_trgm")) throw new Error("pg_trgm missing");
      return found.join(", ");
    });

    // 5. Database relationship verification — traverse each FK path.
    await r.check("Product → Category relation", async () => {
      const p = await prisma.product.findFirst({ where: { categoryId: { not: null } }, include: { category: true } });
      if (!p) return "no categorized products (seed?)";
      if (!p.category) throw new Error("categoryId set but relation did not resolve");
      return `${p.name} → ${p.category.name}`;
    }, true);

    await r.check("Product → attributes / vendorProducts → cost chain", async () => {
      const p = await prisma.product.findFirst({
        include: { attributes: true, vendorProducts: { include: { costs: true, vendor: true } } },
      });
      if (!p) return "no products (seed?)";
      const vp = p.vendorProducts[0];
      return `attrs=${p.attributes.length}, vendorProducts=${p.vendorProducts.length}, cost=${vp?.costs[0]?.cost ?? "n/a"} via ${vp?.vendor.name ?? "n/a"}`;
    }, true);

    await r.check("User → Organization relation", async () => {
      const u = await prisma.user.findFirst({ where: { role: "CUSTOMER" }, include: { organization: true } });
      if (!u) return "no customer user (seed?)";
      if (u.organizationId && !u.organization) throw new Error("organizationId set but relation did not resolve");
      return u.organization ? `${u.email} → ${u.organization.name}` : "customer has no org";
    }, true);

    await r.check("RFQ → lineItems → matches → product chain", async () => {
      const rfq = await prisma.rFQ.findFirst({
        include: { lineItems: { include: { matches: { include: { product: true } } } }, organization: true, createdBy: true },
      });
      if (!rfq) return "no RFQs yet (created by workflow tests / usage)";
      const li = rfq.lineItems[0];
      return `rfq=${rfq.reference}, items=${rfq.lineItems.length}, firstItemMatches=${li?.matches.length ?? 0}`;
    }, true);

    await r.check("Quotation → items + RFQ relation", async () => {
      const q = await prisma.quotation.findFirst({ include: { items: true, rfq: true } });
      if (!q) return "no quotations yet";
      if (!q.rfq) throw new Error("quotation has no RFQ");
      return `quotation=${q.number}, items=${q.items.length}, status=${q.status}`;
    }, true);

    await r.check("Referential integrity: no orphaned line items", async () => {
      const orphans = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*)::bigint AS n FROM "RFQLineItem" li
        LEFT JOIN "RFQ" r ON r.id = li."rfqId" WHERE r.id IS NULL`;
      const n = Number(orphans[0]?.n ?? 0);
      if (n > 0) throw new Error(`${n} orphaned RFQLineItem rows`);
      return "none";
    });

    await r.check("Soft-delete columns present & queryable", async () => {
      const active = await prisma.product.count({ where: { deletedAt: null } });
      return `${active} active products (deletedAt filter works)`;
    });

    return r.section();
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyDatabase().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
