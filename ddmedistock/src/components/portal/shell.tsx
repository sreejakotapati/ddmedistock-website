"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Stethoscope, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

export function PortalShell({
  nav,
  userName,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== nav[0]?.href && pathname.startsWith(href + "/")) ||
    pathname === href;

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-4 font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)] text-white">
          <Stethoscope size={18} />
        </span>
        <div className="leading-tight">
          <div>DDMediStock</div>
          <div className="text-[11px] font-normal text-[var(--muted-foreground)]">{roleLabel}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sky-50 text-[var(--primary)]"
                : "text-slate-600 hover:bg-[var(--muted)]",
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[var(--border)] p-3">
        <div className="px-2 pb-2 text-sm">
          <div className="font-medium truncate">{userName}</div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[var(--muted)]"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-[var(--border)] bg-white lg:block print:hidden">
        <div className="sticky top-0 h-screen">{SidebarInner}</div>
      </aside>

      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden print:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary)] text-white">
            <Stethoscope size={16} />
          </span>
          DDMediStock
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3" aria-label="Close menu"><X size={18} /></button>
            {SidebarInner}
          </div>
        </div>
      )}

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
