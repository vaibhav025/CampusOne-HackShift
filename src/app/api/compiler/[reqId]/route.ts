import { z } from "zod";
import { normalizeParsed } from "@/lib/compiler/normalize";
import { parsedSchema } from "@/lib/compiler/schema";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { body, route } from "@/lib/server/route";

/** Saves the organizer's edits to the parsed request (manual fallback when the AI got something wrong). */
export const PATCH = route<{ params: Promise<{ reqId: string }> }>(async (req, { params }) => {
  const { club } = await requireClubAdmin(req);
  const { reqId } = await params;
  const { parsed } = await body(req, z.object({ parsed: parsedSchema }));
  const ref = adminDb().collection("compilerRequests").doc(reqId);
  const existing = (await ref.get()).data();
  if (!existing || existing.clubId !== club.id) throw new HttpError(404, "Request not found");
  const normalized = normalizeParsed(parsed, club.city);
  await ref.update({ parsed: normalized, status: existing.status === "invites_sent" ? "invites_sent" : "parsed" });
  return { parsed: normalized };
});
