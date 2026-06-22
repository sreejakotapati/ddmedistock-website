import Link from "next/link";
import {
  ArrowRight, ShieldCheck, BadgeCheck, Globe, Heart, CheckCircle2,
  FileCheck, Hospital, ChevronRight, Award, PhoneCall,
} from "lucide-react";
import {
  COMPANY, PRODUCT_CATEGORIES, TRUST_BADGES, IMAGES, STATS, WHY_CHOOSE, PROCESS_STEPS,
  whatsappLink, WHATSAPP,
} from "@/lib/site";
import { Container, SectionHeading, CTA } from "@/components/site/ui";
import { CategoryIcon } from "@/components/site/category-icon";
import { Reveal } from "@/components/site/reveal";
import { Counter } from "@/components/site/counter";
import { HeroImage } from "@/components/site/hero-image";
import { Icon } from "@/components/site/icon";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";

const BADGE_ICONS = [ShieldCheck, BadgeCheck, Globe, Heart];
const TRUST_ROW = [
  { icon: ShieldCheck, label: "Licensed Wholesaler" },
  { icon: FileCheck, label: "GST Registered" },
  { icon: Globe, label: "Export-Enabled (IEC)" },
  { icon: Award, label: "Quality-Focused" },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#0e1c33] text-white">
        <HeroImage src={IMAGES.hero} alt="Modern operating theatre and medical equipment" />
        {/* Dark-blue gradient overlay for white-text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1c33]/95 via-[#1F3864]/85 to-[#2E75B6]/70" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <Container className="relative py-24 sm:py-32">
          <div className="hero-in max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              <Hospital size={14} /> Wholesale · Distribution · Export
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Reliable Medical &amp; Dental Supply, Sourced and Delivered
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
              {COMPANY.valueProp}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CTA href="/contact" variant="green" className="px-7 py-3.5 text-base">
                Request a Quote <ArrowRight size={18} />
              </CTA>
              <CTA href="/products" variant="ghost-light" className="px-7 py-3.5 text-base">
                Browse Products
              </CTA>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {TRUST_BADGES.map((b, i) => {
                const Ico = BADGE_ICONS[i] ?? CheckCircle2;
                return (
                  <span key={b} className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                    <Ico size={18} className="text-[#9fd17a]" /> {b}
                  </span>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* ── Quick contact band (phone + WhatsApp, prominent) ─── */}
      <section className="bg-[var(--brand)] text-white">
        <Container className="flex flex-col items-center justify-between gap-4 py-5 text-center sm:flex-row sm:text-left">
          <p className="font-medium">
            <span className="font-semibold">Talk to our team</span> — fast quotes by call or WhatsApp.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={COMPANY.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:bg-white/90"
            >
              <PhoneCall size={16} /> Call {COMPANY.phone}
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <WhatsappIcon size={17} /> WhatsApp {WHATSAPP.display}
            </a>
          </div>
        </Container>
      </section>

      {/* ── Trust icon row ───────────────────────────────────── */}
      <section className="border-b border-[var(--line)] bg-white">
        <Container className="grid grid-cols-2 gap-4 py-7 sm:grid-cols-4">
          {TRUST_ROW.map((t, i) => (
            <Reveal key={t.label} delay={i * 80}>
              <div className="flex items-center justify-center gap-2.5 text-center">
                <t.icon size={22} strokeWidth={1.75} className="shrink-0 text-[var(--brand-2)]" />
                <span className="text-sm font-semibold text-[var(--ink)]">{t.label}</span>
              </div>
            </Reveal>
          ))}
        </Container>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="bg-[var(--brand-blue-soft)] py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 90}>
                <div className="text-center">
                  <p className="font-display text-4xl font-extrabold text-[var(--brand)] sm:text-5xl">
                    <Counter value={s.value} placeholder={s.placeholder} suffix={s.suffix} />
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--ink-soft)]">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Why choose us ────────────────────────────────────── */}
      <section className="py-20">
        <Container>
          <Reveal>
            <SectionHeading
              center
              eyebrow="Why choose us"
              title="A supply partner healthcare can rely on"
              intro="Procurement built on compliance, traceability and dependable fulfilment — from a single clinic order to institutional and export supply."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHOOSE.map((w, i) => (
              <Reveal key={w.title} delay={i * 90}>
                <div className="lift h-full rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-blue-soft)] text-[var(--brand-2)]">
                    <Icon name={w.icon} size={24} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-[var(--ink)]">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{w.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Product categories (with photos) ─────────────────── */}
      <section className="bg-[#f4f7fb] py-20">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="What we supply"
              title="Product categories"
              intro="A broad medical and dental portfolio for hospitals, clinics, diagnostic labs and institutional buyers. Every enquiry is handled as a request for quote — no online checkout."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_CATEGORIES.map((c, i) => (
              <Reveal key={c.slug} delay={(i % 3) * 90}>
                <Link
                  href={`/products#${c.slug}`}
                  className="group lift flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"
                >
                  <div className="img-frame relative h-44 w-full">
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      className="img-zoom h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-white/95 text-[var(--brand)] shadow-sm backdrop-blur">
                      <CategoryIcon slug={c.slug} size={20} />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-base font-bold text-[var(--ink)]">{c.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">{c.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand)]">
                      Enquire <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── RFQ process graphic ──────────────────────────────── */}
      <section className="py-20">
        <Container>
          <Reveal>
            <SectionHeading
              center
              eyebrow="How it works"
              title="The RFQ journey"
              intro="A simple, transparent path from requirement to delivery — no prices or checkout online, just an accountable quote by email."
            />
          </Reveal>
          <div className="relative mt-14">
            {/* connecting line (desktop) */}
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[var(--brand-2)]/40 to-transparent lg:block" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS_STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 110}>
                  <div className="relative flex flex-col items-center text-center">
                    <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-[var(--brand)] text-white shadow-md ring-8 ring-white">
                      <Icon name={s.icon} size={24} className="text-white" />
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--brand-2)]">
                      Step {i + 1}
                    </span>
                    <h3 className="mt-1 font-display text-lg font-bold text-[var(--ink)]">{s.title}</h3>
                    <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-[var(--ink-soft)]">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal>
            <div className="mt-12 flex justify-center">
              <CTA href="/contact" variant="primary" className="px-7 py-3.5 text-base">
                Request a Quote <ArrowRight size={18} />
              </CTA>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Who we serve ─────────────────────────────────────── */}
      <section className="bg-[#f4f7fb] py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="Who we serve"
              title="Built for healthcare procurement"
              intro="DD Medistock supplies the institutions that keep care running — from large hospitals to single-chair dental clinics."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Hospitals & nursing homes",
                "Dental & medical clinics",
                "Diagnostic laboratories",
                "Institutional & government buyers",
                "International distributors",
                "Healthcare project supply",
              ].map((s) => (
                <li key={s} className="flex items-center gap-2.5 text-sm font-medium text-[var(--ink)]">
                  <CheckCircle2 size={18} className="shrink-0 text-[var(--brand-green)]" /> {s}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="img-frame group overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm">
              <img
                src={IMAGES.distribution}
                alt="Medical supply distribution and warehousing"
                loading="lazy"
                className="img-zoom h-72 w-full object-cover sm:h-80"
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="brand-gradient">
        <Container className="flex flex-col items-center gap-6 py-16 text-center text-white">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Sourcing medical or dental supplies? Let&apos;s get you a quote.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-2xl text-white/85">
              Domestic distribution and export-ready supply for the Gulf and South Asian markets.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="flex flex-wrap justify-center gap-3">
              <CTA href="/contact" variant="green" className="px-7 py-3.5 text-base">
                Request a Quote <ArrowRight size={18} />
              </CTA>
              <CTA href="/exports" variant="ghost-light" className="px-7 py-3.5 text-base">
                Export Enquiry
              </CTA>
              <CTA href="/contact?type=vendor" variant="ghost-light" className="px-7 py-3.5 text-base">
                Become a Vendor / Partner
              </CTA>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
