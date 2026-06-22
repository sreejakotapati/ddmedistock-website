import Link from "next/link";
import { FileSearch, Clock, FileCheck2, Store, IndianRupee } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { RFQ_STATUS_LABELS, QUOTATION_STATUS } from "@/lib/constants";
import { computeTotals } from "@/lib/services/quotation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DashboardCharts } from "@/components/admin/dashboard-charts";

export default async function AdminDashboard() {
  const [rfqsReceived, rfqsPending, quotesPending, vendors, publishedQuotes, recentRfqs] = await Promise.all([
    prisma.rFQ.count(),
    prisma.rFQ.count({ where: { status: { in: ["UNDER_REVIEW", "MATCHING_COMPLETED"] } } }),
    prisma.quotation.count({ where: { status: { in: ["DRAFT", "PENDING_APPROVAL"] } } }),
    prisma.vendor.count(),
    prisma.quotation.findMany({ where: { status: QUOTATION_STATUS.PUBLISHED }, include: { items: true } }),
    prisma.rFQ.findMany({
      orderBy: { createdAt: "desc" }, take: 6,
      include: { organization: true, _count: { select: { lineItems: true } } },
    }),
  ]);

  const revenue = publishedQuotes.reduce(
    (sum, q) => sum + computeTotals(q.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxPct: i.taxPct }))).total,
    0,
  );

  // Aggregations for charts.
  const statusGroups = await prisma.rFQ.groupBy({ by: ["status"], _count: { status: true } });
  const rfqByStatus = statusGroups.map((g) => ({
    name: RFQ_STATUS_LABELS[g.status] ?? g.status,
    value: g._count.status,
  }));
  let domestic = 0, imported = 0;
  for (const q of publishedQuotes) {
    for (const it of q.items) {
      if (it.originType === "IMPORTED") imported++;
      else domestic++;
    }
  }
  const originSplit = [
    { name: "Domestic", value: domestic },
    { name: "Imported", value: imported },
  ];

  return (
    <>
      <PageHeader title="Admin Dashboard" description="Procurement operations overview." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="RFQs Received" value={rfqsReceived} icon={<FileSearch size={18} />} />
        <StatCard label="RFQs Pending" value={rfqsPending} icon={<Clock size={18} />} />
        <StatCard label="Quotes to Approve" value={quotesPending} icon={<FileCheck2 size={18} />} />
        <StatCard label="Vendors" value={vendors} icon={<Store size={18} />} />
        <StatCard label="Published Revenue" value={formatCurrency(revenue)} icon={<IndianRupee size={18} />} />
      </div>

      <div className="mt-6">
        <DashboardCharts rfqByStatus={rfqByStatus} originSplit={originSplit} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent RFQs</h2>
        <Link href="/admin/rfqs" className="text-sm font-medium text-[var(--primary)]">View all</Link>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {recentRfqs.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--muted)]/50">
                <td className="px-4 py-3"><Link href={`/admin/rfqs/${r.id}`} className="font-medium text-[var(--primary)]">{r.reference}</Link></td>
                <td className="px-4 py-3">{r.organization.name}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3">{r._count.lineItems}</td>
                <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{RFQ_STATUS_LABELS[r.status]}</Badge></td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
