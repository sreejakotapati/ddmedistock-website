import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { QUOTATION_STATUS } from "@/lib/constants";
import { computeTotals } from "@/lib/services/quotation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function QuotationInbox() {
  const user = await getCurrentUser();
  // Customers only ever see PUBLISHED quotations.
  const quotations = await prisma.quotation.findMany({
    where: { status: QUOTATION_STATUS.PUBLISHED, rfq: { organizationId: user!.organizationId! } },
    orderBy: { publishedAt: "desc" },
    include: { rfq: true, items: true },
  });

  return (
    <>
      <PageHeader title="Quotation Inbox" description="Final quotations published by our procurement team." />
      {quotations.length === 0 ? (
        <EmptyState title="No quotations yet" hint="Quotations appear here once our team publishes them." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quotations.map((q) => {
            const totals = computeTotals(q.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxPct: i.taxPct })));
            return (
              <Link key={q.id} href={`/customer/quotations/${q.id}`}>
                <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--primary)]">{q.number}</span>
                    <Badge tone="green">Published</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{q.rfq.title}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-[var(--muted-foreground)]">{q.items.length} items</div>
                      <div className="text-lg font-bold">{formatCurrency(totals.total, q.currency)}</div>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">{q.publishedAt && formatDate(q.publishedAt)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
