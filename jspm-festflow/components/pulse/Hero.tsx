"use client";
import { useState } from "react";
import {
  Sparkles,
  Ticket,
  CalendarDays,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { CampusEvent, formatDate, statusOf } from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdown } from "@/hooks/use-countdown";
export function Hero({
  onTickets,
  onDetails,
}: {
  onTickets: () => void;
  onDetails: (e: CampusEvent) => void;
}) {
  const hub = usePulse();
  const [slide, setSlide] = useState(0);
  const featured = hub.events.slice(0, 3);
  const currentSlide = slide % Math.max(featured.length, 1);
  const event = featured[currentSlide];
  const { remaining: left, values: parts } = useCountdown(event?.start);
  if (!event && hub.ready) return null;
  if (!event)
    return (
      <section className="spotlight-grid">
        <Skeleton className="hero" />
        <Skeleton className="campus-card" />
      </section>
    );
  const titleParts = event.title.match(/^(.*?)\s+(20\d{2})$/);
  const names = titleParts
    ? [titleParts[1].toUpperCase(), titleParts[2]]
    : [event.title.toUpperCase(), ""];
  const subtitle =
    event.description.length > 80
      ? event.description.slice(0, 77).trimEnd() + "…"
      : event.description;
  const status = hub.attendance[event.id];
  const cultural = event.category === "Cultural";
  return (
    <section className="spotlight-grid">
      <div
        className="hero"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
          e.currentTarget.style.setProperty("--my", e.clientY - r.top + "px");
        }}
      >
        <img
          className="hero-image"
          src={
            cultural
              ? "/images/concert.jpg"
              : event.poster || "/images/hackathon.jpg"
          }
          alt={
            cultural
              ? "Festival crowd under atmospheric stage lights"
              : "Students at a campus technology event"
          }
        />
        <div className="hero-shade" />
        <div className="hero-copy" key={event.id}>
          <span className="glass-badge">
            <Sparkles size={14} /> THE CAMPUS HEADLINER
          </span>
          <p className="hero-edition">{event.headline}</p>
          <h2>
            {names[0]}
            <span>
              {names[1]} <em>✳</em>
            </span>
          </h2>
          <p>{subtitle}</p>
          <div className="hero-meta">
            <span>
              <CalendarDays size={16} /> {formatDate(event.start).toUpperCase()}
            </span>
            <span>
              <MapPin size={16} /> {event.venue.toUpperCase()}
            </span>
          </div>
          <button
            className="button primary"
            disabled={
              statusOf(event, hub.now) === "COMPLETED" ||
              hub.pending.includes(event.id)
            }
            onClick={() =>
              status === "Registered" || status === "Attending"
                ? onTickets()
                : hub.setAttendance(event.id, "Registered")
            }
          >
            <Ticket size={17} />
            {status === "Registered" || status === "Attending"
              ? "View your pass"
              : "Grab your pass"}
          </button>
          <button className="hero-details" onClick={() => onDetails(event)}>
            Event details
          </button>
        </div>
        <div className="countdown">
          <small>
            {left ? "THE COUNTDOWN IS ON" : statusOf(event, hub.now)}
          </small>
          <div>
            {parts.map((p, i) => (
              <span className="countdown-unit" key={i}>
                <b>{String(p).padStart(2, "0")}</b>
                <small>{["Days", "Hours", "Minutes", "Seconds"][i]}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            <b>{event.registered.toLocaleString("en-IN")}</b> registrations
          </span>
          <div className="slide-controls">
            <button
              aria-label="Previous spotlight"
              onClick={() =>
                setSlide((s) => (s + featured.length - 1) % featured.length)
              }
            >
              <ChevronLeft size={15} />
            </button>
            {featured.map((e, i) => (
              <button
                key={e.id}
                aria-label={"Show " + e.title}
                aria-pressed={i === currentSlide}
                className={
                  "slide-dot " + (i === currentSlide ? "selected" : "")
                }
                onClick={() => setSlide(i)}
              />
            ))}
            <button
              aria-label="Next spotlight"
              onClick={() => setSlide((s) => (s + 1) % featured.length)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
      <aside className="side-stack">
        <div className="campus-card">
          <div className="card-topline">
            <span className="eyebrow">YOUR CAMPUS, IN MOTION</span>
            <Zap size={18} />
          </div>
          <h3>
            Make room for
            <br />
            something <em>epic.</em>
          </h3>
          <div className="campus-stats">
            <span>
              <strong>
                {hub.events.filter((e) => Date.parse(e.end) > hub.now).length}
              </strong>
              Upcoming events
            </span>
            <span>
              <strong>
                {hub.events
                  .reduce((total, e) => total + e.registered, 0)
                  .toLocaleString("en-IN")}
              </strong>
              Registrations
            </span>
          </div>
          <p className="online-note">
            <span className="live-dot" /> THE PULSE IS STRONG
          </p>
        </div>
        <div className="ticket-card">
          <Ticket />
          <div>
            <h3>Your next memory is waiting.</h3>
            <p>
              {hub.registeredEvents.length
                ? `${hub.registeredEvents.length} passes in your pocket.`
                : "Keep your passes in one place."}
            </p>
          </div>
          <button className="text-button" onClick={onTickets}>
            My tickets
          </button>
        </div>
      </aside>
    </section>
  );
}
