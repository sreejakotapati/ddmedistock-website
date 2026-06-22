import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RfqReview } from "@/components/admin/rfq-review";

export default async function AdminRfqDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      organization: true,
      quotations: { orderBy: { createdAt: "desc" } },
      lineItems: {
        orderBy: { lineNo: "asc" },
        include: {
          matches: {
            orderBy: { rank: "asc" },
            include: { product: { include: { category: true } } },
          },
        },
      },
    },
  });
  if (!rfq) notFound();

  // Shape into a serializable payload for the client component.
  const data = {
    id: rfq.id,
    reference: rfq.reference,
    title: rfq.title,
    status: rfq.status,
    sourceType: rfq.sourceType,
    sourceFileName: rfq.sourceFileName,
    organizationName: rfq.organization.name,
    rawText: rfq.rawText,
    quotations: rfq.quotations.map((q) => ({ id: q.id, number: q.number, status: q.status })),
    lineItems: rfq.lineItems.map((li) => ({
      id: li.id,
      lineNo: li.lineNo,
      productName: li.productName,
      brand: li.brand,
      quantity: li.quantity,
      unit: li.unit,
      attributes: (li.attributes ?? {}) as Record<string, string>,
      matches: li.matches.map((m) => ({
        id: m.id,
        productId: m.productId,
        score: m.score,
        matchType: m.matchType,
        reason: m.reason,
        isSelected: m.isSelected,
        productName: m.product.name,
        productBrand: m.product.brand,
        originType: m.product.originType,
        category: m.product.category?.name ?? null,
      })),
    })),
  };

  return <RfqReview rfq={data} />;
}
