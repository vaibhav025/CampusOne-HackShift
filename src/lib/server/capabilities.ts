import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { capabilityText, embedTexts } from "@/lib/server/llm";

/** Computes and stores a capability's embedding. Silently skips if the provider is unavailable. */
export async function embedCapability(capId: string): Promise<boolean> {
  const ref = adminDb().collection("capabilities").doc(capId);
  const cap = (await ref.get()).data();
  if (!cap) return false;
  const vectors = await embedTexts([capabilityText(cap as never)]);
  if (!vectors) {
    await ref.update({ embedding: FieldValue.delete() });
    return false;
  }
  await ref.update({ embedding: vectors[0] });
  return true;
}
