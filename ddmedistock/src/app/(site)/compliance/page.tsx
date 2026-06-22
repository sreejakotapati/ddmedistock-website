import type { Metadata } from "next";
import { ShieldCheck, FileCheck, Lock, BadgeCheck } from "lucide-react";
import { COMPLIANCE_ITEMS } from "@/lib/site";
import { Container, SectionHeading, Eyebrow, CTARow } from "@/components/site/ui";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Compliance & Certifications",
  description:
    "DD Medistock operates under a wholesale drug licence, GST registration, IEC (Import Export Code) and Udyam (MSME) registration — the credentials healthcare buyers rely on.",
};

export default function CompliancePage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--brand-blue-soft)]">
        <Container className="py-16">
          <Eyebrow>Trust &amp; compliance</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
            Compliance &amp; Certifications
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            Healthcare procurement runs on trust. DD Medistock maintains the licences and
            registrations expected of a wholesale medical distributor and exporter, so institutional
            buyers can purchase with confidence.
          </p>
        </Container>
      </section>

      {/* Compliance cards */}
      <section className="py-16">
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {COMPLIANCE_ITEMS.map((c, i) => (
              <Reveal key={c.label} delay={(i % 2) * 90}>
              <div
                className="lift h-full rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-green-soft)] text-[var(--brand-green)]">
                    <BadgeCheck size={22} />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-green-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-green)]">
                    <ShieldCheck size={12} /> Verified
                  </span>
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">{c.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{c.description}</p>
                <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] bg-[#f7f9fc] px-3.5 py-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
                    Registration
                  </span>
                  <p className="font-mono text-sm text-[var(--ink)]">{c.number}</p>
                </div>
              </div>
              </Reveal>
            ))}
          </div>

          {/* Editor note */}
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--brand-2)]/25 bg-[var(--brand-blue-soft)] px-5 py-4">
            <Lock size={18} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--ink)]">Owner note:</span> registration numbers
              above are placeholders. Publish the exact details you wish to display publicly by editing
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">src/lib/site.ts</code>.
              Full certificates can be shared with buyers on request.
            </p>
          </div>
        </Container>
      </section>

      {/* Assurance strip */}
      <section className="bg-[#f4f7fb] py-16">
        <Container>
          <SectionHeading center eyebrow="Why it matters" title="Procurement assurance, end to end" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: FileCheck, title: "Licensed supply", body: "Products are distributed against valid wholesale drug licensing and regulatory requirements." },
              { icon: ShieldCheck, title: "Traceable sourcing", body: "A vetted vendor network supports traceability and quality across the supply chain." },
              { icon: BadgeCheck, title: "Documentation on request", body: "Compliance documents and certificates are available to institutional and export buyers." },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <div className="lift h-full rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                    <c.icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <CTARow className="mt-12 justify-center" />
        </Container>
      </section>
    </>
  );
}
