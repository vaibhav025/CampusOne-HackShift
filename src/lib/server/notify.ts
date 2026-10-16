import "server-only";
import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { NotificationType } from "@/lib/types";

/** Adds an in-app notification for a club (optionally inside an existing batch). */
export function notify(clubId: string, type: NotificationType, title: string, link: string, batch?: WriteBatch) {
  const ref = adminDb().collection("notifications").doc();
  const data = { clubId, type, title, link, read: false, createdAt: FieldValue.serverTimestamp() };
  if (batch) batch.set(ref, data);
  else return ref.set(data);
}
