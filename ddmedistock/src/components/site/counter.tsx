"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Target number; when null the placeholder is shown (no animation). */
  value: number | null;
  placeholder?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
};

/**
 * Counts up to `value` once it scrolls into view. Eased, no bounce. Reduced
 * motion (or no value) shows the final figure immediately. Built for editable
 * placeholder stats — pass value: null to display "—" until a real figure is set.
 */
export function Counter({
  value,
  placeholder = "—",
  suffix = "",
  durationMs = 1400,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value === null ? null : 0);

  useEffect(() => {
    if (value === null) return;
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        let raf = 0;
        let start: number | null = null;
        const tick = (t: number) => {
          if (start === null) start = t;
          const p = Math.min((t - start) / durationMs, 1);
          // easeOutCubic — decelerating, never overshoots.
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * value));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display === null ? placeholder : `${display}${suffix}`}
    </span>
  );
}
