"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Save, Send, Loader2, Lock, ShieldAlert, TrendingUp,
  FileLock2, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

type Item = {
  id: string; description: string; quantity: number; unit: string;
  unitCost: number; marginPct: number; unitPrice: number; taxPct: number;
  leadTimeDays: number; originType: string; vendorName: string | null;
  internalNote: string; productId: string | null;
};
type Quotation = {
  id: string; number: string; status: string; currency: string;
  customerNotes: string; internalNotes: string; taxPct: number;
  publishedAt: string | null; rfqReference: string; rfqId: string;
  organizationName: string; items: Item[];
};

const round = (n: number) => Math.round(n * 100) / 100;

export function QuotationEditor({ quotation }: { quotation: Quotation }) {
  const router = useRouter();
  const published = quotation.status === "PUBLISHED";
  const [items, setItems] = useState<Item[]>(quotation.items);
  const [customerNotes, setCustomerNotes] = useState(quotation.customerNotes);
  const [internalNotes, setInternalNotes] = useState(quotation.internalNotes);
  const taxPct = quotation.taxPct;
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState("");

  function update(id: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        // Margin engine: keep cost / margin / price consistent.
        if (patch.unitCost !== undefined || patch.marginPct !== undefined) {
          next.unitPrice = round(next.unitCost * (1 + next.marginPct / 100));
        } else if (patch.unitPrice !== undefined && next.unitCost > 0) {
          next.marginPct = round((next.unitPrice / next.unitCost - 1) * 100);
        }
        return next;
      }),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`, description: "", quantity: 1, unit: "Unit",
        unitCost: 0, marginPct: 20, unitPrice: 0, taxPct, leadTimeDays: 7,
        originType: "DOMESTIC", vendorName: null, internalNote: "", productId: null,
      },
    ]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const totals = useMemo(() => {
    let revenue = 0, cost = 0, tax = 0;
    for (const it of items) {
      const line = it.quantity * it.unitPrice;
      revenue += line;
      cost += it.quantity * it.unitCost;
      tax += (line * it.taxPct) / 100;
    }
    const profit = revenue - cost;
    return {
      revenue: round(revenue), cost: round(cost), profit: round(profit), tax: round(tax),
      grand: round(revenue + tax),
      marginPct: revenue > 0 ? round((profit / revenue) * 100) : 0,
    };
  }, [items]);

  async function save(publishAfter = false) {
    setMsg("");
    if (publishAfter) setPublishing(true);
    else setSaving(true);
    const res = await fetch(`/api/admin/quotations/${quotation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerNotes, internalNotes, taxPct, items }),
    });
    if (!res.ok) {
      const d = await res.json();
      setSaving(false); setPublishing(false);
      setMsg(d.error || "Save failed");
      toast.error(d.error || "Save failed");
      return;
    }
    if (publishAfter) {
      const pub = await fetch(`/api/admin/quotations/${quotation.id}/publish`, { method: "POST" });
      setPublishing(false);
      if (pub.ok) { router.refresh(); setMsg("Published — customer has been notified."); toast.success("Quotation published — customer notified"); }
      else { setMsg("Publish failed"); toast.error("Publish failed"); }
    } else {
      setSaving(false);
      setMsg("Draft saved.");
      toast.success("Draft saved");
      router.refresh();
    }
  }

  return (
    <>
      <Link href={`/admin/rfqs/${quotation.rfqId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to RFQ
      </Link>
      <PageHeader
        title={`Quotation ${quotation.number}`}
        description={`${quotation.organizationName} · RFQ ${quotation.rfqReference}`}
        action={
          <div className="flex gap-2">
            <a
              href={`/api/admin/quotations/${quotation.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              title="Confidential — includes cost, margin & vendor"
            >
              <FileLock2 size={16} /> Internal PDF
            </a>
            {published ? (
              <a
                href={`/api/customer/quotations/${quotation.id}/pdf`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--muted)]"
              >
                <FileText size={16} /> Customer PDF
              </a>
            ) : (
              <>
                <Button variant="outline" onClick={() => save(false)} disabled={saving || publishing}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save draft
                </Button>
                <Button variant="success" onClick={() => save(true)} disabled={saving || publishing}>
                  {publishing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Approve &amp; publish
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <ShieldAlert size={16} /> Cost, margin, supplier and internal notes are <strong>admin-only</strong> and never shown to the customer.
      </div>
      {msg && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">{msg}</div>}

      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Line items</CardTitle>
          {!published && <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} /> Add item</Button>}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2">Product / description</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 bg-amber-50">Cost ₹</th>
                <th className="px-3 py-2 bg-amber-50">Margin %</th>
                <th className="px-3 py-2">Price ₹</th>
                <th className="px-3 py-2">Tax %</th>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2 bg-amber-50">Vendor</th>
                <th className="px-3 py-2 text-right">Line total</th>
                {!published && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="px-3 py-2 min-w-[220px]">
                    <Input value={it.description} disabled={published} onChange={(e) => update(it.id, { description: e.target.value })} className="h-8" />
                    {!published && (
                      <Input value={it.internalNote} onChange={(e) => update(it.id, { internalNote: e.target.value })} placeholder="internal note (AI match info)" className="mt-1 h-7 text-xs text-[var(--muted-foreground)]" />
                    )}
                  </td>
                  <td className="px-3 py-2"><Input type="number" value={it.quantity} disabled={published} onChange={(e) => update(it.id, { quantity: +e.target.value })} className="h-8 w-16" /></td>
                  <td className="px-3 py-2"><Input value={it.unit} disabled={published} onChange={(e) => update(it.id, { unit: e.target.value })} className="h-8 w-16" /></td>
                  <td className="px-3 py-2 bg-amber-50/40"><Input type="number" value={it.unitCost} disabled={published} onChange={(e) => update(it.id, { unitCost: +e.target.value })} className="h-8 w-24" /></td>
                  <td className="px-3 py-2 bg-amber-50/40"><Input type="number" value={it.marginPct} disabled={published} onChange={(e) => update(it.id, { marginPct: +e.target.value })} className="h-8 w-20" /></td>
                  <td className="px-3 py-2"><Input type="number" value={it.unitPrice} disabled={published} onChange={(e) => update(it.id, { unitPrice: +e.target.value })} className="h-8 w-24 font-medium" /></td>
                  <td className="px-3 py-2"><Input type="number" value={it.taxPct} disabled={published} onChange={(e) => update(it.id, { taxPct: +e.target.value })} className="h-8 w-16" /></td>
                  <td className="px-3 py-2"><Input type="number" value={it.leadTimeDays} disabled={published} onChange={(e) => update(it.id, { leadTimeDays: +e.target.value })} className="h-8 w-16" /></td>
                  <td className="px-3 py-2">
                    <Select value={it.originType} disabled={published} onChange={(e) => update(it.id, { originType: e.target.value })} className="h-8 w-28">
                      <option value="DOMESTIC">Domestic</option>
                      <option value="IMPORTED">Imported</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2 bg-amber-50/40"><Input value={it.vendorName ?? ""} disabled={published} onChange={(e) => update(it.id, { vendorName: e.target.value })} className="h-8 w-28" /></td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(it.quantity * it.unitPrice, quotation.currency)}</td>
                  {!published && <td className="px-3 py-2"><button onClick={() => removeItem(it.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button></td>}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No items. Add one to begin.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer notes <span className="text-xs font-normal text-[var(--muted-foreground)]">(visible to customer)</span></Label>
                <Textarea value={customerNotes} disabled={published} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Delivery terms, validity, payment terms…" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Lock size={13} /> Internal notes <span className="text-xs font-normal text-[var(--muted-foreground)]">(admin-only)</span></Label>
                <Textarea value={internalNotes} disabled={published} onChange={(e) => setInternalNotes(e.target.value)} className="bg-amber-50/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock size={15} /> Internal P&amp;L</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Revenue" value={formatCurrency(totals.revenue)} />
              <Row label="Cost of goods" value={formatCurrency(totals.cost)} />
              <Row label="Profit" value={formatCurrency(totals.profit)} strong />
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                <span className="text-[var(--muted-foreground)]">Blended margin</span>
                <Badge tone={totals.marginPct >= 15 ? "green" : "amber"}><TrendingUp size={12} /> {totals.marginPct}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer total</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.revenue)} />
              <Row label={`Tax`} value={formatCurrency(totals.tax)} />
              <Row label="Grand total" value={formatCurrency(totals.grand)} strong />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-bold" : ""}`}>{value}</span>
    </div>
  );
}
