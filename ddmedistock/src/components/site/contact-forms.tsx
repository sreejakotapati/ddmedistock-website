"use client";

import { useState } from "react";
import { FileText, Globe, Handshake } from "lucide-react";
import { EnquiryForm, type EnquiryKind } from "./enquiry-form";

const TABS: { kind: EnquiryKind; label: string; icon: typeof FileText }[] = [
  { kind: "quote", label: "Request a Quote", icon: FileText },
  { kind: "export", label: "Export Enquiry", icon: Globe },
  { kind: "vendor", label: "Vendor / Partner", icon: Handshake },
];

export function ContactForms({
  initial = "quote",
  defaultCategory = "",
}: {
  initial?: EnquiryKind;
  defaultCategory?: string;
}) {
  const [kind, setKind] = useState<EnquiryKind>(initial);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.kind === kind;
          return (
            <button
              key={t.kind}
              type="button"
              onClick={() => setKind(t.kind)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "border border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--brand-2)] hover:text-[var(--brand)]"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* key forces a fresh form (and resets success state) when switching tabs */}
      <EnquiryForm key={kind} kind={kind} defaultCategory={kind === "vendor" ? "" : defaultCategory} />
    </div>
  );
}
