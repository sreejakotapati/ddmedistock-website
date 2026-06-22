import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger" | "success" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--primary)] text-white hover:bg-[#02557f] shadow-sm",
  outline: "border border-[var(--border)] bg-white hover:bg-[var(--muted)] text-[var(--foreground)]",
  ghost: "hover:bg-[var(--muted)] text-[var(--foreground)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[#b91c1c]",
  success: "bg-[var(--success)] text-white hover:bg-[#047857]",
  subtle: "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[#e2e8f0]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
