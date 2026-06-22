import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { COMPANY, NAV_LINKS, TRUST_BADGES } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[#0e1c33] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Licensed wholesale distributor and exporter of medical &amp; dental
            supplies, serving healthcare institutions across India and beyond.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {TRUST_BADGES.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Explore
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-slate-400 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Enquiries
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/contact" className="text-slate-400 hover:text-white">Request a Quote</Link></li>
            <li><Link href="/exports" className="text-slate-400 hover:text-white">Export Enquiry</Link></li>
            <li><Link href="/contact?type=vendor" className="text-slate-400 hover:text-white">Become a Vendor / Partner</Link></li>
            <li><Link href="/compliance" className="text-slate-400 hover:text-white">Compliance &amp; Licences</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex gap-2.5">
              <MapPin size={17} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
              <span>{COMPANY.addressLines.join(", ")}</span>
            </li>
            <li className="flex gap-2.5">
              <Phone size={17} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
              <a href={COMPANY.phoneHref} className="hover:text-white">{COMPANY.phone}</a>
            </li>
            <li className="flex gap-2.5">
              <Mail size={17} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-white">{COMPANY.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
          <p>Wholesale &amp; institutional supply only · Not a consumer pharmacy</p>
        </div>
      </div>
    </footer>
  );
}
