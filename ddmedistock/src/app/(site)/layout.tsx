import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFab } from "@/components/site/whatsapp-fab";
import { StructuredData } from "@/components/site/structured-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ddmedistock.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DD Medistock — Wholesale Medical & Dental Supply, Chennai",
    template: "%s · DD Medistock",
  },
  description:
    "DD Medistock is a licensed wholesale distributor and exporter of medical & dental supplies in Arumbakkam, Chennai — serving hospitals, clinics, labs and institutional buyers. Request a quote.",
  keywords: [
    "medical supplies wholesale", "dental supplies distributor", "surgical consumables",
    "laboratory diagnostic products", "medical equipment supplier Chennai",
    "medical exports India", "hospital supplies", "DD Medistock",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "DD Medistock",
    title: "DD Medistock — Wholesale Medical & Dental Supply",
    description:
      "Licensed wholesale distributor & exporter of medical and dental supplies — Chennai, India. Request a quote by call, WhatsApp or form.",
    url: SITE_URL,
    images: [{ url: "/images/hero-operating-theatre.jpg", width: 1200, height: 630, alt: "DD Medistock" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Brand fonts: Montserrat (display) + Inter (body). Loaded from Google
          Fonts; the marketing CSP (see middleware) permits these origins. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap"
      />
      {/* If JS is unavailable, reveal/hero animations must not hide content. */}
      <noscript>
        <style>{`.site .reveal,.site .hero-in>*{opacity:1!important;transform:none!important;animation:none!important}`}</style>
      </noscript>
      <StructuredData />
      <div className="site flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <WhatsappFab />
      </div>
    </>
  );
}
