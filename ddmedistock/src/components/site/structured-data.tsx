import { COMPANY, WHATSAPP, EXPORT_MARKETS } from "@/lib/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ddmedistock.com";

/** LocalBusiness / Organization JSON-LD for SEO & rich results. */
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: COMPANY.name,
    description: COMPANY.valueProp,
    url: SITE_URL,
    telephone: COMPANY.phone,
    email: COMPANY.email,
    image: `${SITE_URL}/images/hero-operating-theatre.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Arumbakkam",
      addressLocality: "Chennai",
      addressRegion: "Tamil Nadu",
      postalCode: "600106",
      addressCountry: "IN",
    },
    areaServed: ["India", ...EXPORT_MARKETS.map((m) => m.country)],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: `+${WHATSAPP.number}`,
        contactType: "sales",
        availableLanguage: ["en"],
      },
    ],
    sameAs: [] as string[],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD is static, trusted content — safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
