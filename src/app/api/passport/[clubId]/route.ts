import { HttpError, requireUser } from "@/lib/server/auth";
import { getPassports } from "@/lib/server/passport";
import { route } from "@/lib/server/route";

/** Trust Passport, computed on read from the evidence. Nothing is stored. */
export const GET = route<{ params: Promise<{ clubId: string }> }>(async (req, { params }) => {
  await requireUser(req);
  const { clubId } = await params;
  const passport = (await getPassports([clubId]))[clubId];
  if (!passport) throw new HttpError(404, "Club not found");
  return passport;
});
