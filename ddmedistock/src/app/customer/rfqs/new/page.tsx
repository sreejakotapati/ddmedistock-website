"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const SAMPLE = `1. Disposable Syringe 5ml sterile - 5000 nos
2. Hypodermic Needle 22G - 3000 nos
3. Surgical Gloves Latex Medium sterile - 200 box
4. IV Cannula 18G - 1500 pcs
5. Examination Gloves Nitrile Large - 150 box
6. 3-way Stopcock - 800 nos`;

export default function NewRfqPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file && !rawText.trim()) {
      setError("Upload a file or paste your requirements.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("title", title || "Procurement RFQ");
    fd.append("rawText", rawText);
    if (file) fd.append("file", file);

    const res = await fetch("/api/rfqs", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Upload failed");
    router.push(`/customer/rfqs/${data.id}`);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Upload RFQ"
        description="Upload a requirement sheet or paste line items. Our AI extracts products, specs and quantities, then matches them across vendors."
      />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <Label>RFQ title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Consumables Requirement" />
              </div>

              <div>
                <Label>Upload file (PDF, Excel, CSV, image)</Label>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDrag(false);
                    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    drag ? "border-[var(--primary)] bg-sky-50" : "border-[var(--border)] bg-[var(--muted)]/40"
                  }`}
                >
                  <UploadCloud className="mb-2 text-[var(--primary)]" />
                  {file ? (
                    <span className="flex items-center gap-2 text-sm font-medium"><FileText size={16} /> {file.name}</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium">Drag &amp; drop or click to browse</span>
                      <span className="mt-1 text-xs text-[var(--muted-foreground)]">CSV / Excel parsed automatically · PDF &amp; images: paste text below</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls,.txt,image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Or paste requirement text</Label>
                  <button type="button" className="text-xs font-medium text-[var(--primary)]" onClick={() => setRawText(SAMPLE)}>
                    Use sample
                  </button>
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[180px] font-mono text-xs"
                  placeholder={"One product per line, e.g.\nDisposable Syringe 5ml sterile - 5000 nos"}
                />
              </div>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (<><Loader2 className="animate-spin" size={16} /> Processing with AI…</>) : "Submit RFQ for AI matching"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <h3 className="font-semibold">What happens next?</h3>
              <ol className="mt-3 space-y-3 text-sm text-[var(--muted-foreground)]">
                {[
                  "AI extracts line items, quantities & specifications",
                  "Hybrid engine matches each item to catalog products",
                  "Status moves to Matching Completed",
                  "Our procurement admin reviews & prepares your quotation",
                  "You're notified when the final quotation is ready",
                ].map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-bold text-white">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  );
}
