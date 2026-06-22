import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RFQ_STATUS_LABELS, QUOTATION_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const STEPS = ["UNDER_REVIEW", "MATCHING_COMPLETED", "QUOTATION_IN_PROGRESS", "QUOTATION_UPLOADED"];

export default async function CustomerRfqDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const rfq = await prisma.rFQ.findFirst({
    where: { id, organizationId: user!.organizationId! },
    include: {
      lineItems: { orderBy: { lineNo: "asc" } },
      quotations: { where: { status: QUOTATION_STATUS.PUBLISHED }, orderBy: { publishedAt: "desc" } },
    },
  });
  if (!rfq) notFound();

  const published = rfq.quotations[0];
  const currentStep = STEPS.indexOf(rfq.status);

  return (
    <>
      <Link href="/customer/rfqs" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to RFQs
      </Link>
      <PageHeader
        title={rfq.title}
        description={`${rfq.reference} · Submitted ${formatDateTime(rfq.createdAt)}`}
        action={<Badge tone={STATUS_TONE[rfq.status]}>{RFQ_STATUS_LABELS[rfq.status]}</Badge>}
      />

      {/* Status timeline */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s} className={`rounded-lg border p-3 text-center text-xs ${i <= currentStep ? "border-sky-200 bg-sky-50 text-sky-700" : "border-[var(--border)] bg-white text-[var(--muted-foreground)]"}`}>
            <div className={`mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${i <= currentStep ? "bg-[var(--primary)] text-white" : "bg-slate-100"}`}>{i + 1}</div>
            {RFQ_STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      {published && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-800">Your quotation is ready</p>
              <p className="text-sm text-emerald-700">Quotation {published.number} has been published by our team.</p>
            </div>
            <Link href={`/customer/quotations/${published.id}`}>
              <Button variant="success"><Download size={16} /> View &amp; download</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={16} /> Extracted line items ({rfq.lineItems.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Specifications</th>
                <th className="px-4 py-3 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rfq.lineItems.map((li) => {
                const attrs = (li.attributes ?? {}) as Record<string, string>;
                return (
                  <tr key={li.id}>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{li.lineNo}</td>
                    <td className="px-4 py-3 font-medium">
                      {li.productName}
                      {li.brand && <span className="ml-1 text-xs text-[var(--muted-foreground)]">({li.brand})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(attrs).length === 0 ? <span className="text-xs text-[var(--muted-foreground)]">—</span> :
                          Object.entries(attrs).map(([k, v]) => <Badge key={k} tone="blue">{k}: {v}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{li.quantity} {li.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-[var(--muted-foreground)]">
        Product matching and pricing are reviewed by our procurement team. You will be notified when your final quotation is ready.
      </p>
    </>
  );
}
