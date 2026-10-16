import {
  Camera,
  Coins,
  GraduationCap,
  HandHelping,
  Megaphone,
  MapPin,
  Palette,
  Share2,
  Wrench,
  Building2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { CAPABILITY_LABELS, type Capability, type CapabilityType } from "@/lib/types";

export const CAPABILITY_ICONS: Record<CapabilityType, React.ElementType> = {
  sponsor: Coins,
  venue: Building2,
  mentor: GraduationCap,
  camera: Camera,
  social_media: Share2,
  design: Palette,
  volunteers: HandHelping,
  tech_support: Wrench,
  promotion: Megaphone,
};

export function CapabilityTypeBadge({ type }: { type: CapabilityType }) {
  const Icon = CAPABILITY_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Icon className="size-3.5" strokeWidth={1.8} /> {CAPABILITY_LABELS[type]}
    </span>
  );
}

export function CapabilityCard({
  cap,
  footer,
  className,
}: {
  cap: Capability;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-3 p-4", !cap.active && "opacity-60", className)}>
      <div className="flex items-start justify-between gap-2">
        <CapabilityTypeBadge type={cap.type} />
        {!cap.active && <Badge variant="muted">Paused</Badge>}
      </div>
      <div>
        <p className="font-medium">{cap.title}</p>
        {cap.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{cap.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" /> {cap.city}
        </span>
        {cap.capacity ? (
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {cap.capacity}
          </span>
        ) : null}
        {cap.availableFrom || cap.availableTo ? (
          <span>
            {formatDate(cap.availableFrom, { day: "numeric", month: "short" })} – {formatDate(cap.availableTo, { day: "numeric", month: "short" })}
          </span>
        ) : null}
      </div>
      {cap.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cap.tags.slice(0, 5).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      )}
      {footer}
    </Card>
  );
}
