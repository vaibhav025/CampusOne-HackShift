// Deterministic demo dataset (spec Section 14). All club names are fictional.
// Dates are relative to `now`, so the data stays fresh whenever it is re-seeded.
import { placeholderClubEmail, STUDENT_DOMAIN, TEAM } from "@/lib/emails";
import type { CapabilityType, EventMode } from "@/lib/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;

interface CapSeed {
  type: CapabilityType;
  title: string;
  description: string;
  capacity?: number;
  tags: string[];
  noWindow?: boolean;
}

interface ClubSeed {
  key: string;
  id: string;
  name: string;
  college: string;
  collegeDomain: string;
  city: string;
  domains: string[];
  description: string;
  verified: boolean;
  memberCount: number;
  openToInstantMeets?: boolean;
  caps: CapSeed[];
}

export const CLUB_SEEDS: ClubSeed[] = [
  {
    key: "cc", id: "coding-club-ggsipu", name: "Coding Club", college: "GGSIPU", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["coding", "hackathons", "web", "ai"], verified: true, memberCount: 140,
    description: "GGSIPU's largest coding community. Weekly contests, project nights and an annual hackathon.",
    caps: [
      { type: "tech_support", title: "Hackathon judging platform + 4 devs", description: "Our own submission & judging portal with devs on call during events.", tags: ["hackathon", "judging", "platform", "web"] },
      { type: "volunteers", title: "25 student volunteers", description: "Registration desk, help desk and logistics volunteers.", capacity: 25, tags: ["volunteers", "registration", "logistics"] },
    ],
  },
  {
    key: "cs", id: "cybersec-society-nitd", name: "CyberSec Society", college: "NIT Delhi", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["cybersecurity", "tech", "ctf"], verified: true, memberCount: 210,
    description: "Security research club running CTFs, red-team workshops and India's friendliest bug-bounty bootcamp.",
    caps: [
      { type: "mentor", title: "8 security mentors (CTF finalists, OSCP holders)", description: "Mentors for cybersecurity hackathons, CTFs and security tracks. Experienced with 24-hour formats.", tags: ["cybersecurity", "ctf", "hackathon", "security", "mentorship"] },
      { type: "venue", title: "Main auditorium, 250 seats + Wi-Fi", description: "Auditorium with stage, projector, high-speed Wi-Fi and overnight access for hackathons.", capacity: 250, tags: ["auditorium", "hackathon", "wifi", "overnight", "tech"] },
      { type: "tech_support", title: "CTF infrastructure (CTFd hosting)", description: "We host and run CTF challenge infrastructure for partner events.", tags: ["ctf", "cybersecurity", "infrastructure"] },
    ],
  },
  {
    key: "bf", id: "byteforge-iiitd", name: "ByteForge", college: "IIIT Delhi", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["ai", "cybersecurity", "systems"], verified: true, memberCount: 45,
    description: "A new systems and security club started this semester by IIIT Delhi undergrads.",
    caps: [
      { type: "mentor", title: "5 mentors for AI & security tracks", description: "PhD students and seniors mentoring AI security and systems projects at hackathons.", tags: ["cybersecurity", "ai", "hackathon", "mentorship"] },
      { type: "design", title: "Event branding kit", description: "Posters, badges and slide templates for tech events.", tags: ["design", "branding", "posters"] },
    ],
  },
  {
    key: "tn", id: "technova-sample", name: "TechNova Club", college: "Sample College", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["tech", "cybersecurity", "hackathons"], verified: true, memberCount: 90,
    description: "General tech club hosting hackathons, robotics demos and security meetups.",
    caps: [
      { type: "venue", title: "Convention hall, 300 seats", description: "Large hall suitable for hackathons and tech fests.", capacity: 300, tags: ["hall", "hackathon", "events", "tech"] },
      { type: "mentor", title: "Hackathon mentors (web & app dev)", description: "Mentors for web and app development hackathons.", tags: ["web", "app development", "hackathon", "mentorship"] },
    ],
  },
  {
    key: "ll", id: "lens-light-dtu", name: "Lens & Light Society", college: "DTU", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["photography", "film", "media"], verified: true, memberCount: 120,
    description: "Photography and film society covering fests, hackathons and exhibitions across Delhi.",
    caps: [
      { type: "camera", title: "Sony A7 III + 2 photographers", description: "Full event coverage with edited photos within 48 hours.", tags: ["photography", "coverage", "events", "video"] },
      { type: "social_media", title: "Reels & aftermovie team", description: "Short-form reels and a 60-second aftermovie for your event.", tags: ["reels", "video", "instagram", "aftermovie"] },
    ],
  },
  {
    key: "px", id: "pixel-collective-nsut", name: "Pixel Collective", college: "NSUT", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["design", "ui", "branding"], verified: true, memberCount: 75,
    description: "Design club for UI/UX, branding and motion graphics.",
    caps: [
      { type: "design", title: "Full event identity in 5 days", description: "Logo, posters, social creatives and certificates.", tags: ["design", "branding", "posters", "certificates"] },
      { type: "social_media", title: "Social creatives calendar", description: "Two weeks of designed posts for your event pages.", tags: ["instagram", "creatives", "promotion"] },
    ],
  },
  {
    key: "fc", id: "founders-cell-jmi", name: "Founders' Cell", college: "Jamia Millia Islamia", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["startups", "entrepreneurship", "tech"], verified: true, memberCount: 160,
    description: "Entrepreneurship cell connecting students with alumni founders and angel networks.",
    caps: [
      { type: "sponsor", title: "Alumni startup network, ₹50k pool", description: "Cash prizes and swag from alumni-founded startups for tech hackathons and security events.", tags: ["sponsor", "hackathon", "startups", "prizes", "tech"] },
      { type: "mentor", title: "Founder mentors for pitch rounds", description: "Alumni founders to mentor and judge product and pitch rounds.", tags: ["startups", "pitching", "mentorship", "judging"] },
    ],
  },
  {
    key: "eb", id: "ecell-bennett", name: "E-Cell Bennett", college: "Bennett University", collegeDomain: STUDENT_DOMAIN, city: "Greater Noida",
    domains: ["entrepreneurship", "startups", "business"], verified: true, memberCount: 130,
    description: "Bennett's entrepreneurship cell with an active industry-partner network.",
    caps: [
      { type: "sponsor", title: "Industry partners pool, up to ₹1L", description: "Sponsorship from regional industry partners for large inter-college events.", tags: ["sponsor", "industry", "prizes", "events"] },
      { type: "promotion", title: "Newsletter to 6,000 students", description: "Feature in our weekly newsletter across NCR colleges.", tags: ["promotion", "newsletter", "outreach"] },
    ],
  },
  {
    key: "du", id: "debate-union-du", name: "Debate Union", college: "Delhi University", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["debate", "public speaking", "policy"], verified: true, memberCount: 95,
    description: "Parliamentary debate society that also hosts policy hackathons.",
    caps: [
      { type: "venue", title: "Seminar hall, 220 seats", description: "Seminar hall with AV setup, available on weekends.", capacity: 220, tags: ["seminar hall", "events", "weekend", "av"] },
      { type: "volunteers", title: "15 anchors & volunteers", description: "Event anchors, moderators and floor volunteers.", capacity: 15, tags: ["anchors", "volunteers", "moderation"] },
    ],
  },
  {
    key: "ge", id: "greenearth-amity", name: "GreenEarth Club", college: "Amity University Noida", collegeDomain: STUDENT_DOMAIN, city: "Noida",
    domains: ["sustainability", "climate", "community"], verified: true, memberCount: 110,
    description: "Sustainability club running cleanup drives, climate hackathons and awareness campaigns.",
    caps: [
      { type: "volunteers", title: "40 volunteers for large events", description: "Trained volunteers for registration, crowd and waste management.", capacity: 40, tags: ["volunteers", "crowd", "logistics", "sustainability"] },
      { type: "social_media", title: "Instagram page, 12k followers", description: "Collab posts and stories for partner events.", tags: ["instagram", "promotion", "community"] },
    ],
  },
  {
    key: "rk", id: "roboknights-dtu", name: "RoboKnights", college: "DTU", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["robotics", "hardware", "iot"], verified: true, memberCount: 85,
    description: "Robotics team competing nationally; runs hardware hackathons.",
    caps: [
      { type: "tech_support", title: "Hardware lab support + IoT kits", description: "Arduino, Raspberry Pi and sensor kits with lab mentors.", tags: ["hardware", "iot", "robotics", "kits"] },
      { type: "mentor", title: "Robotics & embedded mentors", description: "Mentors for hardware hackathons and robotics competitions.", tags: ["robotics", "embedded", "hardware", "mentorship"] },
    ],
  },
  {
    key: "wit", id: "women-in-tech-igdtuw", name: "Women in Tech", college: "IGDTUW", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["diversity", "tech", "cybersecurity"], verified: true, memberCount: 150,
    description: "Community for women in technology. Mentorship circles, security workshops and hackathons.",
    caps: [
      { type: "mentor", title: "Industry women mentors (security, SWE)", description: "Mentors from security and software engineering for hackathons and panels.", tags: ["mentorship", "cybersecurity", "software", "diversity"] },
      { type: "promotion", title: "Outreach to 20 college chapters", description: "Promotion through our chapter network across North India.", tags: ["promotion", "outreach", "community"] },
    ],
  },
  {
    key: "ai", id: "ai-guild-snu", name: "AI Guild", college: "Shiv Nadar University", collegeDomain: STUDENT_DOMAIN, city: "Greater Noida",
    domains: ["ai", "ml", "research"], verified: true, memberCount: 100,
    description: "Machine-learning research and applied AI club.",
    caps: [
      { type: "mentor", title: "ML mentors & GPU credits guidance", description: "Mentors for ML tracks and model-building hackathons.", tags: ["ai", "ml", "mentorship", "hackathon"] },
      { type: "venue", title: "AI lab, 80 seats", description: "Lab with workstations for smaller workshops.", capacity: 80, tags: ["lab", "workshop", "ai"] },
    ],
  },
  {
    key: "cm", id: "crescendo-nsut", name: "Crescendo Music Society", college: "NSUT", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["music", "culture", "performances"], verified: true, memberCount: 70,
    description: "Bands, open mics and the sound crew behind NSUT's cultural nights.",
    caps: [
      { type: "tech_support", title: "Sound & stage crew", description: "PA system, mics and a 4-person stage crew.", tags: ["sound", "stage", "audio", "events"] },
      { type: "volunteers", title: "Opening-night performers", description: "Live band for openings and closing ceremonies.", tags: ["music", "performance", "ceremony"] },
    ],
  },
  {
    key: "fin", id: "fincell-du", name: "FinCell", college: "Delhi University", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["finance", "investing", "fintech"], verified: true, memberCount: 115,
    description: "Finance and investment club; runs stock-pitch contests and fintech meetups.",
    caps: [
      { type: "sponsor", title: "Fintech sponsor pool, ₹25k", description: "Prize money from a fintech alumni circle, best suited to fintech and tech events.", tags: ["sponsor", "fintech", "prizes", "tech"] },
      { type: "promotion", title: "Finance newsletter feature", description: "Feature in our finance newsletter (3,500 readers).", tags: ["promotion", "newsletter"] },
    ],
  },
  {
    key: "dc", id: "devcircle-gdgu", name: "DevCircle", college: "GD Goenka University", collegeDomain: STUDENT_DOMAIN, city: "Gurugram",
    domains: ["web", "cloud", "devops"], verified: false, memberCount: 60,
    description: "Developer community focused on cloud, DevOps and web.",
    caps: [
      { type: "tech_support", title: "Cloud credits guidance + DevOps help", description: "Help teams deploy projects during hackathons.", tags: ["cloud", "devops", "deployment", "hackathon"] },
      { type: "social_media", title: "LinkedIn page, 5k followers", description: "Event promotion on LinkedIn.", tags: ["linkedin", "promotion"] },
    ],
  },
  {
    key: "nss", id: "nss-ggsipu", name: "NSS Unit", college: "GGSIPU", collegeDomain: STUDENT_DOMAIN, city: "Delhi",
    domains: ["community", "service", "volunteering"], verified: true, memberCount: 300,
    description: "National Service Scheme unit; the largest volunteer base on campus.",
    caps: [
      { type: "volunteers", title: "60 volunteers, 24-hour shifts", description: "Volunteers in shifts for overnight events, food and registration.", capacity: 60, tags: ["volunteers", "overnight", "hackathon", "registration"] },
      { type: "promotion", title: "Campus-wide WhatsApp outreach", description: "Announcements across 40 campus groups.", tags: ["promotion", "whatsapp", "outreach"] },
    ],
  },
  {
    key: "os", id: "open-source-jiit", name: "Open Source Society", college: "JIIT Noida", collegeDomain: STUDENT_DOMAIN, city: "Noida",
    domains: ["open source", "web", "community"], verified: true, memberCount: 130,
    description: "Open source contributors running sprints and Hacktoberfest events.",
    caps: [
      { type: "mentor", title: "Open source maintainers as mentors", description: "Maintainers who mentor first-time contributors and hackathon teams.", tags: ["open source", "mentorship", "git", "hackathon"] },
      { type: "promotion", title: "Discord community, 3k members", description: "Promotion on our Discord server.", tags: ["discord", "promotion", "community"] },
    ],
  },
];

