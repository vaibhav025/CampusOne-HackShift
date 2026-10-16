import Link from "next/link";

/** Two linked rings: two communities, one connection. */
export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" className="text-accent" stroke="var(--accent)" />
      </svg>
      campusone
    </Link>
  );
}
