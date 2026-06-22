import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { VendorActions } from "@/components/admin/vendor-actions";

export default async function AdminVendors() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { vendorProducts: true } } },
  });

  return (
    <>
      <PageHeader title="Vendor Management" description="Onboarding, compliance and approval. Domestic & imported tagging." />
      {vendors.length === 0 ? (
        <EmptyState title="No vendors yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">CDSCO</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3"><div className="font-medium">{v.name}</div><div className="text-xs text-[var(--muted-foreground)]">{v.email}</div></td>
                  <td className="px-4 py-3"><Badge tone={v.originType === "DOMESTIC" ? "green" : "blue"}>{v.originType}</Badge></td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{v.cdscoLicense || "—"}</td>
                  <td className="px-4 py-3">{v._count.vendorProducts}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[v.status] ?? "gray"}>{v.status}</Badge></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><VendorActions id={v.id} status={v.status} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