// ---- Historical collaborations ----------------------------------------------

interface TaskPlan {
  club: string;
  tasks: number;
  /** done, but after the due date */
  late?: number;
  /** never done; due date in the past (abandoned collabs) */
  missed?: number;
}

interface CollabSeed {
  id: string;
  title: string;
  host: string;
  partners: string[];
  /** negative = past, positive = upcoming */
  dayOffset: number;
  status: "completed" | "abandoned" | "ongoing";
  abandonedBy?: string;
  plans: TaskPlan[];
  feedback?: { from: string; to: string; rating: number; comment: string; again?: boolean }[];
  /** hours each partner took to accept the original request */
  responseHours?: Record<string, number>;
  rsvps?: number;
  mode?: EventMode;
  tags?: string[];
}

export const COLLAB_SEEDS: CollabSeed[] = [
  // CyberSec Society: 6 completed / 0 abandoned, 24 owned tasks with 3 late, 4.6★, 3 repeat partners.
  {
    id: "h-ctf-bootcamp", title: "CTF Bootcamp 2025", host: "cs", partners: ["fc"], dayOffset: -320, status: "completed",
    plans: [{ club: "cs", tasks: 4 }, { club: "fc", tasks: 3 }], responseHours: { fc: 10 },
    feedback: [
      { from: "fc", to: "cs", rating: 5, comment: "Flawless CTF infra and mentors were always available." },
      { from: "cs", to: "fc", rating: 5, comment: "Sponsor prizes arrived a week early." },
    ], rsvps: 34, tags: ["ctf", "cybersecurity"],
  },
  {
    id: "h-startup-security", title: "Startup x Security Summit", host: "fc", partners: ["cs"], dayOffset: -270, status: "completed",
    plans: [{ club: "fc", tasks: 3 }, { club: "cs", tasks: 4, late: 1 }], responseHours: { cs: 4 },
    feedback: [
      { from: "fc", to: "cs", rating: 5, comment: "Great speakers, sorted the venue in a day." },
      { from: "cs", to: "fc", rating: 4, comment: "Good event; agenda was finalised a bit late." },
    ], rsvps: 41, tags: ["startups", "cybersecurity"],
  },
  {
    id: "h-osint-photowalk", title: "Photowalk & OSINT Workshop", host: "ll", partners: ["cs"], dayOffset: -210, status: "completed",
    plans: [{ club: "ll", tasks: 3 }, { club: "cs", tasks: 4 }], responseHours: { cs: 8 },
    feedback: [
      { from: "ll", to: "cs", rating: 4, comment: "Workshop was excellent; slides came a day late." },
      { from: "cs", to: "ll", rating: 5, comment: "Photos delivered in 24 hours." },
    ], rsvps: 27, tags: ["photography", "osint"],
  },
  {
    id: "h-secureshot", title: "SecureShot Exhibition", host: "cs", partners: ["ll"], dayOffset: -160, status: "completed",
    plans: [{ club: "cs", tasks: 4, late: 1 }, { club: "ll", tasks: 3 }], responseHours: { ll: 14 },
    feedback: [
      { from: "ll", to: "cs", rating: 5, comment: "Professional from day one. Would partner again." },
      { from: "cs", to: "ll", rating: 5, comment: "Beautiful exhibition prints." },
    ], rsvps: 38, tags: ["exhibition", "cybersecurity"],
  },
  {
    id: "h-wis-panel", title: "Women in Security Panel", host: "wit", partners: ["cs"], dayOffset: -110, status: "completed",
    plans: [{ club: "wit", tasks: 3 }, { club: "cs", tasks: 4, late: 1 }], responseHours: { cs: 3 },
    feedback: [
      { from: "wit", to: "cs", rating: 4, comment: "Strong panelists; one deliverable slipped by two days." },
      { from: "cs", to: "wit", rating: 5, comment: "Amazing outreach, full house." },
    ], rsvps: 52, tags: ["cybersecurity", "diversity"],
  },
  {
    id: "h-hackher", title: "HackHer Security Track", host: "cs", partners: ["wit"], dayOffset: -45, status: "completed",
    plans: [{ club: "cs", tasks: 4 }, { club: "wit", tasks: 3 }], responseHours: { wit: 6 },
    feedback: [{ from: "cs", to: "wit", rating: 4, comment: "Great mentors and promotion." }],
    rsvps: 63, tags: ["hackathon", "cybersecurity"],
  },

  // TechNova Club: 3 completed / 2 abandoned (by TechNova), 11 of 20 tasks on time.
  {
    id: "h-robo-rumble", title: "Robo Rumble", host: "rk", partners: ["tn"], dayOffset: -300, status: "completed",
    plans: [{ club: "rk", tasks: 3 }, { club: "tn", tasks: 4, late: 1 }], responseHours: { tn: 30 },
    feedback: [{ from: "rk", to: "tn", rating: 3, comment: "Venue was fine, communication slow." }], rsvps: 22, tags: ["robotics"],
  },
  {
    id: "h-design-sprint", title: "Design Sprint Weekend", host: "px", partners: ["tn"], dayOffset: -240, status: "completed",
    plans: [{ club: "px", tasks: 3 }, { club: "tn", tasks: 4, late: 2 }], responseHours: { tn: 52 },
    feedback: [{ from: "px", to: "tn", rating: 3, comment: "Two deliverables arrived late." }], rsvps: 19, tags: ["design"],
  },
  {
    id: "h-code-chords", title: "Code & Chords", host: "tn", partners: ["cm"], dayOffset: -190, status: "completed",
    plans: [{ club: "tn", tasks: 4, late: 1 }, { club: "cm", tasks: 3 }], responseHours: { cm: 12 },
    feedback: [{ from: "cm", to: "tn", rating: 4, comment: "Fun event overall." }], rsvps: 30, tags: ["music", "coding"],
  },
  {
    id: "h-green-hack", title: "Green Hack Day", host: "ge", partners: ["tn"], dayOffset: -130, status: "abandoned", abandonedBy: "tn",
    plans: [{ club: "ge", tasks: 3 }, { club: "tn", tasks: 4, missed: 3 }], responseHours: { tn: 40 },
    feedback: [{ from: "ge", to: "tn", rating: 1, comment: "Stopped responding two weeks before the event; we had to cancel.", again: false }],
    tags: ["sustainability", "hackathon"],
  },
  {
    id: "h-devfest-mini", title: "DevFest Mini", host: "dc", partners: ["tn"], dayOffset: -70, status: "abandoned", abandonedBy: "tn",
    plans: [{ club: "dc", tasks: 3 }, { club: "tn", tasks: 4, missed: 2 }], responseHours: { tn: 26 },
    feedback: [{ from: "dc", to: "tn", rating: 2, comment: "Venue booking never confirmed.", again: false }],
    tags: ["cloud", "web"],
  },

  // Other clubs: lighter, realistic history.
  {
    id: "h-woc-kickoff", title: "Winter of Code Kickoff", host: "cc", partners: ["nss"], dayOffset: -200, status: "completed",
    plans: [{ club: "cc", tasks: 3 }, { club: "nss", tasks: 3 }], responseHours: { nss: 5 },
    feedback: [
      { from: "nss", to: "cc", rating: 5, comment: "Very well organised." },
      { from: "cc", to: "nss", rating: 5, comment: "Volunteers were superb." },
    ], rsvps: 45, tags: ["coding"],
  },
  {
    id: "h-api-night", title: "API Hack Night", host: "cc", partners: ["dc"], dayOffset: -90, status: "completed",
    plans: [{ club: "cc", tasks: 3, late: 1 }, { club: "dc", tasks: 3 }], responseHours: { dc: 20 },
    feedback: [{ from: "dc", to: "cc", rating: 4, comment: "Smooth night, good judging platform." }], rsvps: 36, tags: ["hackathon", "web"],
  },
  {
    id: "h-fintech-pitch", title: "FinTech Pitch Day", host: "eb", partners: ["fin"], dayOffset: -250, status: "completed",
    plans: [{ club: "eb", tasks: 3 }, { club: "fin", tasks: 3 }], responseHours: { fin: 9 },
    feedback: [{ from: "fin", to: "eb", rating: 5, comment: "Excellent sponsors." }, { from: "eb", to: "fin", rating: 4, comment: "Good judges." }],
    rsvps: 33, tags: ["fintech", "startups"],
  },
  {
    id: "h-investor-connect", title: "Investor Connect", host: "fin", partners: ["eb"], dayOffset: -120, status: "completed",
    plans: [{ club: "fin", tasks: 3 }, { club: "eb", tasks: 3 }], responseHours: { eb: 7 },
    feedback: [{ from: "eb", to: "fin", rating: 5, comment: "Great investor list." }], rsvps: 29, tags: ["startups", "finance"],
  },
  {
    id: "h-ai-startups", title: "AI for Startups Meetup", host: "ai", partners: ["eb"], dayOffset: -80, status: "completed",
    plans: [{ club: "ai", tasks: 3 }, { club: "eb", tasks: 3, late: 1 }], responseHours: { eb: 15 },
    feedback: [{ from: "ai", to: "eb", rating: 4, comment: "Sponsors came through." }], rsvps: 40, tags: ["ai", "startups"],
  },
  {
    id: "h-climate-debate", title: "Climate Debate League", host: "du", partners: ["ge"], dayOffset: -230, status: "completed",
    plans: [{ club: "du", tasks: 3 }, { club: "ge", tasks: 3 }], responseHours: { ge: 11 },
    feedback: [{ from: "ge", to: "du", rating: 5, comment: "Hall and anchors were perfect." }], rsvps: 48, tags: ["debate", "climate"],
  },
  {
    id: "h-earth-week", title: "Earth Week Townhall", host: "ge", partners: ["du"], dayOffset: -60, status: "completed",
    plans: [{ club: "ge", tasks: 3 }, { club: "du", tasks: 3 }], responseHours: { du: 8 },
    feedback: [{ from: "du", to: "ge", rating: 4, comment: "Great volunteers." }], rsvps: 55, tags: ["climate", "community"],
  },
  {
    id: "h-hacktoberfest", title: "Hacktoberfest Delhi", host: "os", partners: ["wit"], dayOffset: -365, status: "completed",
    plans: [{ club: "os", tasks: 3 }, { club: "wit", tasks: 3 }], responseHours: { wit: 4 },
    feedback: [{ from: "wit", to: "os", rating: 5, comment: "Maintainers were super helpful." }], rsvps: 70, tags: ["open source"],
  },
  {
    id: "h-os-sprint", title: "Open Source Sprint", host: "os", partners: ["ai"], dayOffset: 20, status: "ongoing",
    plans: [{ club: "os", tasks: 3 }, { club: "ai", tasks: 3 }], responseHours: { ai: 18 }, rsvps: 24, tags: ["open source", "ai"], mode: "hybrid",
  },
];

