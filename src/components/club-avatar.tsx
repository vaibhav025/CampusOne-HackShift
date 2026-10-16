import { cn, initials } from "@/lib/utils";

// Tints drawn from the teal palette; hue is stable per club name.
const TINTS = [
  "bg-[#0a7075]/25 text-ink/85",
  "bg-[#274d60]/25 text-ink/85",
  "bg-[#6ba3be]/25 text-ink/85",
  "bg-[#0c969c]/25 text-ink/85",
  "bg-[#3d5a52]/25 text-ink/85",
  "bg-[#5b4a2e]/25 text-ink/85",
];

export function ClubAvatar({
  name,
  logoURL,
  size = "md",
}: {
  name: string;
  logoURL?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "size-7 text-[11px] rounded-lg" : size === "lg" ? "size-14 text-lg rounded-2xl" : "size-9 text-xs rounded-xl";
  if (logoURL) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoURL} alt="" className={cn("shrink-0 object-cover", dim)} />;
  }
  const tint = TINTS[[...name].reduce((a, c) => a + c.codePointAt(0)!, 0) % TINTS.length];
  return (
    <div className={cn("flex shrink-0 items-center justify-center font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]", dim, tint)}>
      {initials(name)}
    </div>
  );
}
