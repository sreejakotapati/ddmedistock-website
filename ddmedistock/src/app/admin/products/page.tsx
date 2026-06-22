import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ProductCreate } from "@/components/admin/product-create";

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { category: true, attributes: true, _count: { select: { vendorProducts: true } } },
  });

  return (
    <>
      <PageHeader title="Product Master" description="Catalog, categories, specifications and attributes." action={<ProductCreate />} />
      {products.length === 0 ? (
        <EmptyState title="No products yet" hint="Add products to power AI matching." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Specifications</th>
                <th className="px-4 py-3">Vendors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3 font-medium">{p.name}{p.brand && <span className="ml-1 text-xs text-[var(--muted-foreground)]">({p.brand})</span>}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={p.originType === "DOMESTIC" ? "green" : "blue"}>{p.originType}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.attributes.map((a) => <Badge key={a.id} tone="gray">{a.key}: {a.value}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{p._count.vendorProducts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
