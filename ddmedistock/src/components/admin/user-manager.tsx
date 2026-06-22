"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";

type StaffUser = { id: string; name: string; email: string; role: string };
const STAFF = ["ADMIN", "PROCUREMENT_MANAGER", "SUPER_ADMIN"];

export function UserManager({ users, selfId }: { users: StaffUser[]; selfId: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { toast.success("Staff user created"); setF({ name: "", email: "", password: "", role: "ADMIN" }); router.refresh(); }
    else toast.error(data.error || "Failed");
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }),
    });
    if (res.ok) { toast.success("Role updated"); router.refresh(); }
    else toast.error("Failed to update role");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white p-4">
            <div>
              <div className="font-medium">{u.name} {u.id === selfId && <span className="text-xs text-[var(--muted-foreground)]">(you)</span>}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{u.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="purple">{ROLE_LABELS[u.role]}</Badge>
              <Select value={u.role} disabled={u.id === selfId} onChange={(e) => changeRole(u.id, e.target.value)} className="h-9 w-44">
                {STAFF.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardContent>
          <h3 className="mb-3 font-semibold">Add staff user</h3>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <div><Label>Role</Label>
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                {STAFF.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Create user</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
