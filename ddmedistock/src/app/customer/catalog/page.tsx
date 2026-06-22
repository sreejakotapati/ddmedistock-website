"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Send, Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string; name: string; brand: string | null; uom: string;
  originType: string; category: string | null; attributes: { key: string; value: string }[];
};
type CartItem = { id: string; name: string; unit: string; quantity: number };

export default function CatalogPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    const res = await fetch(`/api/catalog?q=${encodeURIComponent(term)}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  function add(p: Product) {
    setCart((c) => c.find((i) => i.id === p.id) ? c : [...c, { id: p.id, name: p.name + (p.brand ? ` (${p.brand})` : ""), unit: p.uom, quantity: 1 }]);
  }
  function setQty(id: string, qty: number) {
    setCart((c) => c.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  }
  function remove(id: string) {
    setCart((c) => c.filter((i) => i.id !== id));
  }

  async function submit() {
    if (cart.length === 0) return;
    setSubmitting(true);
    const res = await fetch("/api/rfqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Catalog-based RFQ", items: cart }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      router.push(`/customer/rfqs/${data.id}`);
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader
        title="Product Search"
        description="Search the catalog by name or specification, build a requirement, and submit it as an RFQ. (No pricing is shown — quotations are prepared by our team.)"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. syringe, gloves, 22G needle…" className="pl-10" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-[var(--muted-foreground)]"><Loader2 className="animate-spin" size={16} /> Searching…</div>
          ) : products.length === 0 ? (
            <EmptyState title="No products found" hint="Try a different term." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{p.brand || "Generic"} · {p.category || "—"}</div>
                      </div>
                      <Badge tone={p.originType === "DOMESTIC" ? "green" : "blue"}>{p.originType === "DOMESTIC" ? "Domestic" : "Imported"}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.attributes.slice(0, 4).map((a) => <Badge key={a.key} tone="gray">{a.key}: {a.value}</Badge>)}
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 self-start" onClick={() => add(p)}>
                      <Plus size={14} /> Add to request
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Request builder */}
        <div>
          <Card className="sticky top-6">
            <CardContent>
              <h3 className="font-semibold">Requirement ({cart.length})</h3>
              {cart.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">Add products to build your RFQ.</p>
              ) : (
                <>
                  <div className="mt-3 space-y-3">
                    {cart.map((i) => (
                      <div key={i.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{i.name}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{i.unit}</div>
                        </div>
                        <Input type="number" min={1} value={i.quantity} onChange={(e) => setQty(i.id, parseInt(e.target.value) || 1)} className="h-8 w-20" />
                        <button onClick={() => remove(i.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Label>RFQ title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ICU consumables" />
                  </div>
                  <Button className="mt-4 w-full" onClick={submit} disabled={submitting}>
                    {submitting ? <><Loader2 className="animate-spin" size={16} /> Submitting…</> : <><Send size={16} /> Submit as RFQ</>}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
