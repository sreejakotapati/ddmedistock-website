import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { QuotationEditor } from "@/components/admin/quotation-editor";

export default async function AdminQuotationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      rfq: { include: { organization: true } },
    },
  });
  if (!q) notFound();

  const data = {
    id: q.id,
    number: q.number,
    status: q.status,
    currency: q.currency,
    customerNotes: q.customerNotes,
    internalNotes: q.internalNotes,
    taxPct: q.taxPct,
    publishedAt: q.publishedAt?.toISOString() ?? null,
    rfqReference: q.rfq.reference,
    rfqId: q.rfqId,
    organizationName: q.rfq.organization.name,
    items: q.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitCost: i.unitCost,
      marginPct: i.marginPct,
      unitPrice: i.unitPrice,
      taxPct: i.taxPct,
      leadTimeDays: i.leadTimeDays,
      originType: i.originType,
      vendorName: i.vendorName,
      internalNote: i.internalNote,
      productId: i.productId,
    })),
  };

  return <QuotationEditor quotation={data} />;
}
