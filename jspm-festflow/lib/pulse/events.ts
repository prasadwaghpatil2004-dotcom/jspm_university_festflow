import { z } from "zod";
export const categories = [
  "All events",
  "Cultural",
  "Hackathons",
  "Gaming/LAN",
  "Workshops",
  "Sports",
] as const;
export const departments = [
  "All departments",
  "CSE/IT",
  "Mech",
  "E&TC",
  "MBA",
  "Pharmacy",
] as const;
export const eventSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  category: z.enum([
    "Cultural",
    "Hackathons",
    "Gaming/LAN",
    "Workshops",
    "Sports",
  ]),
  department: z.enum([
    "All departments",
    "CSE/IT",
    "Mech",
    "E&TC",
    "MBA",
    "Pharmacy",
  ]),
  start: z.string().datetime(),
  end: z.string().datetime(),
  venue: z.string().min(2).max(100),
  description: z.string().min(5).max(1200),
  organizer: z.string().max(100),
  eligibility: z.string().max(250),
  prize: z.string().max(100),
  capacity: z.number().int().min(1).max(100000),
  registered: z.number().int().min(0),
  rules: z.string().max(500),
  registrationLink: z.string().max(500),
  accent: z.enum(["cyan", "violet", "orange", "lime"]),
  poster: z.string().optional(),
  headline: z.string().max(100),
  free: z.boolean().optional(),
});
export type CampusEvent = z.infer<typeof eventSchema>;
export type Attendance = "Interested" | "Registered" | "Attending";
export type Profile = {
  name: string;
  prn: string;
  department: string;
  year: string;
  aura: string;
};
export const defaultProfile: Profile = {
  name: "Aryan Kulkarni",
  prn: "JSPM2024CS0142",
  department: "CSE/IT",
  year: "Year 3",
  aura: "#8B5CF6",
};
export function statusOf(e: CampusEvent, now = Date.now()) {
  if (now >= Date.parse(e.end)) return "COMPLETED";
  if (now >= Date.parse(e.start)) return "LIVE NOW";
  if (Date.parse(e.start) - now < 86400000 || e.registered / e.capacity > 0.85)
    return "CLOSING SOON";
  return "UPCOMING";
}
export function isValidOrganizerPin(value: string) {
  return /^\d{4,6}$/.test(value);
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" },
) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...options,
  }).format(new Date(date));
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JP"
  );
}
