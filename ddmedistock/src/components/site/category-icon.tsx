import {
  Syringe, Stethoscope, FlaskConical, Activity, Wind, Bean, HeartPulse, Pill,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  surgical: Syringe,
  dental: Stethoscope,
  laboratory: FlaskConical,
  "medical-equipment": Activity,
  respiratory: Wind,
  urology: Bean,
  dermatology: HeartPulse,
  pharmaceutical: Pill,
};

export function CategoryIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  const Icon = MAP[slug] ?? Activity;
  return <Icon size={size} strokeWidth={2} />;
}
