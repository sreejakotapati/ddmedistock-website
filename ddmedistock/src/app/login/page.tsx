"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const HOME: Record<string, string> = {
  CUSTOMER: "/customer", VENDOR: "/vendor",
  ADMIN: "/admin", PROCUREMENT_MANAGER: "/admin", SUPER_ADMIN: "/admin",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Login failed");
    router.push(params.get("next") || HOME[data.role] || "/");
    router.refresh();
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("password123");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-bold text-xl">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary)] text-white">
            <Stethoscope size={18} />
          </span>
          DDMediStock
        </Link>
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Access your procurement portal</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            New here?{" "}
            <Link href="/register" className="font-medium text-[var(--primary)]">Create an account</Link>
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-white/60 p-3 text-xs">
          <p className="mb-2 font-medium text-[var(--muted-foreground)]">Demo accounts (password: password123)</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => quickFill("superadmin@ddmedistock.com")} className="rounded border px-2 py-1 hover:bg-[var(--muted)]">Super Admin</button>
            <button onClick={() => quickFill("admin@ddmedistock.com")} className="rounded border px-2 py-1 hover:bg-[var(--muted)]">Admin</button>
            <button onClick={() => quickFill("manager@ddmedistock.com")} className="rounded border px-2 py-1 hover:bg-[var(--muted)]">Manager</button>
            <button onClick={() => quickFill("procurement@cityhospital.in")} className="rounded border px-2 py-1 hover:bg-[var(--muted)]">Customer</button>
            <button onClick={() => quickFill("sales@medsupply.in")} className="rounded border px-2 py-1 hover:bg-[var(--muted)]">Vendor</button>
          </div>
        </div>
      </div>
    </div>
  );
}
