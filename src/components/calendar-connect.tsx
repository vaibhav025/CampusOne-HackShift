"use client";

import { toast } from "sonner";
import { CalendarCheck2, CalendarPlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientAuth } from "@/lib/firebase/client";
import { isDemo } from "@/lib/demo/store";

export function CalendarConnect() {
  const { club, isClubAdmin } = useAuth();

  async function connect() {
    if (isDemo) {
      toast.info("Demo mode: kickoff calls use a prefilled Google Calendar link instead of OAuth.");
      return;
    }
    const token = await clientAuth().currentUser?.getIdToken();
    // Full navigation on purpose: this API route redirects to Google's OAuth screen.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/calendar/auth?token=${encodeURIComponent(token ?? "")}`;
  }

  return (
    <Card className="flex items-center gap-4 p-4">
      {club?.calendarConnected ? <CalendarCheck2 className="size-5 shrink-0 text-good" /> : <CalendarPlus className="size-5 shrink-0 text-accent-ink" />}
      <div className="flex-1">
        <p className="font-medium">Google Calendar</p>
        <p className="text-xs text-muted">Creates Google Meet links automatically when partners accept.</p>
      </div>
      {club?.calendarConnected ? (
        <Badge variant="good">Connected</Badge>
      ) : (
        <Button size="sm" variant="secondary" onClick={connect} disabled={!isClubAdmin}>
          Connect
        </Button>
      )}
    </Card>
  );
}
