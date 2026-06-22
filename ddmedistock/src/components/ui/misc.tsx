import { cn } from "@/lib/utils";

/** Confidence/match score bar (0–100). */
export function ScoreBar({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right">{score}%</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
        {icon && <span className="text-[var(--primary)]">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/50 p-10 text-center">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {hint && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
