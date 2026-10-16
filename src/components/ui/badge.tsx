import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Quiet by default: most badges are neutral text; colour only when it means something.
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-px text-[11.5px] font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-teal-500/12 text-sky-soft",
        good: "bg-good/10 text-good",
        warn: "bg-warn/12 text-warn",
        danger: "bg-danger/10 text-danger",
        muted: "bg-slate-teal/40 text-muted",
        outline: "text-muted shadow-[0_0_0_1px_var(--line)]",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** A small coloured dot + label; reads calmer than a filled pill for statuses. */
export function StatusDot({ tone, children }: { tone: "good" | "warn" | "muted" | "accent"; children: React.ReactNode }) {
  const dot = { good: "bg-good", warn: "bg-warn", muted: "bg-muted/60", accent: "bg-accent" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}
