import { z } from "zod";
import { type SupabaseClient } from "@supabase/supabase-js";
import {
  eventSchema,
  type Attendance,
  type CampusEvent,
} from "../../lib/pulse/events";

export const DEMO_ID_KEY = "jspm_student_user_id";
export function persistentDemoUserId(
  storage: Pick<Storage, "getItem" | "setItem">,
) {
  const existing = storage.getItem(DEMO_ID_KEY);
  if (existing?.trim() && existing.length <= 100) return existing;
  const id = crypto.randomUUID();
  storage.setItem(DEMO_ID_KEY, id);
  return id;
}

const rowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  tagline: z.string().nullable().optional(),
  category: eventSchema.shape.category,
  venue: z.string(),
  start_date: z.string(),
  total_capacity: z.number().int().positive(),
  registered_count: z.number().int().nonnegative(),
  image_url: z.string().nullable().optional(),
});
const eventColumns =
  "id,title,tagline,category,venue,start_date,total_capacity,registered_count,image_url";
const statuses = {
  interested: "Interested",
  registered: "Registered",
  attending: "Attending",
} as const;
const bookmarkSchema = z.object({
  user_id: z.string(),
  event_id: z.string().uuid(),
  status: z.enum(["interested", "registered", "attending"]),
});

export function eventFromRow(value: unknown): CampusEvent {
  const row = rowSchema.parse(value);
  const start = new Date(row.start_date);
  if (!Number.isFinite(start.getTime()))
    throw new Error("An event has an invalid start_date.");
  const summary = row.tagline?.trim();
  const description =
    summary && summary.length >= 5
      ? summary
      : summary
        ? summary + " · JSPM campus event."
        : "Join this JSPM campus event. Contact the organizer for more details.";
  return eventSchema.parse({
    id: row.id,
    title: row.title.slice(0, 100),
    category: row.category,
    venue: row.venue,
    start: start.toISOString(),
    end: new Date(start.getTime() + 3 * 3600000).toISOString(),
    capacity: row.total_capacity,
    registered: row.registered_count,
    description: description.slice(0, 1200),
    headline: (row.tagline || row.title).slice(0, 100),
    department: "All departments",
    organizer: "JSPM Student Club",
    eligibility: "Contact the organizer",
    prize: "Details from the organizer",
    rules: "Bring your student ID and follow the organizer’s guidelines.",
    registrationLink: "",
    accent:
      row.category === "Sports"
        ? "lime"
        : row.category === "Hackathons"
          ? "cyan"
          : row.category === "Cultural"
            ? "orange"
            : "violet",
    poster: row.image_url || undefined,
  });
}
export function eventToRow(event: CampusEvent) {
  const valid = eventSchema.parse(event);
  return {
    title: valid.title,
    tagline: valid.description,
    category: valid.category,
    venue: valid.venue,
    start_date: valid.start,
    total_capacity: valid.capacity,
    registered_count: 0,
    image_url: valid.poster || null,
  };
}
export function activityFromRows(values: unknown[], userId: string) {
  const saved: string[] = [],
    attendance: Record<string, Attendance> = {};
  for (const value of values) {
    const row = bookmarkSchema.parse(value);
    if (row.user_id !== userId) throw new Error("Unexpected bookmark owner.");
    saved.push(row.event_id);
    attendance[row.event_id] = statuses[row.status];
  }
  return { saved: [...new Set(saved)], attendance };
}
export function databaseStatus(status: Attendance) {
  return status.toLowerCase() as keyof typeof statuses;
}

export function prependEvent(events: CampusEvent[], event: CampusEvent) {
  return [event, ...events.filter((existing) => existing.id !== event.id)];
}

export function eventChangeUpdater(payload: {
  eventType: string;
  new: unknown;
  old: { id?: unknown };
}) {
  if (payload.eventType === "DELETE")
    return (events: CampusEvent[]) =>
      events.filter((event) => event.id !== payload.old.id);
  const event = eventFromRow(payload.new);
  if (payload.eventType === "INSERT")
    return (events: CampusEvent[]) => prependEvent(events, event);
  if (payload.eventType === "UPDATE")
    return (events: CampusEvent[]) =>
      events.some((existing) => existing.id === event.id)
        ? events.map((existing) =>
            existing.id === event.id ? event : existing,
          )
        : prependEvent(events, event);
  return (events: CampusEvent[]) => events;
}

// Keep all database columns and writes here, separate from presentation models.
export function createPulseDatabase(client: SupabaseClient) {
  return {
    async events(signal?: AbortSignal) {
      let query = client
        .from("events")
        .select(eventColumns)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(eventFromRow);
    },
    async activity(userId: string, signal?: AbortSignal) {
      let query = client.from("bookmarks").select("*").eq("user_id", userId);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      return activityFromRows(data ?? [], userId);
    },
    async publish(event: CampusEvent, deletePin: string) {
      if (!/^\d{4,6}$/.test(deletePin))
        throw new Error("Organizer PIN must be 4 to 6 digits.");
      const { data, error } = await client
        .from("events")
        .insert([{ ...eventToRow(event), delete_pin: deletePin }])
        .select(eventColumns)
        .abortSignal(AbortSignal.timeout(20000))
        .single();
      if (error) throw error;
      return eventFromRow(data);
    },
    async deleteEvent(eventId: string, deletePin: string) {
      if (!/^\d{4,6}$/.test(deletePin))
        throw new Error("Organizer PIN must be 4 to 6 digits.");
      const { data, error } = await client
        .from("events")
        .delete()
        .match({ id: eventId, delete_pin: deletePin })
        .select("id")
        .abortSignal(AbortSignal.timeout(20000));
      if (error) throw error;
      return (data ?? []).some((row) => row.id === eventId);
    },
    async bookmark(userId: string, eventId: string) {
      const { error } = await client
        .from("bookmarks")
        .insert([{ user_id: userId, event_id: eventId, status: "interested" }])
        .abortSignal(AbortSignal.timeout(20000));
      if (error) throw error;
    },
    async removeBookmark(userId: string, eventId: string) {
      const { error, data } = await client
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .select("event_id")
        .abortSignal(AbortSignal.timeout(20000));
      if (error) throw error;
      if (!data?.length)
        throw new Error(
          "Bookmark was not removed. Check DELETE and SELECT policies.",
        );
    },
    async attendance(userId: string, eventId: string, status: Attendance) {
      const { error } = await client
        .from("bookmarks")
        .upsert(
          {
            user_id: userId,
            event_id: eventId,
            status: databaseStatus(status),
          },
          { onConflict: "user_id,event_id" },
        )
        .abortSignal(AbortSignal.timeout(20000));
      if (error) throw error;
    },
  };
}
