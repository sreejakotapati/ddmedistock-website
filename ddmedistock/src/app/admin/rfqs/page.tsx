import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { RFQ_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function AdminRfqs() {
  const rfqs = await prisma.rFQ.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: true, _count: { select: { lineItems: true, quotations: true } } },
  });

  return (
    <>
      <PageHeader title="RFQ Management" description="Review extracted items, AI matches and prepare quotations." />
      {rfqs.length === 0 ? (
        <EmptyState title="No RFQs received yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rfqs.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3"><Link href={`/admin/rfqs/${r.id}`} className="font-medium text-[var(--primary)]">{r.reference}</Link></td>
                  <td className="px-4 py-3">{r.organization.name}</td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{r._count.lineItems}</td>
                  <td className="px-4 py-3">{r._count.quotations}</td>
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
