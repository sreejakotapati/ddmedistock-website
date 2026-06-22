import { Cross } from "lucide-react";

/** DD Medistock wordmark + medical cross monogram. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 place-items-center rounded-lg text-white shadow-sm"
        style={{ background: "linear-gradient(135deg,#1F3864,#2E75B6)" }}
      >
        <Cross size={18} strokeWidth={2.5} />
      </span>
      <span className="leading-tight">
        <span
          className={`block font-display text-base font-extrabold tracking-tight ${
            light ? "text-white" : "text-[var(--brand)]"
          }`}
        >
          DD Medistock
        </span>
        <span
          className={`block text-[10px] font-medium uppercase tracking-[0.14em] ${
            light ? "text-white/70" : "text-[var(--ink-soft)]"
          }`}
        >
          Medical &amp; Dental Supply
        </span>
      </span>
    </span>
  );
}
