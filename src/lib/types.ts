// Firestore data model (spec Section 5). Timestamps are typed loosely because
// they arrive as client Timestamps, admin Timestamps or ISO strings from the API.
export type TS = unknown;

export const CAPABILITY_TYPES = [
  "sponsor",
  "venue",
  "mentor",
  "camera",
  "social_media",
  "design",
  "volunteers",
  "tech_support",
  "promotion",
] as const;
export type CapabilityType = (typeof CAPABILITY_TYPES)[number];

export const CAPABILITY_LABELS: Record<CapabilityType, string> = {
  sponsor: "Sponsor",
  venue: "Venue",
  mentor: "Mentor",
  camera: "Camera / Photo",
  social_media: "Social media",
  design: "Design",
  volunteers: "Volunteers",
  tech_support: "Tech support",
  promotion: "Promotion",
};

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  clubId: string | null;
  role: "admin" | "member";
  createdAt: TS;
}

export interface Club {
  id: string;
  name: string;
  college: string;
  collegeDomain: string;
  city: string;
  domains: string[];
  description: string;
  logoURL: string;
  contactEmail: string;
  adminUids: string[];
  /** Emails that are auto-attached as admins on first login (used by seed/demo accounts). */
  adminEmails?: string[];
  verified: boolean;
  verifiedAt?: TS;
  openToInstantMeets: boolean;
  calendarConnected?: boolean;
  memberCount: number;
  createdAt: TS;
}

export interface Capability {
  id: string;
  clubId: string;
  type: CapabilityType;
  title: string;
  description: string;
  city: string;
  capacity?: number | null;
  availableFrom?: TS | null;
  availableTo?: TS | null;
  tags: string[];
  embedding?: number[];
  active: boolean;
  createdAt: TS;
}

export type EventMode = "offline" | "online" | "hybrid";

export interface EventDoc {
  id: string;
  title: string;
  description: string;
  hostClubIds: string[];
  collabId?: string;
  date: TS;
  city: string;
  mode: EventMode;
  tags: string[];
  rsvpCount: number;
  createdAt: TS;
}

export type Priority = "high" | "medium" | "low";

export interface Need {
  id: string;
  type: CapabilityType;
  detail: string;
  priority: Priority;
  quantity?: number | null;
}

export interface ParsedRequest {
  eventTitle: string;
  eventType: string;
  date: string | null;
  city: string | null;
  expectedSize: number | null;
  mode: EventMode | null;
  needs: Need[];
  suggestedMissingNeeds: { type: CapabilityType; reason: string }[];
}

export interface CompilerRequest {
  id: string;
  clubId: string;
  rawText: string;
  parsed: ParsedRequest;
  parsedBy?: "llm" | "fallback";
  status: "parsed" | "matched" | "invites_sent";
  createdAt: TS;
}

export interface MatchScores {
  semantic: number;
  logistics: number;
  reliability: number;
  final: number;
}

export interface Match {
  id: string;
  needId: string;
  clubId: string;
  capabilityId: string;
  scores: MatchScores;
  reasons: string[];
  rank: number;
  semanticMethod?: "embedding" | "tags";
  rankedBy?: "llm" | "score";
  snapshot: {
    clubName: string;
    college: string;
    verified: boolean;
    capabilityTitle: string;
    capabilityCity: string;
    capacity: number | null;
    completed: number;
    abandoned: number;
    onTimeRate: number | null;
    rating: number | null;
    risk: boolean;
  };
}

export interface CollabRequest {
  id: string;
  fromClubId: string;
  toClubId: string;
  compilerRequestId: string;
  needId: string;
  capabilityId: string;
  matchId?: string;
  subject?: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: TS;
  respondedAt?: TS;
  meetLink?: string;
  meetIsFallback?: boolean;
  calendarEventId?: string;
  collabId?: string;
  eventTitle?: string;
  eventDate?: string | null;
  needType?: CapabilityType;
}

export interface Collaboration {
  id: string;
  title: string;
  clubIds: string[];
  hostClubId: string;
  compilerRequestId: string;
  status: "ongoing" | "completed" | "abandoned";
  /** The club whose inactivity caused abandonment; only that club's Passport counts it. */
  abandonedByClubId?: string | null;
  eventDate: TS;
  startedAt: TS;
  endedAt?: TS;
  meetLink?: string;
  meetIsFallback?: boolean;
  calendarEventId?: string;
  roles?: Record<string, string>;
  inactiveFlag?: {
    byClubId: string;
    againstClubId: string;
    flaggedAt: TS;
    disputeDeadline: TS;
    disputed: boolean;
    disputeNote?: string;
    resolved?: boolean;
  } | null;
}

export interface Task {
  id: string;
  collabId: string;
  title: string;
  description: string;
  ownerClubId: string;
  dueDate: TS;
  status: "todo" | "doing" | "done";
  completedAt?: TS | null;
  order: number;
  updatedAt?: TS;
}

export interface Feedback {
  id: string;
  collabId: string;
  fromClubId: string;
  toClubId: string;
  rating: number;
  comment: string;
  wouldCollabAgain: boolean;
  createdAt: TS;
}

export type NotificationType =
  | "collab_request"
  | "request_accepted"
  | "meet_scheduled"
  | "task_due"
  | "feedback_requested";

export interface NotificationDoc {
  id: string;
  clubId: string;
  type: NotificationType;
  title: string;
  link: string;
  read: boolean;
  createdAt: TS;
}
