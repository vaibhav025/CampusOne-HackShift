"use client";

import { clientAuth } from "@/lib/firebase/client";
import { demoApi } from "@/lib/demo/api";
import { isDemo } from "@/lib/demo/store";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Calls an API route with the current user's Firebase ID token as a Bearer header. */
export async function api<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  if (isDemo) {
    try {
      return await demoApi<T>(path, options.method ?? (options.body ? "POST" : "GET"), (options.body ?? {}) as Record<string, unknown>);
    } catch (e) {
      throw new ApiError(e instanceof Error ? e.message : "Demo error", (e as { status?: number }).status ?? 400);
    }
  }
  const user = clientAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const res = await fetch(path, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}
