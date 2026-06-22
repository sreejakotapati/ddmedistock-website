"use client";

import { useState } from "react";
import { CheckCircle2, Send, Loader2, AlertCircle } from "lucide-react";
import { CATEGORY_OPTIONS, EXPORT_MARKETS } from "@/lib/site";

export type EnquiryKind = "quote" | "export" | "vendor";

const HEADINGS: Record<EnquiryKind, { title: string; cta: string; success: string }> = {
  quote: {
    title: "Request a Quote",
    cta: "Submit Requirement",
    success:
      "Thank you for contacting us. Our team will get back to you shortly.",
  },
  export: {
    title: "Export Enquiry",
    cta: "Send Export Enquiry",
    success:
      "Thank you — your export enquiry has been received. Our export desk will respond by email with next steps.",
  },
  vendor: {
    title: "Become a Vendor / Partner",
    cta: "Submit Partnership Enquiry",
    success:
      "Thank you — your partnership enquiry has been received. We will be in touch about onboarding to our vendor network.",
  },
};

const inputCls =
  "w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand-2)] focus:ring-2 focus:ring-[var(--brand-2)]/20 placeholder:text-slate-400";
const labelCls = "mb-1.5 block text-sm font-medium text-[var(--ink)]";

export function EnquiryForm({
  kind = "quote",
  defaultCategory = "",
}: {
  kind?: EnquiryKind;
  defaultCategory?: string;
}) {
  const cfg = HEADINGS[kind];
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  function validate(p: Record<string, string>): string | null {
    if (!p.name?.trim()) return "Please enter your name.";
    if (!p.organisation?.trim()) return "Please enter your company name.";
    const email = (p.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    const phone = (p.phone || "").trim();
    const digits = phone.replace(/\D/g, "");
    if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
      return "Please enter a valid phone number.";
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries()) as Record<string, string>;

    // Client-side validation (email + phone + required) before hitting the API.
    const invalid = validate(payload);
    if (invalid) {
      setStatus("error");
      setError(invalid);
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-soft)] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-green)] text-white">
          <CheckCircle2 size={28} />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold text-[var(--ink)]">Enquiry received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-soft)]">{cfg.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label className={labelCls} htmlFor="name">Name<span className="text-[var(--brand-green)]">*</span></label>
        <input id="name" name="name" required className={inputCls} placeholder="Your full name" />
      </div>
      <div>
        <label className={labelCls} htmlFor="organisation">Company Name<span className="text-[var(--brand-green)]">*</span></label>
        <input id="organisation" name="organisation" required autoComplete="organization" className={inputCls} placeholder="Hospital / clinic / company" />
      </div>
      <div>
        <label className={labelCls} htmlFor="email">Email Address<span className="text-[var(--brand-green)]">*</span></label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} placeholder="you@company.com" />
      </div>
      <div>
        <label className={labelCls} htmlFor="phone">Phone Number<span className="text-[var(--brand-green)]">*</span></label>
        <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" className={inputCls} placeholder="+91 88389 68124" />
      </div>

      {/* Honeypot — hidden from users; bots that fill it are silently rejected. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {kind === "export" && (
        <div>
          <label className={labelCls} htmlFor="market">Destination market</label>
          <select id="market" name="market" defaultValue="" className={inputCls}>
            <option value="" disabled>Select a country</option>
            {EXPORT_MARKETS.map((m) => (
              <option key={m.short} value={m.country}>{m.country}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      <div className={kind === "export" ? "" : "sm:col-span-1"}>
        <label className={labelCls} htmlFor="category">
          {kind === "vendor"
            ? "Category you supply"
            : kind === "export"
              ? "Product category"
              : "Product / Service Requirement"}
        </label>
        <select id="category" name="category" defaultValue={defaultCategory} className={inputCls}>
          <option value="">Select a category</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="Multiple / Other">Multiple / Other</option>
        </select>
      </div>

      {kind !== "vendor" && (
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="requirement">Quantity / additional details</label>
          <input
            id="requirement"
            name="requirement"
            className={inputCls}
            placeholder="e.g. 500 boxes nitrile gloves (M), monthly supply"
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor="message">
          {kind === "vendor" ? "Tell us about your products & certifications" : "Message"}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={inputCls}
          placeholder={
            kind === "vendor"
              ? "Product range, brands, licences held, locations served…"
              : "Any specifications, brands, delivery location or timeline…"
          }
        />
      </div>

      {status === "error" && (
        <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="sm:col-span-2 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--ink-soft)]">
          We respond to enquiries by email. No prices or payment are collected on this site.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-2)] disabled:opacity-60"
        >
          {status === "sending" ? (
            <><Loader2 size={16} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={16} /> {cfg.cta}</>
          )}
        </button>
      </div>
    </form>
  );
}
