import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Maps RFQ / quotation statuses to a badge tone.
export const STATUS_TONE: Record<string, keyof typeof tones> = {
  UNDER_REVIEW: "amber",
  MATCHING_COMPLETED: "blue",
  QUOTATION_IN_PROGRESS: "purple",
  QUOTATION_UPLOADED: "green",
  APPROVED: "green",
  REJECTED: "red",
  DRAFT: "gray",
  PENDING_APPROVAL: "amber",
  PUBLISHED: "green",
  PENDING: "amber",
  SUSPENDED: "red",
};
