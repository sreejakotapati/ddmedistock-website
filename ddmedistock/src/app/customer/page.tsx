import Link from "next/link";
import { FileText, Clock, Inbox, CheckCircle2, Upload, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RFQ_STATUS_LABELS, QUOTATION_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function CustomerDashboard() {
  const user = await getCurrentUser();
  const orgId = user!.organizationId!;

  const [total, underReview, quotes, recent] = await Promise.all([
    prisma.rFQ.count({ where: { organizationId: orgId } }),
    prisma.rFQ.count({ where: { organizationId: orgId, status: { in: ["UNDER_REVIEW", "MATCHING_COMPLETED", "QUOTATION_IN_PROGRESS"] } } }),
    prisma.quotation.count({ where: { status: QUOTATION_STATUS.PUBLISHED, rfq: { organizationId: orgId } } }),
    prisma.rFQ.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { lineItems: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user!.name.split(" ")[0]}`}
        description="Upload requirement sheets and track your quotations."
        action={
          <div className="flex gap-2">
            <Link href="/customer/catalog"><Button variant="outline"><Search size={16} /> Search products</Button></Link>
            <Link href="/customer/rfqs/new"><Button><Upload size={16} /> New RFQ</Button></Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total RFQs" value={total} icon={<FileText size={18} />} />
        <StatCard label="In Progress" value={underReview} icon={<Clock size={18} />} />
        <StatCard label="Quotations Received" value={quotes} icon={<Inbox size={18} />} />
        <StatCard label="Organization" value={user!.organization?.type ?? "—"} hint={user!.organization?.name} icon={<CheckCircle2 size={18} />} />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Recent RFQs</h2>
      {recent.length === 0 ? (
        <EmptyState title="No RFQs yet" hint="Upload your first requirement sheet to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3">
                    <Link href={`/customer/rfqs/${r.id}`} className="font-medium text-[var(--primary)]">{r.reference}</Link>
                  </td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{r._count.lineItems}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{RFQ_STATUS_LABELS[r.status]}</Badge></td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
