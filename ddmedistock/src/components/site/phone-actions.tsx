"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneCall, ChevronDown } from "lucide-react";
import { COMPANY, whatsappLink, WHATSAPP } from "@/lib/site";
import { WhatsappIcon } from "./whatsapp-icon";

/**
 * Clickable phone number that opens a small menu with two choices:
 * "Call Now" (tel:) and "Send WhatsApp Message" (wa.me, pre-filled).
 * Closes on outside-click / Escape; keyboard accessible.
 *
 * variant: "button" (header pill) | "inline" (large contact display).
 */
export function PhoneActions({ variant = "button" }: { variant?: "button" | "inline" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger =
    variant === "inline" ? (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 font-display text-2xl font-extrabold text-[var(--brand)] transition hover:text-[var(--brand-2)]"
      >
        <Phone size={22} className="text-[var(--brand-2)]" />
        {COMPANY.phone}
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand-2)]"
      >
        <Phone size={16} /> {COMPANY.phone}
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
    );

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-xl"
        >
          <a
            role="menuitem"
            href={COMPANY.phoneHref}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--brand-blue-soft)]"
            onClick={() => setOpen(false)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand)]">
              <PhoneCall size={18} />
            </span>
            <span>
              <span className="block font-semibold">Call Now</span>
              <span className="block text-xs text-[var(--ink-soft)]">{COMPANY.phone}</span>
            </span>
          </a>
          <a
            role="menuitem"
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[#eafbf0]"
            onClick={() => setOpen(false)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eafbf0] text-[#25D366]">
              <WhatsappIcon size={18} />
            </span>
            <span>
              <span className="block font-semibold">Send WhatsApp Message</span>
              <span className="block text-xs text-[var(--ink-soft)]">{WHATSAPP.display}</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
