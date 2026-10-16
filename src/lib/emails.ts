// Email identities used by the demo and seed data. Everything lives on the
// GGSIPU student domain. Club contacts other than the two team accounts are
// placeholders: real-looking addresses that must never actually be emailed.

export const STUDENT_DOMAIN = "std.ggsipu.ac.in";

export const TEAM = {
  host: { name: "Vaibhav Singla", email: "vaibhav.04816401525@std.ggsipu.ac.in" },
  partner: { name: "Rohan Garg", email: "rohan.01916401525@std.ggsipu.ac.in" },
} as const;

/** Seeded club inboxes look like `club.<name>@std.ggsipu.ac.in`. */
export function placeholderClubEmail(clubId: string) {
  return `club.${clubId.replace(/[^a-z0-9]+/gi, ".")}@${STUDENT_DOMAIN}`;
}

/** True for seeded placeholder inboxes, which we never send mail or calendar invites to. */
export function isPlaceholderEmail(email: string | null | undefined) {
  if (!email) return true;
  const e = email.toLowerCase();
  // .test is a reserved TLD (RFC 2606) used by the e2e test accounts.
  return e.endsWith("@example.com") || e.endsWith(".test") || (e.startsWith("club.") && e.endsWith(`@${STUDENT_DOMAIN}`));
}
