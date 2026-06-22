import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function AdminAudit() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <>
      <PageHeader title="Audit Logs" description="Full activity trail for governance & compliance (DPDP/GDPR)." />
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3">{l.user?.name ?? "System"}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{l.action}</Badge></td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
