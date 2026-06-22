"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Plus, ArrowRight, PhoneCall } from "lucide-react";
import { NAV_LINKS, COMPANY, whatsappLink } from "@/lib/site";
import { Logo } from "./logo";
import { PhoneActions } from "./phone-actions";
import { WhatsappIcon } from "./whatsapp-icon";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="DD Medistock home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "text-[var(--brand)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--brand)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="hidden xl:block">
            <PhoneActions />
          </div>
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--brand)]"
          >
            Portal Login
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-2)]"
          >
            Request a Quote <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-md border border-[var(--line)] text-[var(--brand)] lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--line)] bg-white lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-3 text-sm font-medium ${
                  isActive(l.href)
                    ? "bg-[var(--brand-blue-soft)] text-[var(--brand)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--line)] pt-3">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={COMPANY.phoneHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-3 text-sm font-semibold text-[var(--brand)]"
                >
                  <PhoneCall size={16} /> Call
                </a>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-3 text-sm font-semibold text-white"
                >
                  <WhatsappIcon size={16} /> WhatsApp
                </a>
              </div>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--line)] px-3 py-3 text-center text-sm font-medium text-[var(--ink-soft)]"
              >
                Portal Login
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
              >
                <Plus size={16} /> Request a Quote
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
