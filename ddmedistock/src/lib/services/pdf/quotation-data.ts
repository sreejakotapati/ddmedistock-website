// Quotation → PDF data loaders.
//
// Bridges Prisma rows to the PDF builders. The customer loader maps ONLY
// customer-safe fields into CustomerQuoteData (no cost/margin/vendor/internal
// note ever enters the object), so the customer PDF cannot leak internal data.

import { prisma } from "@/lib/db";
import type { CustomerQuoteData, InternalQuoteData } from "./quotation-pdf";

async function loadQuotation(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      rfq: { include: { organization: true } },
    },
  });
}

export type LoadedQuotation = NonNullable<Awaited<ReturnType<typeof loadQuotation>>>;

/** Customer-safe projection — sensitive columns are deliberately not read. */
export function toCustomerData(q: LoadedQuotation): CustomerQuoteData {
  return {
    number: q.number,
    rfqReference: q.rfq.reference,
    date: q.publishedAt ?? q.createdAt,
    organizationName: q.rfq.organization?.name ?? "Customer",
    customerNotes: q.customerNotes,
    currency: q.currency,
    items: q.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      taxPct: it.taxPct,
    })),
  };
}

/** Full internal projection — includes cost, margin, vendor, internal notes. */
export function toInternalData(q: LoadedQuotation): InternalQuoteData {
  return {
    number: q.number,
    rfqReference: q.rfq.reference,
    date: q.createdAt,
    organizationName: q.rfq.organization?.name ?? "Customer",
    customerNotes: q.customerNotes,
    internalNotes: q.internalNotes,
    currency: q.currency,
    items: q.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      taxPct: it.taxPct,
      unitCost: it.unitCost,
      marginPct: it.marginPct,
      vendorName: it.vendorName,
      internalNote: it.internalNote,
      originType: it.originType,
    })),
  };
}

export { loadQuotation };
