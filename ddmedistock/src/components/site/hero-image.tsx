"use client";

import { useEffect, useRef } from "react";

/**
 * Hero background image with a light, premium parallax: the image drifts at a
 * fraction of scroll speed. The image is oversized (top:-12%, height:124%) so it
 * never reveals an edge. Disabled on touch/coarse pointers and reduced-motion to
 * keep mobile smooth — there it's just a static cover image.
 */
export function HeroImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    if (mqReduce.matches || mqCoarse.matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      // Only animate while the hero is near the viewport.
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = window.scrollY * 0.18;
      el.style.transform = `translate3d(0, ${offset}px, 0) scale(1.05)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      aria-hidden="true"
      className="absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover will-change-transform"
      style={{ transform: "scale(1.05)" }}
      fetchPriority="high"
    />
  );
}