/** Upcoming standalone events for the cross-campus feed. */
export const EVENT_SEEDS: { id: string; title: string; host: string; dayOffset: number; mode: EventMode; tags: string[]; description: string; rsvps: number }[] = [
  { id: "e-ctf-quals", title: "CyberSec CTF Qualifiers", host: "cs", dayOffset: 12, mode: "offline", tags: ["ctf", "cybersecurity"], description: "Jeopardy-style CTF qualifiers. Teams of up to 3. Top 20 teams go to the finals.", rsvps: 46 },
  { id: "e-pitch-night", title: "Startup Pitch Night", host: "fc", dayOffset: 18, mode: "offline", tags: ["startups", "pitching"], description: "Ten student startups pitch to alumni founders. Open to all colleges.", rsvps: 31 },
  { id: "e-design-systems", title: "Design Systems Workshop", host: "px", dayOffset: 9, mode: "online", tags: ["design", "ui"], description: "Build a component library in Figma in two hours.", rsvps: 58 },
  { id: "e-robo-wars", title: "Robo Wars Prelims", host: "rk", dayOffset: 25, mode: "hybrid", tags: ["robotics", "hardware"], description: "Preliminary rounds for the inter-college Robo Wars.", rsvps: 22 },
  { id: "e-climate-townhall", title: "Climate Townhall 2.0", host: "ge", dayOffset: 30, mode: "offline", tags: ["climate", "community"], description: "Students, NGOs and city officials talk campus sustainability.", rsvps: 37 },
  { id: "e-ml-paper-club", title: "ML Paper Reading Club", host: "ai", dayOffset: 5, mode: "online", tags: ["ai", "ml", "research"], description: "We read and discuss one recent ML paper every fortnight.", rsvps: 19 },
];

