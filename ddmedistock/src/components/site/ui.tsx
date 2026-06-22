import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-2)]/25 bg-[var(--brand-blue-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-[var(--ink-soft)]">{intro}</p>}
    </div>
  );
}

type CTAProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "green" | "ghost-light";
  className?: string;
};

export function CTA({ href, children, variant = "primary", className = "" }: CTAProps) {
  const styles: Record<NonNullable<CTAProps["variant"]>, string> = {
    primary:
      "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-2)]",
    secondary:
      "border border-[var(--line)] bg-white text-[var(--brand)] hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]",
    green: "bg-[var(--brand-green)] text-white shadow-sm hover:brightness-110",
    "ghost-light":
      "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/** The three primary calls-to-action used across the site. */
export function CTARow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <CTA href="/contact" variant="primary">
        Request a Quote <ArrowRight size={16} />
      </CTA>
      <CTA href="/exports" variant="secondary">
        Export Enquiry
      </CTA>
      <CTA href="/contact?type=vendor" variant="secondary">
        Become a Vendor / Partner
      </CTA>
    </div>
  );
}
