import type { Metadata } from "next";
import { ShieldCheck, Boxes, Truck, Heart, Target, Eye, CheckCircle2 } from "lucide-react";
import { Container, SectionHeading, Eyebrow, CTARow } from "@/components/site/ui";
import { Reveal } from "@/components/site/reveal";
import { Counter } from "@/components/site/counter";
import { STATS, IMAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "DD Medistock is a women-led wholesale medical & dental supply distributor in Chennai, built on proper drug licensing, a vetted vendor network and reliable fulfilment.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--brand-blue-soft)]">
        <Container className="py-16">
          <Eyebrow>About DD Medistock</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
            A women-led medical supply distributor
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            DD Medistock is a licensed wholesale distributor and exporter of medical and dental
            supplies based in Arumbakkam, Chennai. We supply hospitals, clinics, diagnostic
            laboratories and institutional buyers — built on proper drug licensing, a vetted vendor
            network and dependable fulfilment.
          </p>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-12">
        <Container className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-6 text-center shadow-sm">
                <p className="font-display text-4xl font-extrabold text-[var(--brand)]">
                  <Counter value={s.value} placeholder={s.placeholder} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </Container>
        <Container>
          <p className="mt-3 text-center text-xs text-[var(--ink-soft)]">
            Figures shown as placeholders — to be confirmed by the company before publishing.
          </p>
        </Container>
      </section>

      {/* Story */}
      <section className="py-12">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="Procurement you can rely on" />
            <div className="mt-6 space-y-4 text-[var(--ink-soft)] leading-relaxed">
              <p>
                Healthcare procurement demands more than availability — it demands traceability,
                compliance and consistency. DD Medistock was founded to give hospitals, clinics and
                laboratories a single, accountable supply partner across a wide medical and dental
                portfolio.
              </p>
              <p>
                As a women-led enterprise, we operate with care and rigour: every product is sourced
                through a vetted vendor network, and every supply is backed by the licences and
                registrations that healthcare buyers expect.
              </p>
              <p>
                We are export-enabled, extending the same standards to international distributors and
                institutions across the Gulf and South Asia.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { icon: Target, title: "Our mission", body: "To make compliant, quality medical and dental supplies dependably accessible to every healthcare institution we serve." },
              { icon: Eye, title: "Our vision", body: "To be a trusted distribution and export partner known for licensing, transparency and reliable fulfilment." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                  <c.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Distribution image band */}
      <section className="pb-4">
        <Container>
          <Reveal>
            <div className="img-frame group relative overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm">
              <img
                src={IMAGES.distribution}
                alt="DD Medistock medical supply distribution and warehousing"
                loading="lazy"
                className="img-zoom h-64 w-full object-cover sm:h-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1c33]/80 via-[#0e1c33]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 sm:p-8">
                <p className="font-display text-xl font-bold text-white sm:text-2xl">
                  A vetted vendor network, dependable fulfilment
                </p>
                <p className="mt-1 max-w-lg text-sm text-white/85">
                  Sourcing and distribution across multiple Indian cities, with export-ready logistics.
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Pillars */}
      <section className="bg-[#f4f7fb] py-16">
        <Container>
          <Reveal>
            <SectionHeading center eyebrow="What sets us apart" title="Built on three commitments" />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Proper licensing", body: "Wholesale drug licence, GST and export registrations underpin everything we supply." },
              { icon: Boxes, title: "Vetted vendor network", body: "A distribution network across multiple Indian cities, screened for quality and reliability." },
              { icon: Truck, title: "Reliable fulfilment", body: "Institutional supply handled with care — accurate, traceable and export-ready." },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="lift h-full rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-green-soft)] text-[var(--brand-green)]">
                    <p.icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Women-led callout */}
      <section className="py-16">
        <Container>
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-soft)] p-8 sm:flex-row sm:items-center">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--brand-green)] text-white">
              <Heart size={26} />
            </span>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-[var(--ink)]">A women-led enterprise</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">
                DD Medistock is proudly women-led, bringing diligence and a partnership-first approach
                to healthcare supply. We invite hospitals, clinics, laboratories and vendors to work
                with us.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {["Compliance-first", "Quality-focused", "Partnership-driven"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                    <CheckCircle2 size={16} className="text-[var(--brand-green)]" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <CTARow className="mt-10" />
        </Container>
      </section>
    </>
  );
}
