import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { AddVendorProduct } from "@/components/vendor/add-product";
import { formatCurrency } from "@/lib/utils";

export default async function VendorCatalog() {
  const user = await getCurrentUser();
  const vps = await prisma.vendorProduct.findMany({
    where: { vendorId: user!.vendorId! },
    include: { product: { include: { category: true } }, costs: { orderBy: { validFrom: "desc" }, take: 1 } },
    orderBy: { product: { name: "asc" } },
  });

  return (
    <>
      <PageHeader title="Catalog & Stock" description="Your product offerings, stock levels, lead times and cost prices." action={<AddVendorProduct />} />
      {vps.length === 0 ? (
        <EmptyState title="No products in your catalog" hint="Add products so they're available for matching." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Lead time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {vps.map((vp) => (
                <tr key={vp.id} className="hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3 font-medium">{vp.product.name}{vp.product.brand && <span className="ml-1 text-xs text-[var(--muted-foreground)]">({vp.product.brand})</span>}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{vp.product.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{vp.sku || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(vp.costs[0]?.cost ?? 0)}</td>
                  <td className="px-4 py-3 text-right"><Badge tone={vp.stock > 0 ? "green" : "red"}>{vp.stock}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums">{vp.leadTimeDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
