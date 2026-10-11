"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Search,
  Plus,
  CalendarDays,
  Bookmark,
  Ticket,
  LayoutGrid,
  Music2,
  Code2,
  Gamepad2,
  GraduationCap,
  Trophy,
  X,
  Bell,
  SlidersHorizontal,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PulseProvider, usePulse } from "@/components/pulse/PulseProvider";
import { ErrorBoundary } from "@/components/pulse/ErrorBoundary";
import { Hero } from "@/components/pulse/Hero";
import { TeammatesModal } from "@/components/pulse/TeammatesModal";
import { HeaderBrand } from "@/components/pulse/HeaderBrand";
import { EventCard } from "@/components/pulse/EventCard";
import { OrganizerEmptyState } from "@/components/pulse/OrganizerEmptyState";
import { EventDetails } from "@/components/pulse/EventDetails";
import { SearchModal } from "@/components/pulse/SearchModal";
import { VisionUploadModal } from "@/components/pulse/VisionUploadModal";
import { ProfileDrawer } from "@/components/pulse/ProfileDrawer";
import { TicketsModal } from "@/components/pulse/TicketsModal";
import {
  CampusEvent,
  categories,
  departments,
  initials,
} from "@/lib/pulse/events";
import { rankEvents } from "@/lib/pulse/search";
function Dashboard() {
  const hub = usePulse();
  const [view, setView] = useState("discover");
  const [category, setCategory] = useState("All events");
  const [dept, setDept] = useState("All departments");
  const [dateRange, setDateRange] = useState("All dates");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(false);
  const [upload, setUpload] = useState(false);
  const [profile, setProfile] = useState(false);
  const [tickets, setTickets] = useState(false);
  const [details, setDetails] = useState<CampusEvent | null>(null);
  const [teammates, setTeammates] = useState<CampusEvent | null>(null);
  const [filtering, setFiltering] = useState(false);
  const campusSignal = hub.events.length
    ? hub.events
        .slice(0, 5)
        .map((event) => `${event.title} · ${event.venue}`)
        .join("　 ✦　 ") + "　 ✦　 "
    : "ORGANIZER-POWERED　 ✦　 YOUR NEXT CAMPUS MOMENT STARTS HERE　 ✦　 ";
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    setFiltering(true);
    const t = setTimeout(() => setFiltering(false), 200);
    return () => clearTimeout(t);
  }, [category, dept, dateRange, view]);
  const todayKey = new Date(hub.now + 19800000).toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    const source =
      view === "registered"
        ? hub.events.filter((e) => !!hub.attendance[e.id])
        : view === "bookmarks"
          ? hub.savedEvents
          : hub.events;
    const today = new Date(todayKey + "T00:00:00+05:30").getTime();
    const day = new Date(today + 19800000).getUTCDay();
    return rankEvents(source, query).filter((e) => {
      if (category !== "All events" && e.category !== category) return false;
      if (
        dept !== "All departments" &&
        e.department !== dept &&
        e.department !== "All departments"
      )
        return false;
      const start = Date.parse(e.start);
      if (dateRange === "Today")
        return start >= today && start < today + 86400000;
      if (dateRange === "This weekend") {
        const saturday = today + (day === 0 ? -1 : 6 - day) * 86400000;
        return start >= saturday && start < saturday + 2 * 86400000;
      }
      if (dateRange === "Next week") {
        const monday = today + (8 - (day || 7)) * 86400000;
        return start >= monday && start < monday + 7 * 86400000;
      }
      return true;
    });
  }, [
    hub.events,
    hub.attendance,
    hub.saved,
    view,
    query,
    category,
    dept,
    dateRange,
    todayKey,
  ]);
  const clear = () => {
    setCategory("All events");
    setDept("All departments");
    setDateRange("All dates");
    setQuery("");
  };
  const openTickets = () => {
    setProfile(false);
    setTickets(true);
  };
  const showFeed = () =>
    setTimeout(
      () =>
        document.getElementById("events")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      50,
    );
  return (
    <Tabs value={view} onValueChange={setView} className="dashboard-tabs">
      <header className="topbar">
        <HeaderBrand />
        <button
          className="search-launch"
          onClick={() => setSearch(true)}
          aria-label="Search campus events"
        >
          <Search size={17} />
          <span>{query || "Find your next experience"}</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-actions">
          <TabsList className="top-nav" variant="line">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="registered">
              My events <small>{hub.registeredEvents.length || ""}</small>
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              Saved <small>{hub.saved.length || ""}</small>
            </TabsTrigger>
          </TabsList>
          <button
            className="header-tickets"
            aria-label="Open my tickets"
            onClick={openTickets}
          >
            <Ticket size={20} />
            {hub.registeredEvents.length > 0 && (
              <span>{hub.registeredEvents.length}</span>
            )}
          </button>
          <button
            className="avatar"
            aria-label="Open student profile"
            onClick={() => setProfile(true)}
            style={{ borderColor: hub.profile.aura }}
          >
            {initials(hub.profile.name)}
          </button>
        </div>
      </header>
      <div className="ticker">
        <b>
          <i /> CAMPUS SIGNAL
        </b>
        <div className="marquee">
          <span>{campusSignal}</span>
          <span aria-hidden="true">{campusSignal}</span>
        </div>
      </div>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">LESS SCROLLING. MORE SHOWING UP.</p>
            <h1>
              Your campus. <span>Your moment.</span>
            </h1>
            <p>
              Big ideas, late nights, unforgettable experiences. Find your
              people here.
            </p>
          </div>
          <button
            className="button secondary"
            aria-label="Post an event"
            onClick={() => setUpload(true)}
          >
            <Plus size={18} />
            <span>Post an event</span>
          </button>
        </div>
        {hub.source === "unconfigured" && (
          <div className="database-notice" role="status">
            <p>Campus feed is not connected. {hub.dataError}</p>
          </div>
        )}
        {hub.source === "error" && (
          <div className="database-notice" role="alert">
            <p>Events could not be refreshed: {hub.dataError}</p>
            <button
              className="button secondary"
              onClick={() => void hub.refreshEvents()}
            >
              Retry events
            </button>
          </div>
        )}
        {hub.activityError && (
          <p className="database-notice" role="alert">
            Your activity could not be synced: {hub.activityError}
          </p>
        )}
        {view === "discover" && (
          <Hero onTickets={openTickets} onDetails={setDetails} />
        )}
        <TabsContent value={view} className="feed-section" id="events">
          <div className="feed-heading">
            <div>
              <h2>
                {view === "bookmarks" ? (
                  <>
                    Your saved <em>moments.</em>
                  </>
                ) : view === "registered" ? (
                  <>
                    You’re on <em>the list.</em>
                  </>
                ) : (
                  <>
                    Find your <em>next thing.</em>
                  </>
                )}
              </h2>
              <p>
                {view === "bookmarks"
                  ? "Good plans deserve a place to stay."
                  : view === "registered"
                    ? "Your interested, registered and attending campus experiences."
                    : "There’s a little something for every kind of you."}
              </p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger
                className="filter-button"
                aria-label="Filter events by date"
              >
                <CalendarDays size={16} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All dates", "Today", "This weekend", "Next week"].map(
                  (d) => (
                    <SelectItem value={d} key={d}>
                      {d}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="filter-row">
            {categories.map((c, i) => {
              const Icon = [
                LayoutGrid,
                Music2,
                Code2,
                Gamepad2,
                GraduationCap,
                Trophy,
              ][i];
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={"category " + (category === c ? "active" : "")}
                >
                  <Icon size={16} />
                  {c}
                </button>
              );
            })}
            <span className="filter-divider" />
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger
                className="filter-button department-filter"
                aria-label="Filter events by department"
              >
                <SlidersHorizontal size={15} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem value={d} key={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {query && (
            <div className="active-search">
              <Search size={15} />
              <span>Matching “{query}”</span>
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            </div>
          )}
          <div className="result-caption">
            <span>
              <span className="live-dot" />
              {filtered.length}{" "}
              {filtered.length === 1 ? "experience" : "experiences"}{" "}
              {view === "discover"
                ? "around you"
                : view === "bookmarks"
                  ? "saved"
                  : "in your plans"}
            </span>
            <small>CURATED FOR THE CAMPUS. OPEN TO YOU.</small>
          </div>
          {!hub.ready || filtering ? (
            <div className="event-grid" aria-label="Loading events">
              {[0, 1, 2].map((i) => (
                <div className="skeleton-card" key={i}>
                  <Skeleton className="skeleton-art" />
                  <Skeleton className="skeleton-title" />
                  <Skeleton className="skeleton-text" />
                  <Skeleton className="skeleton-text" />
                </div>
              ))}
            </div>
          ) : !hub.events.length ? (
            (hub.source === "empty" || hub.source === "live") && (
              <OrganizerEmptyState onPost={() => setUpload(true)} />
            )
          ) : filtered.length ? (
            <div className="event-grid">
              {filtered.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  query={query}
                  onDetails={setDetails}
                  onTeammates={setTeammates}
                />
              ))}
            </div>
          ) : (
            <Empty className="feed-empty">
              <Search size={38} />
              <EmptyTitle>
                {view === "bookmarks" && !query
                  ? "Start your campus collection."
                  : view === "registered" && !query
                    ? "Your calendar has room for a moment."
                    : "No events match this combination."}
              </EmptyTitle>
              <EmptyDescription>
                {view === "bookmarks"
                  ? "Tap the bookmark on any event to keep it here."
                  : view === "registered"
                    ? "Register for a campus event to see it here."
                    : "Try a broader phrase or reset the filters."}
              </EmptyDescription>
              <button
                className="button primary"
                onClick={() => {
                  clear();
                  if (view !== "discover") setView("discover");
                }}
              >
                {" "}
                {view === "discover" ? "Reset filters" : "Discover events"}
              </button>
            </Empty>
          )}
        </TabsContent>
        <footer>
          <b>
            <Zap size={15} /> festflow
          </b>
          <span>Made for the moments between lectures.</span>
          <small>CAMPUS FEED / {new Date(hub.now).getFullYear()}</small>
        </footer>
        <p className="footer-demo">
          Organizer-published campus events. Photos: Yvette de Wit, Fahim
          Muntashir & Gavin Phillips / Unsplash.
        </p>
      </main>
      <SearchModal
        open={search}
        onClose={() => setSearch(false)}
        onSearch={(q) => {
          clear();
          setQuery(q);
          setView("discover");
          showFeed();
        }}
        onDetails={setDetails}
      />
      <VisionUploadModal
        open={upload}
        onClose={() => setUpload(false)}
        onPublished={() => {
          clear();
          setView("discover");
          showFeed();
        }}
      />
      <ProfileDrawer
        open={profile}
        onClose={() => setProfile(false)}
        onTickets={openTickets}
        onBookmarks={() => {
          setProfile(false);
          clear();
          setView("bookmarks");
        }}
      />
      <TicketsModal open={tickets} onClose={() => setTickets(false)} />
      <EventDetails
        event={
          details ? (hub.events.find((e) => e.id === details.id) ?? null) : null
        }
        onClose={() => setDetails(null)}
      />
      <TeammatesModal
        event={
          teammates
            ? (hub.events.find((e) => e.id === teammates.id) ?? null)
            : null
        }
        onClose={() => setTeammates(null)}
      />
    </Tabs>
  );
}
export default function Page() {
  return (
    <ErrorBoundary>
      <PulseProvider>
        <Dashboard />
        <Toaster richColors theme="dark" position="bottom-right" />
      </PulseProvider>
    </ErrorBoundary>
  );
}
