"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { collection, doc, onSnapshot, type Query } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { getState, isDemo, resolveCollection, resolveDocument, subscribe } from "@/lib/demo/store";
import type { Club } from "@/lib/types";

interface Live<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/** Demo mode: subscribe to the in-memory store. */
function useDemoState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/**
 * Real-time Firestore query. `build` returns null to skip (e.g. while an id is unknown).
 * `key` must change whenever the query changes; in demo mode it also selects the data.
 */
export const useCollection: <T>(build: () => Query | null, key: string) => Live<T[]> = isDemo
  ? (_build, key) => useDemoCollection(key)
  : useFirestoreCollection;

function useDemoCollection<T>(key: string): Live<T[]> {
  const s = useDemoState();
  const data = useMemo(() => resolveCollection(key, s) as T[], [key, s]);
  return { data, loading: false, error: null };
}

function useFirestoreCollection<T>(build: () => Query | null, key: string): Live<T[]> {
  const [state, setState] = useState<{ key: string | null; data: T[]; error: string | null }>({
    key: null,
    data: [],
    error: null,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const enabled = useMemo(() => build() !== null, [key]);

  useEffect(() => {
    const q = build();
    if (!q) return;
    return onSnapshot(
      q,
      (snap) => setState({ key, data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), error: null }),
      (err) => {
        console.error(`[firestore] ${key}`, err);
        setState({ key, data: [], error: err.message });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!enabled) return { data: [], loading: false, error: null };
  const current = state.key === key;
  return { data: current ? state.data : [], loading: !current, error: current ? state.error : null };
}

/** All clubs as a live id -> club map (small collection; used to resolve names). */
export function useClubMap() {
  const clubs = useCollection<Club>(() => collection(clientDb(), "clubs"), "club-map");
  const map = useMemo(() => Object.fromEntries(clubs.data.map((c) => [c.id, c])), [clubs.data]);
  return { map, loading: clubs.loading, list: clubs.data };
}

/** Real-time single document. Pass null to skip. */
// Chosen once at module load (isDemo never changes at runtime), so hook order is stable.
export const useDocument: <T>(path: string | null) => Live<T | null> = isDemo ? useDemoDocument : useFirestoreDocument;

function useDemoDocument<T>(path: string | null): Live<T | null> {
  const s = useDemoState();
  const data = useMemo(() => (path ? (resolveDocument(path, s) as T | null) : null), [path, s]);
  return { data, loading: false, error: null };
}

function useFirestoreDocument<T>(path: string | null): Live<T | null> {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({
    path: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(clientDb(), path),
      (snap) => setState({ path, data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null, error: null }),
      (err) => setState({ path, data: null, error: err.message }),
    );
  }, [path]);

  if (!path) return { data: null, loading: false, error: null };
  const current = state.path === path;
  return { data: current ? state.data : null, loading: !current, error: current ? state.error : null };
}

/** A timestamp captured once per mount, for render-time "is this in the past?" checks. */
export function useNow() {
  const [now] = useState(() => Date.now());
  return now;
}
