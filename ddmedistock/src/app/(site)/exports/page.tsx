import type { Metadata } from "next";
import { Globe, Ship, FileCheck, BadgeCheck, Boxes, Landmark } from "lucide-react";
import { EXPORT_MARKETS } from "@/lib/site";
import { Container, SectionHeading } from "@/components/site/ui";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Exports",
  description:
    "DD Medistock is an export-enabled supplier (IEC & AD Code) of medical and dental supplies serving the UAE, Saudi Arabia, Maldives, Nepal, Bangladesh and Sri Lanka. Submit an export enquiry.",
};

export default function ExportsPage() {
  return (
    <>
      <section className="relative overflow-hidden brand-gradient text-white">
        <Container className="relative py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Globe size={14} /> Export-Enabled Supplier
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Medical &amp; dental supply for international buyers
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
            DD Medistock holds an Import Export Code (IEC) and AD Code, enabling compliant export of
            medical and dental supplies. We welcome international distributors and institutional
            buyers across the Gulf and South Asia.
          </p>
        </Container>
      </section>

      {/* Markets */}
      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Markets served"
            title="Where we export"
            intro="Reliable supply and documentation support for buyers across these markets — and others on request."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORT_MARKETS.map((m, i) => (
              <Reveal key={m.short} delay={(i % 3) * 90}>
                <div className="lift flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-blue-soft)] font-display text-sm font-extrabold text-[var(--brand)]">
                    {m.short}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{m.country}</p>
                    <p className="text-xs text-[var(--ink-soft)]">Distributor &amp; institutional supply</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Export readiness */}
      <section className="bg-[#f4f7fb] py-16">
        <Container>
          <SectionHeading center eyebrow="Export readiness" title="Set up for cross-border supply" />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileCheck, title: "IEC registered", body: "Import Export Code issued by the DGFT for international trade." },
              { icon: Landmark, title: "AD Code", body: "Authorised Dealer Code registered for export remittances & shipping." },
              { icon: BadgeCheck, title: "Compliant documentation", body: "Invoices, packing lists and certificates prepared per destination requirements." },
              { icon: Boxes, title: "Vendor-backed sourcing", body: "A vetted network lets us consolidate diverse requirements into one shipment." },
            ].map((c, i) => (
              <Reveal key={c.title} delay={(i % 4) * 90}>
                <div className="lift h-full rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-green-soft)] text-[var(--brand-green)]">
                    <c.icon size={20} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-[var(--ink)]">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Export enquiry form */}
      <section className="py-16">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-green)]">
              <Ship size={14} /> International enquiries
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">Export Enquiry</h2>
            <p className="mt-4 leading-relaxed text-[var(--ink-soft)]">
              Tell us your market, product categories and indicative volumes. Our export desk will
              respond by email with availability, documentation and next steps.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[var(--ink-soft)]">
              <li className="flex gap-2"><FileCheck size={16} className="mt-0.5 text-[var(--brand-green)]" /> Distributor &amp; institutional supply agreements</li>
              <li className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 text-[var(--brand-green)]" /> Destination-specific documentation support</li>
              <li className="flex gap-2"><Globe size={16} className="mt-0.5 text-[var(--brand-green)]" /> Gulf &amp; South Asia coverage, others on request</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
            <EnquiryForm kind="export" />
          </div>
        </Container>
      </section>
    </>
  );
}
