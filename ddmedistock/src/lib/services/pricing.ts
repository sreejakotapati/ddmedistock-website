// Internal Margin Engine — computes customer-facing prices from vendor cost
// + margin rules. All cost/margin data here is admin-only and must never be
// serialized to customer responses.

import { prisma } from "@/lib/db";

export type PricingResult = {
  unitCost: number;
  marginPct: number;
  unitPrice: number;
  vendorName: string | null;
  leadTimeDays: number;
};

/** Find the cheapest available vendor offering for a product. */
export async function cheapestVendorOffer(productId: string) {
  const vps = await prisma.vendorProduct.findMany({
    where: { productId },
    include: { vendor: true, costs: { orderBy: { validFrom: "desc" }, take: 1 } },
  });
  let best: { cost: number; vendorName: string; leadTimeDays: number } | null = null;
  for (const vp of vps) {
    const cost = vp.costs[0]?.cost;
    if (cost == null) continue;
    if (!best || cost < best.cost) {
      best = { cost, vendorName: vp.vendor.name, leadTimeDays: vp.leadTimeDays };
    }
  }
  return best;
}

/** Resolve the applicable markup percentage for a product. */
export async function resolveMargin(originType: string, categoryId: string | null) {
  const rules = await prisma.marginRule.findMany({ where: { active: true } });
  // Most specific rule wins: category+origin > category > origin > default.
  const score = (r: { categoryId: string | null; originType: string | null }) =>
    (r.categoryId === categoryId && categoryId ? 2 : 0) +
    (r.originType === originType ? 1 : 0);
  const chosen = rules
    .filter((r) => (!r.categoryId || r.categoryId === categoryId) && (!r.originType || r.originType === originType))
    .sort((a, b) => score(b) - score(a))[0];
  return chosen?.markupPct ?? 20;
}

export async function priceProduct(product: {
  id: string;
  originType: string;
  categoryId: string | null;
}): Promise<PricingResult> {
  const offer = await cheapestVendorOffer(product.id);
  const marginPct = await resolveMargin(product.originType, product.categoryId);
  const unitCost = offer?.cost ?? 0;
  const unitPrice = Math.round(unitCost * (1 + marginPct / 100) * 100) / 100;
  return {
    unitCost,
    marginPct,
    unitPrice,
    vendorName: offer?.vendorName ?? null,
    leadTimeDays: offer?.leadTimeDays ?? 7,
  };
}
