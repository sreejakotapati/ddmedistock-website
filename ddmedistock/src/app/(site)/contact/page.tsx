import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, ExternalLink, PhoneCall } from "lucide-react";
import { COMPANY, CATEGORY_OPTIONS, whatsappLink } from "@/lib/site";
import { Container, Eyebrow } from "@/components/site/ui";
import { ContactForms } from "@/components/site/contact-forms";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";
import type { EnquiryKind } from "@/components/site/enquiry-form";

export const metadata: Metadata = {
  title: "Contact & Request a Quote",
  description:
    "Request a quote from DD Medistock — wholesale medical & dental supply in Arumbakkam, Chennai 600106. Submit your requirement and receive a quotation by email.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const initial: EnquiryKind =
    sp.type === "vendor" ? "vendor" : sp.type === "export" ? "export" : "quote";
  const defaultCategory =
    sp.category && CATEGORY_OPTIONS.includes(sp.category) ? sp.category : "";

  return (
    <>
      <section className="border-b border-[var(--line)] bg-[var(--brand-blue-soft)]">
        <Container className="py-14">
          <Eyebrow>Get in touch</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
            Contact &amp; Request a Quote
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            Tell us your requirement and we&apos;ll send a quotation by email. No prices, payment or
            checkout — just a fast, accountable response from our team.
          </p>
        </Container>
      </section>

      <section className="py-14">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Left: details + map */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">Reach us</h2>
              <ul className="mt-5 space-y-5 text-sm">
                <li className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                    <MapPin size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">Address</p>
                    <p className="text-[var(--ink-soft)]">{COMPANY.addressLines.join(", ")}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                    <Phone size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">Phone &amp; WhatsApp</p>
                    <a href={COMPANY.phoneHref} className="text-[var(--ink-soft)] hover:text-[var(--brand)]">
                      {COMPANY.phone}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={COMPANY.phoneHref}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:border-[var(--brand-2)]"
                      >
                        <PhoneCall size={13} /> Call Now
                      </a>
                      <a
                        href={whatsappLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                      >
                        <WhatsappIcon size={13} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                    <Mail size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">Email</p>
                    <a href={`mailto:${COMPANY.email}`} className="text-[var(--ink-soft)] hover:text-[var(--brand)]">
                      {COMPANY.email}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand)]">
                    <Clock size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">Business hours</p>
                    <p className="text-[var(--ink-soft)]">Mon–Sat · 9:30 AM – 6:30 PM IST</p>
                  </div>
                </li>
              </ul>
              <a
                href={COMPANY.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-2)]"
              >
                Open in Google Maps <ExternalLink size={14} />
              </a>
            </div>

            {/* Map link card — opens the DD Medistock listing in Google Maps */}
            <a
              href={COMPANY.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm transition hover:border-[var(--brand-2)] hover:shadow-md"
              aria-label="Open DD Medistock location in Google Maps"
            >
              {/* Subtle map-style backdrop */}
              <div className="relative h-64 bg-[var(--brand-blue-soft)]">
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 42%, rgba(46,117,182,0.18), transparent 60%)",
                  }}
                />
                {/* Pin */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--brand)] text-white shadow-lg ring-8 ring-white/70 transition group-hover:scale-105">
                    <MapPin size={26} />
                  </span>
                  <p className="mt-3 font-display text-base font-bold text-[var(--ink)]">
                    {COMPANY.name}
                  </p>
                  <p className="text-sm text-[var(--ink-soft)]">{COMPANY.addressLines.join(", ")}</p>
                </div>
                {/* Hover CTA */}
                <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--brand)] shadow-sm">
                  View on Google Maps <ExternalLink size={14} />
                </span>
              </div>
            </a>
          </div>

          {/* Right: forms */}
          <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
            <ContactForms initial={initial} defaultCategory={defaultCategory} />
          </div>
        </Container>
      </section>
    </>
  );
}
