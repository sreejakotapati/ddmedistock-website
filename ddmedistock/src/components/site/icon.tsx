import {
  ShieldCheck, BadgeCheck, Truck, Globe, Search, FileText, MailCheck,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ShieldCheck, BadgeCheck, Truck, Globe, Search, FileText, MailCheck,
};

export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const C = ICONS[name] ?? ShieldCheck;
  return <C size={size} className={className} strokeWidth={1.75} />;
}
