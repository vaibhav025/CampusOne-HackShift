import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { embedCapability } from "@/lib/server/capabilities";
import { body, route } from "@/lib/server/route";

/** Recomputes one capability's embedding (spec: called after create/update). */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { capId } = await body(req, z.object({ capId: z.string().min(1) }));
  const cap = (await adminDb().collection("capabilities").doc(capId).get()).data();
  if (!cap || cap.clubId !== club.id) throw new HttpError(404, "Capability not found");
  return { ok: await embedCapability(capId) };
});
