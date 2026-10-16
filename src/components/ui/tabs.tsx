"use client";

import { cn } from "@/lib/utils";

/** Segmented control: neutral track, white raised segment for the active tab. */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl bg-teal-950/70 p-1 shadow-inset", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-[13px] font-medium transition-[color,background-color,box-shadow] duration-150",
            value === t.value ? "bg-surface-2 text-ink shadow-[0_0_0_1px_var(--line),0_4px_10px_-4px_rgb(0_0_0/0.5)]" : "text-muted hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
