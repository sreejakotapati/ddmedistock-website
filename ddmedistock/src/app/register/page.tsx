"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HOME: Record<string, string> = { CUSTOMER: "/customer", VENDOR: "/vendor" };

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");
  const [form, setForm] = useState({
    name: "", email: "", password: "", organizationName: "",
    organizationType: "HOSPITAL", originType: "DOMESTIC",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Registration failed");
    router.push(HOME[data.role] || "/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-bold text-xl">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary)] text-white">
            <Stethoscope size={18} />
          </span>
          DDMediStock
        </Link>
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Create your account</h1>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[var(--muted)] p-1">
            {(["CUSTOMER", "VENDOR"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  role === r ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--muted-foreground)]",
                )}
              >
                {r === "CUSTOMER" ? "Healthcare Org" : "Vendor / Supplier"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label>Full name</Label>
              <Input required value={form.name} onChange={set("name")} placeholder="Dr. Asha Verma" />
            </div>
            <div>
              <Label>{role === "VENDOR" ? "Company name" : "Organization name"}</Label>
              <Input required value={form.organizationName} onChange={set("organizationName")}
                placeholder={role === "VENDOR" ? "MedSupply Pvt Ltd" : "City General Hospital"} />
            </div>
            {role === "CUSTOMER" ? (
              <div>
                <Label>Organization type</Label>
                <Select value={form.organizationType} onChange={set("organizationType")}>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Laboratory</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Origin</Label>
                <Select value={form.originType} onChange={set("originType")}>
                  <option value="DOMESTIC">Domestic (Made in India)</option>
                  <option value="IMPORTED">Imported</option>
                </Select>
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={set("email")} placeholder="you@org.in" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="At least 6 characters" />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--primary)]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
