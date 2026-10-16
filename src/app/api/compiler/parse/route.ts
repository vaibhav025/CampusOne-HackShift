import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { fallbackParse } from "@/lib/compiler/fallback-parser";
import { normalizeParsed } from "@/lib/compiler/normalize";
import { parsePrompt } from "@/lib/compiler/prompts";
import { parsedSchema } from "@/lib/compiler/schema";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { llmJSON, LLMError } from "@/lib/server/llm";
import { body, route } from "@/lib/server/route";

/** LLM call #1: one sentence -> structured needs. Falls back to the deterministic parser. */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { rawText, clubId } = await body(
    req,
    z.object({ rawText: z.string().trim().min(10, "Describe your event in a sentence").max(1500), clubId: z.string().optional() }),
  );
  if (clubId && clubId !== club.id) throw new HttpError(403, "You can only compile requests for your own club");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let parsedBy: "llm" | "fallback" = "llm";
  let parsed;
  let note: string | undefined;
  try {
    const raw = await llmJSON({ system: parsePrompt({ today, clubCity: club.city }), user: rawText, schema: parsedSchema });
    parsed = normalizeParsed(raw, club.city);
    if (parsed.needs.length === 0) throw new LLMError("Model returned no needs");
  } catch (e) {
    if (!(e instanceof LLMError)) throw e;
    console.warn("[compiler/parse] using fallback parser:", e.message);
    parsedBy = "fallback";
    note = e.message;
    parsed = normalizeParsed(fallbackParse(rawText, { today: now, clubCity: club.city }), club.city);
  }

  const ref = adminDb().collection("compilerRequests").doc();
  await ref.set({ clubId: club.id, rawText, parsed, parsedBy, status: "parsed", createdAt: FieldValue.serverTimestamp() });
  return { reqId: ref.id, parsed, parsedBy, note };
});
