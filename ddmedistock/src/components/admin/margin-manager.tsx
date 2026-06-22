"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Rule = { id: string; name: string; originType: string | null; markupPct: number };

export function MarginManager({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", originType: "", markupPct: 20 });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/admin/margins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name, originType: f.originType || null, markupPct: f.markupPct }),
    });
    setBusy(false);
    setF({ name: "", originType: "", markupPct: 20 });
    router.refresh();
  }
  async function remove(id: string) {
    await fetch(`/api/admin/margins?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {rules.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No margin rules. The default markup of 20% applies.</p>}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white p-4">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="mt-1 flex gap-2">
                <Badge tone={r.originType === "IMPORTED" ? "blue" : r.originType === "DOMESTIC" ? "green" : "gray"}>
                  {r.originType ?? "Any origin"}
                </Badge>
                <Badge tone="purple">{r.markupPct}% markup</Badge>
              </div>
            </div>
            <button onClick={() => remove(r.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <Card>
        <CardContent>
          <h3 className="mb-3 font-semibold">Add rule</h3>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Imported premium" /></div>
            <div><Label>Origin</Label>
              <Select value={f.originType} onChange={(e) => setF({ ...f, originType: e.target.value })}>
                <option value="">Any</option><option value="DOMESTIC">Domestic</option><option value="IMPORTED">Imported</option>
              </Select>
            </div>
            <div><Label>Markup %</Label><Input type="number" value={f.markupPct} onChange={(e) => setF({ ...f, markupPct: +e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add rule</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
