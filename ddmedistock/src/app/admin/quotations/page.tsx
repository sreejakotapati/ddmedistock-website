import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { QUOTATION_STATUS_LABELS } from "@/lib/constants";
import { computeTotals } from "@/lib/services/quotation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminQuotations() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: { rfq: { include: { organization: true } }, items: true },
  });

  return (
    <>
      <PageHeader title="Quotations" description="AI drafts and published quotations. Drafts are visible only to admins." />
      {quotations.length === 0 ? (
        <EmptyState title="No quotations yet" hint="Generate a draft from an RFQ to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">RFQ</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {quotations.map((q) => {
                const totals = computeTotals(q.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxPct: i.taxPct })));
                return (
                  <tr key={q.id} className="hover:bg-[var(--muted)]/50">
                    <td className="px-4 py-3"><Link href={`/admin/quotations/${q.id}`} className="font-medium text-[var(--primary)]">{q.number}</Link></td>
                    <td className="px-4 py-3">{q.rfq.organization.name}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{q.rfq.reference}</td>
                    <td className="px-4 py-3">{q.items.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.total, q.currency)}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[q.status]}>{QUOTATION_STATUS_LABELS[q.status]}</Badge></td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(q.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
