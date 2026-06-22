"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AddVendorProduct() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ name: "", brand: "", category: "", attrs: "", cost: 0, stock: 0, leadTimeDays: 7, sku: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === "number" ? +e.target.value : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const attributes = f.attrs.split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
      const [key, ...rest] = pair.split(":");
      return { key: key.trim(), value: rest.join(":").trim() };
    }).filter((a) => a.key && a.value);
    const res = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, attributes }),
    });
    setLoading(false);
    if (res.ok) {
      setF({ name: "", brand: "", category: "", attrs: "", cost: 0, stock: 0, leadTimeDays: 7, sku: "" });
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}><Plus size={16} /> Add product</Button>;

  return (
    <Card className="mb-6">
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div><Label>Product name</Label><Input required value={f.name} onChange={set("name")} placeholder="Disposable Syringe 5ml" /></div>
          <div><Label>Brand</Label><Input value={f.brand} onChange={set("brand")} /></div>
          <div><Label>Category</Label><Input value={f.category} onChange={set("category")} /></div>
          <div><Label>Attributes (key: value, …)</Label><Input value={f.attrs} onChange={set("attrs")} placeholder="volume: 5ml, sterility: Sterile" /></div>
          <div><Label>Cost ₹ (internal)</Label><Input type="number" required value={f.cost} onChange={set("cost")} /></div>
          <div><Label>Stock</Label><Input type="number" value={f.stock} onChange={set("stock")} /></div>
          <div><Label>Lead time (days)</Label><Input type="number" value={f.leadTimeDays} onChange={set("leadTimeDays")} /></div>
          <div><Label>SKU</Label><Input value={f.sku} onChange={set("sku")} /></div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Save</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