const RSVP_COLLEGES = ["GGSIPU", "NIT Delhi", "IIIT Delhi", "DTU", "NSUT", "Jamia Millia Islamia", "Delhi University", "IGDTUW", "Amity University Noida", "JIIT Noida", "Bennett University", "Shiv Nadar University"];

/** Small seeded PRNG so every seed run produces identical data. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface SeedOptions {
  now: Date;
  hostEmail?: string;
  partnerEmail?: string;
}

export function buildSeed({ now, hostEmail, partnerEmail }: SeedOptions) {
  const at = (days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * HOUR);
  const byKey = Object.fromEntries(CLUB_SEEDS.map((c) => [c.key, c]));
  const id = (key: string) => byKey[key].id;
  const rand = rng(42);

  const clubs = CLUB_SEEDS.map((c) => {
    const teamEmail = c.key === "cc" ? hostEmail || TEAM.host.email : c.key === "cs" ? partnerEmail || TEAM.partner.email : null;
    const adminEmails = teamEmail ? [teamEmail] : [];
    // Other clubs get placeholder inboxes that sendEmail() refuses to deliver to.
    const contactEmail = teamEmail ?? placeholderClubEmail(c.id);
    return {
      id: c.id,
      data: {
        name: c.name, college: c.college, collegeDomain: c.collegeDomain, city: c.city, domains: c.domains,
        description: c.description, logoURL: "", contactEmail, adminUids: [] as string[], adminEmails,
        verified: c.verified, verifiedAt: c.verified ? at(-400) : null, verifiedEmailDomain: c.verified ? c.collegeDomain : null,
        openToInstantMeets: c.openToInstantMeets ?? true, memberCount: c.memberCount, createdAt: at(-420),
      },
    };
  });

  const capabilities = CLUB_SEEDS.flatMap((c) =>
    c.caps.map((cap, i) => ({
      id: `${c.id}--${cap.type}-${i}`,
      data: {
        clubId: c.id, type: cap.type, title: cap.title, description: cap.description, city: c.city,
        capacity: cap.capacity ?? null,
        availableFrom: cap.noWindow ? null : at(-30),
        availableTo: cap.noWindow ? null : at(180),
        tags: cap.tags, active: true, createdAt: at(-300 + i),
      },
    })),
  );

  const collaborations: { id: string; data: Record<string, unknown> }[] = [];
  const tasks: { id: string; data: Record<string, unknown> }[] = [];
  const feedback: { id: string; data: Record<string, unknown> }[] = [];
  const collabRequests: { id: string; data: Record<string, unknown> }[] = [];
  const events: { id: string; data: Record<string, unknown>; rsvps: { uid: string; college: string; createdAt: Date }[] }[] = [];

  const makeRsvps = (eventId: string, count: number, created: Date) =>
    Array.from({ length: count }, (_, i) => ({
      uid: `seed-${eventId}-${i}`,
      college: RSVP_COLLEGES[Math.floor(rand() * RSVP_COLLEGES.length)],
      createdAt: created,
    }));

  for (const c of COLLAB_SEEDS) {
    const eventDate = at(c.dayOffset);
    const startedAt = at(c.dayOffset - 35);
    const clubIds = [id(c.host), ...c.partners.map(id)];
    const roles: Record<string, string> = { [id(c.host)]: "host" };
    c.partners.forEach((p) => (roles[id(p)] = "partner"));

    collaborations.push({
      id: c.id,
      data: {
        title: c.title, clubIds, hostClubId: id(c.host), compilerRequestId: null, status: c.status,
        abandonedByClubId: c.abandonedBy ? id(c.abandonedBy) : null,
        eventDate, startedAt, roles,
        endedAt: c.status === "completed" ? at(c.dayOffset + 1) : c.status === "abandoned" ? at(c.dayOffset - 6) : null,
        inactiveFlag: c.abandonedBy
          ? {
              byClubId: id(c.host), againstClubId: id(c.abandonedBy), flaggedAt: at(c.dayOffset - 8),
              disputeDeadline: at(c.dayOffset - 6), disputed: false, resolved: true,
            }
          : null,
      },
    });

    // Tasks: spread due dates over the 30 days before the event.
    let order = 0;
    for (const plan of c.plans) {
      for (let i = 0; i < plan.tasks; i++) {
        const due = at(c.dayOffset - 3 - (plan.tasks - i) * 6, 18);
        const isLate = i < (plan.late ?? 0);
        const isMissed = i >= plan.tasks - (plan.missed ?? 0);
        const upcoming = c.status === "ongoing";
        const status = isMissed ? (i % 2 ? "doing" : "todo") : upcoming ? (i === 0 ? "done" : "todo") : "done";
        const completedAt = status === "done" ? (isLate ? new Date(due.getTime() + 2 * DAY) : new Date(due.getTime() - DAY)) : null;
        tasks.push({
          id: `${c.id}--${plan.club}-${i}`,
          data: {
            collabId: c.id, title: TASK_TITLES[(order + plan.club.length) % TASK_TITLES.length],
            description: "", ownerClubId: id(plan.club),
            dueDate: upcoming ? at(c.dayOffset - (plan.tasks - i) * 4) : due,
            status, completedAt, order: order++, updatedAt: completedAt ?? startedAt,
          },
        });
      }
    }

    for (const [i, f] of (c.feedback ?? []).entries()) {
      feedback.push({
        id: `${c.id}--fb-${i}`,
        data: {
          collabId: c.id, fromClubId: id(f.from), toClubId: id(f.to), rating: f.rating, comment: f.comment,
          wouldCollabAgain: f.again ?? f.rating >= 4, createdAt: at(c.dayOffset + 3),
        },
      });
    }

    for (const p of c.partners) {
      const created = at(c.dayOffset - 40);
      const hours = c.responseHours?.[p] ?? 12;
      collabRequests.push({
        id: `${c.id}--req-${p}`,
        data: {
          fromClubId: id(c.host), toClubId: id(p), compilerRequestId: null, needId: null, capabilityId: null,
          message: `Would you like to collaborate on ${c.title}?`, subject: `Collaboration: ${c.title}`,
          status: "accepted", createdAt: created, respondedAt: new Date(created.getTime() + hours * HOUR),
          collabId: c.id, eventTitle: c.title,
        },
      });
    }

    if (c.status !== "abandoned") {
      const evId = `ev-${c.id}`;
      const rsvps = makeRsvps(evId, c.rsvps ?? 20, at(c.dayOffset - 10));
      events.push({
        id: evId,
        data: {
          title: c.title, description: `${c.title}, organised jointly by ${clubIds.map((x) => CLUB_SEEDS.find((s) => s.id === x)!.name).join(" and ")}.`,
          hostClubIds: clubIds, collabId: c.id, date: eventDate, city: byKey[c.host].city, mode: c.mode ?? "offline",
          tags: c.tags ?? [], rsvpCount: rsvps.length, createdAt: startedAt,
        },
        rsvps,
      });
    }
  }

  // A declined request to CyberSec (counts toward response time) from TechNova.
  collabRequests.push({
    id: "req-tn-cs-declined",
    data: {
      fromClubId: id("tn"), toClubId: id("cs"), compilerRequestId: null, needId: null, capabilityId: null,
      message: "Can you mentor our security meetup next week?", subject: "Mentors for security meetup",
      status: "declined", createdAt: at(-30), respondedAt: at(-30, 9), eventTitle: "Security Meetup",
    },
  });

  for (const e of EVENT_SEEDS) {
    const rsvps = makeRsvps(e.id, e.rsvps, at(-5));
    events.push({
      id: e.id,
      data: {
        title: e.title, description: e.description, hostClubIds: [id(e.host)], date: at(e.dayOffset, 10),
        city: byKey[e.host].city, mode: e.mode, tags: e.tags, rsvpCount: rsvps.length, createdAt: at(-7),
      },
      rsvps,
    });
  }

  return { clubs, capabilities, collaborations, tasks, feedback, collabRequests, events };
}

const TASK_TITLES = [
  "Finalise event agenda",
  "Confirm venue booking",
  "Share mentor list",
  "Design posters and creatives",
  "Open registrations",
  "Arrange sponsor prizes",
  "Brief volunteers",
  "Set up Wi-Fi and AV",
  "Publish promotion posts",
  "Send participant reminders",
  "Prepare certificates",
  "Collect photos and feedback",
];
