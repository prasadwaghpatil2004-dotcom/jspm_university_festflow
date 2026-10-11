"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Attendance,
  CampusEvent,
  defaultProfile,
  eventSchema,
  Profile,
  isValidOrganizerPin,
  statusOf,
} from "@/lib/pulse/events";
import { rankEvents } from "@/lib/pulse/search";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import {
  createPulseDatabase,
  eventChangeUpdater,
  prependEvent,
  persistentDemoUserId,
} from "@/src/lib/pulse-database";
const database = createPulseDatabase(supabase);
const KEY = "jspm-pulse-v1";
const profileSchema = z.object({
  name: z.string().min(1).max(70),
  prn: z.string().min(1).max(30),
  department: z.string().max(30),
  year: z.string().max(20),
  aura: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
const stateSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  reminders: z.array(z.string()),
  notified: z.array(z.string()),
  teamBoards: z.array(z.string()).default([]),
});
type State = z.infer<typeof stateSchema> & {
  events: CampusEvent[];
  saved: string[];
  attendance: Record<string, Attendance>;
};
type Hub = State & {
  ready: boolean;
  now: number;
  source: "loading" | "live" | "empty" | "error" | "unconfigured";
  hasLiveEvents: boolean;
  dataError: string | null;
  activityError: string | null;
  userId: string | null;
  pending: string[];
  refreshEvents: () => Promise<void>;
  toggleBookmark: (id: string) => Promise<boolean>;
  setAttendance: (id: string, status: Attendance) => Promise<boolean>;
  publish: (event: CampusEvent, deletePin: string) => Promise<boolean>;
  deleteEvent: (eventId: string, deletePin: string) => Promise<boolean>;
  updateProfile: (profile: Profile) => void;
  toggleReminder: (id: string) => Promise<void>;
  joinTeamBoard: (id: string) => void;
  registeredEvents: CampusEvent[];
  savedEvents: CampusEvent[];
};
const Context = createContext<Hub | null>(null);
export function usePulse() {
  const value = useContext(Context);
  if (!value) throw new Error("PulseProvider is required");
  return value;
}
async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 35,
      spread: 65,
      startVelocity: 18,
      origin: { y: 0.78 },
      colors: ["#8B5CF6", "#06B6D4", "#10B981", "#F97316"],
      disableForReducedMotion: true,
    });
  } catch {}
}
export function PulseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    version: 1,
    events: [],
    saved: [],
    attendance: {},
    profile: defaultProfile,
    reminders: [],
    notified: [],
    teamBoards: [],
  });
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [source, setSource] = useState<Hub["source"]>("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const eventRequest = useRef(0);
  const activityRequest = useRef(0);
  const activityWrites = useRef(0);
  const mounted = useRef(false);
  const errorText = (error: unknown) =>
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "The database request failed. Please retry.";
  const refreshEvents = useCallback(async () => {
    const request = ++eventRequest.current;
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, events: [] }));
      setSource("unconfigured");
      setDataError(
        "Add your actual Supabase URL and anon key to .env.local, then restart the development server.",
      );
      setReady(true);
      return;
    }
    try {
      const events = await database.events(AbortSignal.timeout(20000));
      if (!mounted.current || request !== eventRequest.current) return;
      setState((s) => ({
        ...s,
        events,
      }));
      setSource(events.length ? "live" : "empty");
      setDataError(null);
    } catch (error) {
      if (!mounted.current || request !== eventRequest.current) return;
      setDataError(errorText(error));
      setSource("error");
    } finally {
      if (mounted.current && request === eventRequest.current) setReady(true);
    }
  }, []);
  const refreshActivity = useCallback(async () => {
    if (!userId || !isSupabaseConfigured || locks.current.size) return;
    const request = ++activityRequest.current,
      writeVersion = activityWrites.current;
    try {
      const activity = await database.activity(
        userId,
        AbortSignal.timeout(20000),
      );
      if (
        !mounted.current ||
        request !== activityRequest.current ||
        writeVersion !== activityWrites.current
      )
        return;
      setState((s) => ({ ...s, ...activity }));
      setActivityError(null);
    } catch (error) {
      if (
        mounted.current &&
        request === activityRequest.current &&
        writeVersion === activityWrites.current
      )
        setActivityError(errorText(error));
    }
  }, [userId]);
  const writeWarned = useRef(false);
  const latest = useRef<Hub | null>(null);
  useEffect(() => {
    mounted.current = true;
    let restored: z.infer<typeof stateSchema> | undefined;
    try {
      const data = localStorage.getItem(KEY);
      if (data) {
        const result = stateSchema.safeParse(JSON.parse(data));
        if (result.success) {
          restored = result.data;
        } else
          toast.info(
            "Your saved demo data was reset because it could not be read.",
          );
      }
    } catch {
      toast.info("Saved data is unavailable. Your session still works.");
    }
    if (restored) setState((s) => ({ ...s, ...restored }));
    try {
      setUserId(persistentDemoUserId(localStorage));
    } catch {
      setActivityError(
        "Device storage is blocked. Enable it to keep your student identity and sync bookmarks.",
      );
    }
    void refreshEvents();
    return () => {
      mounted.current = false;
      eventRequest.current++;
      activityRequest.current++;
    };
  }, [refreshEvents]);
  useEffect(() => {
    void refreshActivity();
  }, [refreshActivity]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel("events-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          if (!mounted.current) return;
          // Apply the server record immediately; invalidate older reads and then reconcile.
          eventRequest.current++;
          try {
            const update = eventChangeUpdater(payload);
            setState((s) => ({ ...s, events: update(s.events) }));
            setSource("live");
            setDataError(null);
            setReady(true);
          } catch {
            // Incomplete replica payloads are resolved by the authoritative query below.
          }
          void refreshEvents();
        },
      );
    if (userId)
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshActivity();
        },
      );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void refreshEvents();
        void refreshActivity();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        toast.warning(
          "Live updates are disconnected. Refresh or return to this tab to retry.",
        );
    });
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void refreshEvents();
        void refreshActivity();
      }
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId, refreshEvents, refreshActivity]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(stateSchema.parse(state)));
      writeWarned.current = false;
    } catch {
      if (!writeWarned.current) {
        toast.error(
          "Device storage is full or blocked. Changes will last for this session only.",
        );
        writeWarned.current = true;
      }
    }
  }, [state, ready]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tick);
  }, []);
  async function changeActivity(id: string, status?: Attendance) {
    const currentHub = latest.current;
    const event = currentHub?.events.find((e) => e.id === id);
    if (!event || !currentHub || locks.current.has(id)) return false;
    if (!isSupabaseConfigured || !userId) {
      toast.error(
        "Configure Supabase and enable device storage to sync activity.",
      );
      return false;
    }
    if (!z.string().uuid().safeParse(id).success) {
      toast.info(
        "This event has no valid database ID. Refresh the feed and try again.",
      );
      return false;
    }
    const adding = !!status || !currentHub.saved.includes(id);
    const nextStatus = status || "Interested";
    if (status && statusOf(event) === "COMPLETED") {
      toast.info("This event has finished.");
      return false;
    }
    const current = currentHub.attendance[id];
    if (
      status &&
      status !== "Interested" &&
      event.registered >= event.capacity &&
      current !== "Registered" &&
      current !== "Attending"
    ) {
      toast.error("This event is at capacity.");
      return false;
    }
    const previous = { saved: currentHub.saved.includes(id), status: current };
    locks.current.add(id);
    activityWrites.current++;
    activityRequest.current++;
    setPending([...locks.current]);
    const apply = (saved: boolean, attendance?: Attendance) =>
      setState((s) => {
        const next = { ...s.attendance };
        if (attendance) next[id] = attendance;
        else delete next[id];
        return {
          ...s,
          saved: saved
            ? [...new Set([...s.saved, id])]
            : s.saved.filter((x) => x !== id),
          attendance: next,
        };
      });
    apply(adding, adding ? nextStatus : undefined);
    try {
      if (status) await database.attendance(userId, id, status);
      else if (adding) await database.bookmark(userId, id);
      else await database.removeBookmark(userId, id);
      toast.success(
        status
          ? `${status} status synced`
          : adding
            ? "Bookmark saved to Supabase"
            : "Bookmark and attendance removed",
      );
      if (adding) void celebrate();
      return true;
    } catch (error) {
      if (mounted.current) apply(previous.saved, previous.status);
      toast.error("Activity could not be saved: " + errorText(error));
      return false;
    } finally {
      locks.current.delete(id);
      activityWrites.current++;
      if (mounted.current) {
        setPending([...locks.current]);
        void refreshActivity();
      }
    }
  }
  async function toggleBookmark(id: string) {
    return changeActivity(id);
  }
  async function setAttendance(id: string, status: Attendance) {
    return changeActivity(id, status);
  }
  async function publish(event: CampusEvent, deletePin: string) {
    if (!isSupabaseConfigured) {
      toast.error("Add your real Supabase URL and anon key before publishing.");
      return false;
    }
    const parsed = eventSchema.safeParse(event);
    if (
      !parsed.success ||
      Date.parse(event.end) <= Date.parse(event.start) ||
      event.registered > event.capacity ||
      !isValidOrganizerPin(deletePin)
    ) {
      toast.error("Check the event details before publishing.");
      return false;
    }
    try {
      const published = await database.publish(parsed.data, deletePin);
      // Invalidate an older fetch so it cannot replace a newly published card.
      eventRequest.current++;
      setState((s) => ({
        ...s,
        events: prependEvent(s.events, published),
      }));
      setSource("live");
      setDataError(null);
      setReady(true);
      toast.success("Event published to campus feed!");
      void celebrate();
      return true;
    } catch (error) {
      toast.error("Publishing failed: " + errorText(error));
      return false;
    }
  }
  async function deleteEvent(id: string, deletePin: string) {
    if (!isSupabaseConfigured)
      throw new Error("Configure Supabase before deleting events.");
    if (!isValidOrganizerPin(deletePin))
      throw new Error("Organizer PIN must be 4 to 6 digits.");
    const deleted = await database.deleteEvent(id, deletePin);
    if (!deleted) return false;
    eventRequest.current++;
    setState((s) => ({
      ...s,
      events: s.events.filter((event) => event.id !== id),
      saved: s.saved.filter((eventId) => eventId !== id),
      attendance: Object.fromEntries(
        Object.entries(s.attendance).filter(([eventId]) => eventId !== id),
      ),
      reminders: s.reminders.filter((eventId) => eventId !== id),
      notified: s.notified.filter((eventId) => eventId !== id),
      teamBoards: s.teamBoards.filter((eventId) => eventId !== id),
    }));
    if (state.events.every((event) => event.id === id)) {
      setSource("empty");
      setDataError(null);
    }
    toast.success("Event deleted.");
    return true;
  }
  function updateProfile(profile: Profile) {
    const r = profileSchema.safeParse(profile);
    if (!r.success) {
      toast.error("Check your name and PRN.");
      return;
    }
    setState((s) => ({ ...s, profile: r.data }));
    toast.success("Profile updated");
  }
  function joinTeamBoard(id: string) {
    const event = state.events.find((e) => e.id === id);
    if (!event || !["Hackathons", "Gaming/LAN"].includes(event.category))
      return;
    setState((s) => ({
      ...s,
      teamBoards: s.teamBoards.includes(id)
        ? s.teamBoards
        : [...s.teamBoards, id],
    }));
    toast.success("Added to the demo teammate board on this device");
  }
  async function toggleReminder(id: string) {
    if (state.reminders.includes(id)) {
      setState((s) => ({
        ...s,
        reminders: s.reminders.filter((x) => x !== id),
      }));
      toast.info("Browser reminder turned off");
      return;
    }
    if (!("Notification" in window)) {
      toast.error(
        "This browser does not support notifications. Use the calendar reminder instead.",
      );
      return;
    }
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        toast.info(
          "Notifications weren’t enabled. Calendar exports include a 1-hour reminder.",
        );
        return;
      }
      setState((s) => ({
        ...s,
        reminders: [...s.reminders, id],
        notified: s.notified.filter((x) => x !== id),
      }));
      toast.success("1-hour reminder enabled. Keep this tab open.");
    } catch {
      toast.info(
        "Browser reminders are unavailable here. Export the calendar file for a reminder.",
      );
    }
  }
  useEffect(() => {
    if (
      !ready ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const due = state.events.filter(
      (e) =>
        state.reminders.includes(e.id) &&
        !state.notified.includes(e.id) &&
        Date.parse(e.start) - now <= 3600000 &&
        Date.parse(e.start) > now,
    );
    for (const e of due) {
      try {
        new Notification(e.title + " starts soon", {
          body: e.venue + " · Starts within 1 hour",
          tag: e.id,
          icon: "/favicon.svg",
        });
      } catch {
        toast.info(e.title + " starts within 1 hour");
      }
    }
    if (due.length)
      setState((s) => ({
        ...s,
        notified: [...s.notified, ...due.map((e) => e.id)],
      }));
  }, [Math.floor(now / 15000), state.reminders, state.notified, ready]);
  const hub: Hub = {
    ...state,
    ready,
    now,
    source,
    hasLiveEvents: state.events.length > 0,
    dataError,
    activityError,
    userId,
    pending,
    refreshEvents,
    toggleBookmark,
    setAttendance,
    publish,
    deleteEvent,
    updateProfile,
    toggleReminder,
    joinTeamBoard,
    registeredEvents: state.events.filter((e) =>
      ["Registered", "Attending"].includes(state.attendance[e.id] || ""),
    ),
    savedEvents: state.events.filter((e) => state.saved.includes(e.id)),
  };
  latest.current = hub;
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const register = (tool: Tool) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: "search_campus_events",
      description:
        "Search JSPM campus events by natural-language keywords. Read-only.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", maxLength: 200 } },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        const r = z
          .object({ query: z.string().max(200) })
          .strict()
          .parse(input);
        return rankEvents(latest.current?.events ?? [], r.query).map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          venue: e.venue,
        }));
      },
    });
    register({
      name: "bookmark_campus_events",
      description:
        "Save existing live events to the student bookmarks in Supabase.",
      inputSchema: {
        type: "object",
        properties: {
          eventIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 20,
          },
        },
        required: ["eventIds"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const r = z
          .object({ eventIds: z.array(z.string()).min(1).max(20) })
          .strict()
          .parse(input);
        if (
          !latest.current?.ready ||
          r.eventIds.some(
            (id) => !latest.current?.events.some((e) => e.id === id),
          )
        )
          throw Error("Unknown event or events are still loading");
        const saved: string[] = [],
          failed: string[] = [];
        for (const id of [...new Set(r.eventIds)]) {
          if (latest.current?.saved.includes(id)) {
            saved.push(id);
            continue;
          }
          if (await latest.current?.toggleBookmark(id)) saved.push(id);
          else failed.push(id);
        }
        return { saved, failed };
      },
    });
    return () => life.abort();
  }, []);
  return <Context.Provider value={hub}>{children}</Context.Provider>;
}
