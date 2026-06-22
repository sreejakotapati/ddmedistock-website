"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VendorActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    await fetch(`/api/admin/vendors/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && <Button size="sm" variant="success" disabled={busy} onClick={() => setStatus("APPROVED")}>Approve</Button>}
      {status !== "SUSPENDED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("SUSPENDED")}>Suspend</Button>}
    </div>
  );
}
