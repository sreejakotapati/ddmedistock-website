"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, RefreshCw, FileText, Loader2, CheckCircle2, Globe, Home } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/misc";
import { RFQ_STATUS_LABELS, QUOTATION_STATUS_LABELS } from "@/lib/constants";

type Match = {
  id: string; productId: string; score: number; matchType: string; reason: string;
  isSelected: boolean; productName: string; productBrand: string | null;
  originType: string; category: string | null;
};
type LineItem = {
  id: string; lineNo: number; productName: string; brand: string | null;
  quantity: number; unit: string; attributes: Record<string, string>; matches: Match[];
};
type RFQ = {
  id: string; reference: string; title: string; status: string; sourceType: string;
  sourceFileName: string | null; organizationName: string; rawText: string;
  quotations: { id: string; number: string; status: string }[]; lineItems: LineItem[];
};

export function RfqReview({ rfq }: { rfq: RFQ }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  async function selectMatch(lineItemId: string, productId: string) {
    setSelecting(lineItemId + productId);
    await fetch("/api/admin/matches/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineItemId, productId }),
    });
    setSelecting(null);
    router.refresh();
  }

  async function generate() {
    setBusy("generate");
    const res = await fetch(`/api/admin/rfqs/${rfq.id}/generate`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) router.push(`/admin/quotations/${data.quotationId}`);
  }

  async function reprocess() {
    setBusy("reprocess");
    await fetch(`/api/admin/rfqs/${rfq.id}/reprocess`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  const matchedCount = rfq.lineItems.filter((li) => li.matches.length > 0).length;

  return (
    <>
      <Link href="/admin/rfqs" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to RFQs
      </Link>
      <PageHeader
        title={rfq.title}
        description={`${rfq.reference} · ${rfq.organizationName} · Source: ${rfq.sourceType}${rfq.sourceFileName ? ` (${rfq.sourceFileName})` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[rfq.status]}>{RFQ_STATUS_LABELS[rfq.status]}</Badge>
            <Button variant="outline" size="sm" onClick={reprocess} disabled={busy !== null}>
              {busy === "reprocess" ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />} Re-run AI
            </Button>
            <Button size="sm" onClick={generate} disabled={busy !== null}>
              {busy === "generate" ? <Loader2 className="animate-spin" size={15} /> : <Bot size={15} />} Generate draft quotation
            </Button>
          </div>
        }
      />

      {rfq.quotations.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3">
            <FileText size={18} className="text-[var(--primary)]" />
            <span className="text-sm font-medium">Quotations for this RFQ:</span>
            {rfq.quotations.map((q) => (
              <Link key={q.id} href={`/admin/quotations/${q.id}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)]">
                {q.number} <Badge tone={STATUS_TONE[q.status]}>{QUOTATION_STATUS_LABELS[q.status]}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
        <Bot size={16} /> AI extracted <strong>{rfq.lineItems.length}</strong> line items and found matches for <strong>{matchedCount}</strong>. Select the best product per line, then generate the admin-only draft quotation.
      </div>

      <div className="space-y-4">
        {rfq.lineItems.map((li) => (
          <Card key={li.id}>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--muted)] text-xs font-bold">{li.lineNo}</span>
                    <span className="font-semibold">{li.productName}</span>
                    {li.brand && <Badge tone="gray">{li.brand}</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="purple">Qty: {li.quantity} {li.unit}</Badge>
                    {Object.entries(li.attributes).map(([k, v]) => <Badge key={k} tone="blue">{k}: {v}</Badge>)}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {li.matches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    No confident match found. This item will need manual sourcing in the quotation.
                  </div>
                ) : (
                  li.matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMatch(li.id, m.productId)}
                      disabled={selecting !== null}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        m.isSelected ? "border-[var(--primary)] bg-sky-50" : "border-[var(--border)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${m.isSelected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-slate-300"}`}>
                        {m.isSelected && <CheckCircle2 size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.productName}</span>
                          {m.productBrand && <span className="text-xs text-[var(--muted-foreground)]">{m.productBrand}</span>}
                          <Badge tone={m.originType === "DOMESTIC" ? "green" : "blue"}>
                            {m.originType === "DOMESTIC" ? <><Home size={11} /> Domestic</> : <><Globe size={11} /> Imported</>}
                          </Badge>
                          <Badge tone="gray">{m.matchType}</Badge>
                        </div>
                        <div className="truncate text-xs text-[var(--muted-foreground)]">{m.reason}</div>
                      </div>
                      <div className="shrink-0">
                        {selecting === li.id + m.productId ? <Loader2 className="animate-spin" size={16} /> : <ScoreBar score={m.score} />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
