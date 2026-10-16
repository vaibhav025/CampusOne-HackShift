"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { useAuth } from "@/components/auth-provider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function GoogleSignInButton({ label = "Continue with Google", ...props }: ButtonProps & { label?: string }) {
  const { configured, signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!configured) {
      toast.error("Firebase is not configured yet. Fill .env.local (see .env.example).");
      return;
    }
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      if (!msg.includes("popup-closed")) toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="lg" variant="secondary" onClick={onClick} disabled={busy} {...props}>
      {busy ? <Spinner /> : <GoogleIcon />}
      {label}
    </Button>
  );
}
