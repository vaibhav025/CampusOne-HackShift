import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  // Press feedback: scale(0.97) on :active, 150ms on the snappy ease-out curve.
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-teal-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_6px_14px_-6px_rgb(12_150_156/0.45)] hover:bg-[#0fa6ad]",
        good: "bg-teal-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] hover:bg-teal-500",
        secondary: "bg-surface-2 text-ink shadow-[0_0_0_1px_var(--line),inset_0_1px_0_rgb(255_255_255/0.04)] hover:bg-slate-teal/70",
        outline: "bg-transparent text-ink shadow-[0_0_0_1px_rgb(107_163_190/0.22)] hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-ink",
        destructive: "text-danger hover:bg-danger/10",
        link: "h-auto px-0 text-accent-ink underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-4 text-sm",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
