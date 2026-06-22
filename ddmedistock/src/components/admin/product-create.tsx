"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function ProductCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ name: "", brand: "", category: "", originType: "DOMESTIC", uom: "Unit", attrs: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // attrs as "key:value, key:value"
    const attributes = f.attrs.split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
      const [key, ...rest] = pair.split(":");
      return { key: key.trim(), value: rest.join(":").trim() };
    }).filter((a) => a.key && a.value);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, attributes }),
    });
    setLoading(false);
    if (res.ok) {
      setF({ name: "", brand: "", category: "", originType: "DOMESTIC", uom: "Unit", attrs: "" });
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}><Plus size={16} /> Add product</Button>;

  return (
    <Card className="mb-6">
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div><Label>Name</Label><Input required value={f.name} onChange={set("name")} placeholder="Disposable Syringe 5ml" /></div>
          <div><Label>Brand</Label><Input value={f.brand} onChange={set("brand")} placeholder="BD" /></div>
          <div><Label>Category</Label><Input value={f.category} onChange={set("category")} placeholder="Syringes & Needles" /></div>
          <div><Label>Origin</Label><Select value={f.originType} onChange={set("originType")}><option value="DOMESTIC">Domestic</option><option value="IMPORTED">Imported</option></Select></div>
          <div><Label>Unit of measure</Label><Input value={f.uom} onChange={set("uom")} /></div>
          <div><Label>Attributes (key: value, comma-separated)</Label><Input value={f.attrs} onChange={set("attrs")} placeholder="volume: 5ml, sterility: Sterile" /></div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Create</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
