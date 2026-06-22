import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Stethoscope, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/print-button";
import { QUOTATION_STATUS } from "@/lib/constants";
import { computeTotals } from "@/lib/services/quotation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomerQuotation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Only PUBLISHED quotations for this org are visible to the customer.
  const q = await prisma.quotation.findFirst({
    where: { id, status: QUOTATION_STATUS.PUBLISHED, rfq: { organizationId: user!.organizationId! } },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      rfq: { include: { organization: true } },
    },
  });
  if (!q) notFound();

  const totals = computeTotals(q.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxPct: i.taxPct })));

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/customer/quotations" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Back to inbox
        </Link>
        <div className="flex gap-2">
          <a
            href={`/api/customer/quotations/${q.id}/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--muted)]"
          >
            <Download size={16} /> Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Printable quotation document — customer-safe (no cost / margin / supplier) */}
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-6">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--primary)] text-white"><Stethoscope size={20} /></span>
            <div>
              <div className="text-lg font-bold">DDMediStock</div>
              <div className="text-xs text-[var(--muted-foreground)]">Medical Procurement Services</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">QUOTATION</div>
            <div className="text-sm text-[var(--muted-foreground)]">{q.number}</div>
            <Badge tone="green" className="mt-1">Published {q.publishedAt && formatDate(q.publishedAt)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 text-sm">
          <div>
            <div className="text-xs uppercase text-[var(--muted-foreground)]">Prepared for</div>
            <div className="font-semibold">{q.rfq.organization.name}</div>
            <div className="text-[var(--muted-foreground)]">{q.rfq.organization.type}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-[var(--muted-foreground)]">Against RFQ</div>
            <div className="font-semibold">{q.rfq.reference}</div>
            <div className="text-[var(--muted-foreground)]">{q.rfq.title}</div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-y border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="py-2">#</th>
              <th className="py-2">Product</th>
              <th className="py-2">Origin</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Lead Time</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {q.items.map((it, i) => (
              <tr key={it.id}>
                <td className="py-2 text-[var(--muted-foreground)]">{i + 1}</td>
                <td className="py-2 font-medium">{it.description}</td>
                <td className="py-2"><Badge tone={it.originType === "DOMESTIC" ? "green" : "blue"}>{it.originType === "DOMESTIC" ? "Domestic" : "Imported"}</Badge></td>
                <td className="py-2 text-right tabular-nums">{it.quantity} {it.unit}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(it.unitPrice, q.currency)}</td>
                <td className="py-2 text-right tabular-nums">{it.leadTimeDays}d</td>
                <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(it.quantity * it.unitPrice, q.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal, q.currency)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Tax (GST)</span><span className="tabular-nums">{formatCurrency(totals.tax, q.currency)}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1 text-base font-bold"><span>Total</span><span className="tabular-nums">{formatCurrency(totals.total, q.currency)}</span></div>
          </div>
        </div>

        {q.customerNotes && (
          <div className="mt-6 rounded-lg bg-[var(--muted)] p-4 text-sm">
            <div className="mb-1 font-medium">Notes</div>
            <p className="whitespace-pre-wrap text-[var(--muted-foreground)]">{q.customerNotes}</p>
          </div>
        )}

        <p className="mt-8 border-t border-[var(--border)] pt-4 text-center text-xs text-[var(--muted-foreground)]">
          This quotation is generated by DDMediStock and approved by our procurement team. Prices valid for 30 days.
        </p>
      </div>
    </>
  );
}
