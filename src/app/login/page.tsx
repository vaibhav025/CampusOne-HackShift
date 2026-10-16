"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/states";

function LoginInner() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

  useEffect(() => {
    if (loading || !user || !profile) return;
    router.replace(profile.clubId ? next : "/onboarding");
  }, [loading, user, profile, next, router]);

  if (user && (loading || profile)) return <LoadingState label="Signing you in…" />;

  return (
    <main className="relative flex flex-1 items-center justify-center p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>
        <h1 className="mt-6 text-xl font-semibold">Sign in to your club</h1>
        <p className="mt-2 text-sm text-muted">
          Use your college Google account. Clubs whose admins sign in with the college domain get a verified badge.
        </p>
        <GoogleSignInButton className="mt-6 w-full" />
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginInner />
    </Suspense>
  );
}
