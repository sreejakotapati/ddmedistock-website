import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/site";
import { Container, Eyebrow, CTA } from "@/components/site/ui";
import { CategoryIcon } from "@/components/site/category-icon";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse DD Medistock's medical & dental supply categories — surgical, dental, laboratory, medical equipment, respiratory, urology, dermatology and pharmaceuticals. Enquire for a quote.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--brand-blue-soft)]">
        <Container className="py-16">
          <Eyebrow>What we supply</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
            Our product portfolio
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            A comprehensive range across eight categories for hospitals, clinics, laboratories and
            institutional buyers. We don&apos;t publish prices online — tell us what you need and we&apos;ll
            send a tailored quotation.
          </p>
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-[var(--brand-2)]/25 bg-white px-4 py-3 text-sm text-[var(--ink-soft)]">
            <Info size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            This is a request-for-quote catalogue. Use <span className="font-semibold text-[var(--brand)]">&nbsp;Enquire&nbsp;</span> on any
            category to send your requirement.
          </div>
        </Container>
      </section>

      {/* Quick category nav */}
      <section className="sticky top-[61px] z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur">
        <Container className="flex gap-2 overflow-x-auto py-3">
          {PRODUCT_CATEGORIES.map((c) => (
            <a
              key={c.slug}
              href={`#${c.slug}`}
              className="whitespace-nowrap rounded-full border border-[var(--line)] px-3.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--brand-2)] hover:text-[var(--brand)]"
            >
              {c.name}
            </a>
          ))}
        </Container>
      </section>

      {/* Category sections */}
      <section className="py-14">
        <Container className="space-y-8">
          {PRODUCT_CATEGORIES.map((c, i) => {
            const flip = i % 2 === 1;
            return (
              <Reveal key={c.slug}>
                <div
                  id={c.slug}
                  className="lift group scroll-mt-32 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"
                >
                  <div className="grid md:grid-cols-2">
                    {/* Image */}
                    <div className={`img-frame relative h-56 md:h-full md:min-h-[18rem] ${flip ? "md:order-2" : ""}`}>
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        className="img-zoom h-full w-full object-cover"
                      />
                      <span className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-xl bg-white/95 text-[var(--brand)] shadow-sm backdrop-blur">
                        <CategoryIcon slug={c.slug} size={22} />
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex flex-col justify-center p-7 sm:p-9">
                      <span className="text-xs font-semibold text-[var(--brand-2)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[var(--ink)]">{c.name}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{c.blurb}</p>
                      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                        {c.items.map((it) => (
                          <li key={it} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink)]">
                            <CheckCircle2 size={14} className="text-[var(--brand-green)]" /> {it}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-7">
                        <CTA
                          href={`/contact?category=${encodeURIComponent(c.name)}`}
                          variant="primary"
                          className="w-full sm:w-auto"
                        >
                          Enquire <ArrowRight size={16} />
                        </CTA>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#f4f7fb] py-16">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-2xl font-display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Don&apos;t see exactly what you need?
          </h2>
          <p className="max-w-xl text-[var(--ink-soft)]">
            Our vendor network covers a wide range beyond this list. Send your requirement and we&apos;ll
            source it for you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <CTA href="/contact" variant="primary">
              Request a Quote <ArrowRight size={16} />
            </CTA>
            <Link
              href="/contact?type=vendor"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--brand)] hover:border-[var(--brand-2)]"
            >
              Become a Vendor / Partner
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
