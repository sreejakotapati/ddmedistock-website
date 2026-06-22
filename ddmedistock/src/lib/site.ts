// Public marketing-site content & company data.
//
// Everything an owner is likely to edit lives here: contact details, product
// categories, compliance registrations and trust badges. Values marked
// `placeholder: true` are intentionally blank-ish — fill them with the real
// numbers before going live (the UI shows a subtle "to be updated" hint).

export const COMPANY = {
  name: "DD Medistock",
  tagline: "Reliable Medical & Dental Supply, Sourced and Delivered",
  valueProp:
    "A licensed wholesale distributor and exporter supplying hospitals, clinics, diagnostic labs and institutional buyers across India and the Gulf & South Asian markets.",
  // ── Contact (edit these) ──────────────────────────────────────────────
  addressLines: ["Arumbakkam", "Chennai 600106", "Tamil Nadu, India"],
  phone: "+91 88389 68124",
  phoneHref: "tel:+918838968124",
  email: "ddmedistock@gmail.com",
  // DD Medistock Google Maps business listing (click-through, opens in Maps).
  mapsLink:
    "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwjQ_d3V6piVAxUAAAAAHQAAAAAQBQ..i&pvq=Cg0vZy8xMXloc21ud2IwIhEKC2RkbWVkaXN0b2NrEAIYAw&lqi=ChNkZG1lZGlzdG9jayBjaGVubmFpWhsiE2RkbWVkaXN0b2NrIGNoZW5uYWkqBAgCEACSARthc3NvY2lhdGlvbl9vcl9vcmdhbml6YXRpb24&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=in&sa=X&ftid=0x3a5267006f4b7b23:0x1104b6c3bb0c7a06",
} as const;

// Self-hosted imagery (public/images). Swap these files to rebrand — keep the
// same paths and the site picks them up automatically.
export const IMAGES = {
  hero: "/images/hero-operating-theatre.jpg",
  distribution: "/images/about-distribution.jpg",
  rfqContext: "/images/rfq-context.jpg",
} as const;

// WhatsApp business contact. `number` is digits-only with country code (no +,
// spaces or dashes) as required by wa.me links.
export const WHATSAPP = {
  number: "918838968124",
  display: "+91 88389 68124",
  defaultMessage: "Hello, I would like to know more about your products and services.",
} as const;

/** Build a wa.me deep link with a pre-filled (URL-encoded) message. */
export function whatsappLink(message: string = WHATSAPP.defaultMessage): string {
  return `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(message)}`;
}

export const TRUST_BADGES = [
  "Licensed Wholesaler",
  "GST Registered",
  "Export-Enabled",
  "Women-Led Enterprise",
] as const;

export type ProductCategory = {
  slug: string;
  name: string;
  blurb: string;
  items: string[];
  image: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    slug: "surgical",
    name: "Surgical Consumables & Instruments",
    blurb:
      "Single-use consumables and reusable instruments for operating theatres, wards and procedure rooms — sutures, dressings, gloves, drapes, blades and stainless steel instruments.",
    items: ["Sutures & staplers", "Drapes & gowns", "Examination & surgical gloves", "Stainless instruments", "Wound care & dressings"],
    image: "/images/cat-surgical.jpg",
  },
  {
    slug: "dental",
    name: "Dental Supplies & Equipment",
    blurb:
      "Chairside consumables, restorative materials and clinic equipment for dental practices and dental colleges — from burs and impression materials to chairs and autoclaves.",
    items: ["Restorative materials", "Endodontic & burs", "Impression materials", "Dental chairs & units", "Sterilisation equipment"],
    image: "/images/cat-dental.jpg",
  },
  {
    slug: "laboratory",
    name: "Laboratory & Diagnostic Products",
    blurb:
      "Reagents, rapid-test kits, glassware and analysers for pathology labs and diagnostic centres, with cold-chain handling where required.",
    items: ["Reagents & test kits", "Sample collection", "Glassware & plasticware", "Analysers", "Lab consumables"],
    image: "/images/cat-laboratory.jpg",
  },
  {
    slug: "medical-equipment",
    name: "Medical Equipment",
    blurb:
      "Diagnostic and patient-care equipment for hospitals and clinics — monitoring, imaging accessories, beds and procedural devices, with installation support through our vendor network.",
    items: ["Patient monitors", "Diagnostic devices", "Hospital furniture", "Procedure equipment", "Spares & accessories"],
    image: "/images/cat-medical-equipment.jpg",
  },
  {
    slug: "respiratory",
    name: "Respiratory Care",
    blurb:
      "Oxygen therapy, nebulisation and airway-management products for critical care, wards and home-care programmes.",
    items: ["Oxygen therapy", "Nebulisers", "Masks & circuits", "Suction devices", "Airway management"],
    image: "/images/cat-respiratory.jpg",
  },
  {
    slug: "urology",
    name: "Urology",
    blurb:
      "Catheters, drainage systems and urological consumables for hospitals, nursing homes and long-term care.",
    items: ["Foley & catheters", "Urine drainage bags", "Urological consumables", "Stents & guidewires"],
    image: "/images/cat-urology.jpg",
  },
  {
    slug: "dermatology",
    name: "Dermatology",
    blurb:
      "Dermatological consumables, procedure supplies and skincare products for dermatology clinics and aesthetic practices.",
    items: ["Procedure consumables", "Topical preparations", "Dressings", "Clinic supplies"],
    image: "/images/cat-dermatology.jpg",
  },
  {
    slug: "pharmaceutical",
    name: "Pharmaceutical Products",
    blurb:
      "Pharmaceutical supply against valid licences and prescriptions for institutional buyers — distributed in compliance with applicable drug regulations.",
    items: ["Generic & branded formulations", "Institutional supply", "Cold-chain medicines", "Surgical pharmacy items"],
    image: "/images/cat-pharmaceutical.jpg",
  },
];

