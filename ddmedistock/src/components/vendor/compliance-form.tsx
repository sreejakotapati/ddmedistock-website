"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ComplianceForm({ initial }: { initial: { cdscoLicense: string; isoCert: string; importCert: string } }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg("");
    const res = await fetch("/api/vendor/compliance", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    setLoading(false);
    setMsg(res.ok ? "Compliance details saved." : "Save failed");
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>CDSCO License No.</Label><Input value={f.cdscoLicense} onChange={set("cdscoLicense")} placeholder="MD-XXXX-XXXX" /></div>
          <div><Label>ISO Certification No.</Label><Input value={f.isoCert} onChange={set("isoCert")} placeholder="ISO 13485:2016 — cert no." /></div>
          <div><Label>Import Certification No. (if imported)</Label><Input value={f.importCert} onChange={set("importCert")} placeholder="Import license / registration no." /></div>
          <p className="text-xs text-[var(--muted-foreground)]">In production these fields are accompanied by secure document uploads (AWS S3) and admin verification.</p>
          {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save compliance</Button>
        </form>
      </CardContent>
    </Card>
  );
}
