"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { clientAuth, clientDb, googleProvider, isFirebaseConfigured } from "@/lib/firebase/client";
import { api } from "@/lib/api-client";
import { compileSentence, runMatch } from "@/lib/demo/api";
import { DEMO_UID, getState, HOST_CLUB_ID, isDemo, subscribe, update } from "@/lib/demo/store";
import { TEAM } from "@/lib/emails";
import type { Club, UserDoc } from "@/lib/types";

interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: UserDoc | null;
  club: Club | null;
  isClubAdmin: boolean;
  /** Demo mode only: switch which club you're acting as. */
  switchClub?: (clubId: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return isDemo ? <DemoAuthProvider>{children}</DemoAuthProvider> : <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

const noopSubscribe = () => () => {};
export const DEMO_SENTENCE = "24-hour cybersecurity hackathon on 15 Nov, 200 participants, need sponsors, mentors and a venue.";

function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  // Client-only state (localStorage); render "loading" on the server to avoid hydration mismatches.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const s = useSyncExternalStore(subscribe, getState, getState);

  // Pre-compile the demo request once so the Compiler result page has data immediately.
  useEffect(() => {
    if (!hydrated || getState().compilerRequests.some((r) => r.id === "demo-hackathon")) return;
    const host = getState().clubs.find((c) => c.id === HOST_CLUB_ID)!;
    compileSentence(DEMO_SENTENCE, host, "demo-hackathon");
    runMatch("demo-hackathon");
  }, [hydrated]);

  const club = hydrated && s.signedIn ? (s.clubs.find((c) => c.id === s.currentClubId) ?? null) : null;
  // Viewing as the host club = Vaibhav; as the partner club = Rohan.
  const person = s.currentClubId === HOST_CLUB_ID ? TEAM.host : TEAM.partner;
  const user = hydrated && s.signedIn
    ? ({ uid: DEMO_UID, email: person.email, displayName: person.name, photoURL: null } as unknown as User)
    : null;
  const profile: UserDoc | null = user
    ? { uid: DEMO_UID, name: person.name, email: person.email, photoURL: "", clubId: s.currentClubId, role: "admin", createdAt: null }
    : null;

  const value: AuthState = {
    configured: true,
    loading: !hydrated,
    user,
    profile,
    club,
    isClubAdmin: Boolean(club?.adminUids.includes(DEMO_UID)),
    switchClub: (clubId) => update((d) => void (d.currentClubId = clubId)),
    signIn: async () => update((d) => void (d.signedIn = true)),
    signOut: async () => update((d) => void (d.signedIn = false)),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [clubState, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  // Auth state -> upsert profile -> live profile listener
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(clientAuth(), async (u) => {
      unsubProfile?.();
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Creates the user doc and auto-attaches seeded demo admins to their club.
        await api("/api/users/me", { method: "POST" });
      } catch (e) {
        console.error("Profile upsert failed", e);
      }
      unsubProfile = onSnapshot(
        doc(clientDb(), "users", u.uid),
        (snap) => {
          setProfile(snap.exists() ? (snap.data() as UserDoc) : null);
          if (!snap.exists() || !snap.data()?.clubId) setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  // Live club listener
  const clubId = profile?.clubId ?? null;
  // Only expose the club snapshot that belongs to the current profile.
  const club = clubId && clubState?.id === clubId ? clubState : null;
  useEffect(() => {
    if (!clubId) return;
    const unsub = onSnapshot(
      doc(clientDb(), "clubs", clubId),
      (snap) => {
        setClub(snap.exists() ? ({ id: snap.id, ...snap.data() } as Club) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [clubId]);

  const signIn = useCallback(async () => {
    await signInWithPopup(clientAuth(), googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(clientAuth());
  }, []);

  const isClubAdmin = Boolean(user && club?.adminUids?.includes(user.uid));

  return (
    <AuthContext.Provider
      value={{ configured: isFirebaseConfigured, loading, user, profile, club, isClubAdmin, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