export type Compliance = {
  label: string;
  description: string;
  // Registration number — left as a placeholder for the owner to publish.
  number: string;
  placeholder: boolean;
};

export const COMPLIANCE_ITEMS: Compliance[] = [
  {
    label: "Wholesale Drug Licence",
    description:
      "Licensed to wholesale and distribute drugs under the Drugs and Cosmetics Act, issued by the State Drugs Control authority.",
    number: "Licence No. — to be updated",
    placeholder: true,
  },
  {
    label: "GST Registration",
    description:
      "Registered under the Goods and Services Tax for compliant invoicing and inter-state supply.",
    number: "GSTIN — to be updated",
    placeholder: true,
  },
  {
    label: "IEC — Import Export Code",
    description:
      "Import Export Code issued by the DGFT, enabling cross-border supply to international buyers.",
    number: "IEC — to be updated",
    placeholder: true,
  },
  {
    label: "Udyam (MSME) Registration",
    description:
      "Registered as a Micro, Small & Medium Enterprise under the Government of India Udyam scheme.",
    number: "Udyam Reg. No. — to be updated",
    placeholder: true,
  },
  {
    label: "AD Code Registration",
    description:
      "Authorised Dealer (AD) Code registered with our bank and customs port for export remittances and shipping.",
    number: "AD Code — to be updated",
    placeholder: true,
  },
];

export const EXPORT_MARKETS = [
  { country: "United Arab Emirates", short: "UAE" },
  { country: "Saudi Arabia", short: "KSA" },
  { country: "Maldives", short: "MV" },
  { country: "Nepal", short: "NP" },
  { country: "Bangladesh", short: "BD" },
  { country: "Sri Lanka", short: "LK" },
] as const;

// Form category options (shared by RFQ + export forms).
export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((c) => c.name);

// Headline stats. `value` numbers animate as counters; set `value: null` to show
// the `placeholder` string (e.g. "—") for figures the owner hasn't confirmed.
// The first two are derived from the data above; the last two are editable
// placeholders — fill in real numbers, no figures are invented here.
export type Stat = {
  value: number | null;
  placeholder?: string;
  suffix?: string;
  label: string;
};

export const STATS: Stat[] = [
  { value: PRODUCT_CATEGORIES.length, label: "Product categories" },
  { value: EXPORT_MARKETS.length, suffix: "+", label: "Export markets" },
  { value: null, placeholder: "—", label: "Cities served (editable)" },
  { value: null, placeholder: "—", label: "Years in operation (editable)" },
];

// "Why choose us" feature blocks — icon names map to lucide icons in the UI.
export const WHY_CHOOSE = [
  { icon: "ShieldCheck", title: "Reliability", body: "Consistent supply backed by a vetted, multi-city vendor network and dependable lead times." },
  { icon: "BadgeCheck", title: "Compliance", body: "Drug-licensed, GST-registered supply with documentation healthcare buyers can trust." },
  { icon: "Truck", title: "Fast fulfilment", body: "Efficient order handling and logistics, from single clinics to large institutions." },
  { icon: "Globe", title: "Export-ready", body: "IEC & AD Code enabled for compliant supply across the Gulf and South Asia." },
] as const;

// The RFQ buyer journey shown as a process graphic.
export const PROCESS_STEPS = [
  { icon: "Search", title: "Browse", body: "Explore our product capabilities and categories." },
  { icon: "FileText", title: "Request Quote", body: "Submit your requirement and quantities." },
  { icon: "MailCheck", title: "Receive Quote", body: "Get a tailored quotation by email." },
  { icon: "Truck", title: "Delivery", body: "Compliant supply, delivered to your door." },
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/exports", label: "Exports" },
  { href: "/compliance", label: "Compliance" },
  { href: "/contact", label: "Contact" },
] as const;
