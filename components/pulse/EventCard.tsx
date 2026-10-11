"use client";
import {
  Bookmark,
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  Check,
  CalendarPlus,
  Code2,
  Gamepad2,
  Music2,
  GraduationCap,
  MessageCircle,
  Camera,
  Link2,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CampusEvent,
  formatDate,
  isExternalHttpUrl,
  statusOf,
} from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { Highlight } from "./Highlight";
import { Progress } from "@/components/ui/progress";

export function EventCard({
  event,
  query,
  onDetails,
  onTeammates,
}: {
  event: CampusEvent;
  query: string;
  onDetails: (e: CampusEvent) => void;
  onTeammates: (e: CampusEvent) => void;
}) {
  const hub = usePulse();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const saved = hub.saved.includes(event.id);
  const attending = hub.attendance[event.id];
  const isRegistered = attending === "Registered" || attending === "Attending";
  const total = event.registered;
  const filled = Math.min(100, Math.max(0, (total / event.capacity) * 100));
  const [progressReady, setProgressReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgressReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const theme =
    event.category === "Hackathons"
      ? "emerald"
      : event.category === "Gaming/LAN"
        ? "violet"
        : event.category === "Cultural"
          ? "amber"
          : event.accent;
  const syncing = hub.pending.includes(event.id);
  const status = statusOf(event, hub.now);
  const CategoryIcon =
    event.category === "Hackathons"
      ? Code2
      : event.category === "Gaming/LAN"
        ? Gamepad2
        : event.category === "Cultural"
          ? Music2
          : event.category === "Sports"
            ? Trophy
            : GraduationCap;
  async function confirmDelete(e: FormEvent) {
    e.preventDefault();
    if (deleting) return;
    if (!/^\d{4,6}$/.test(deletePin)) {
      setDeleteError("Enter a valid 4-6 digit PIN.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const deleted = await hub.deleteEvent(event.id, deletePin);
      if (!deleted) {
        setDeleteError(
          "Incorrect PIN. Only the organizer can delete this event.",
        );
        return;
      }
      setDeleteOpen(false);
      setDeletePin("");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? "Could not delete event: " + error.message
          : "Could not delete event. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <article
      className={"event-card frosted-surface theme-" + theme}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--card-x",
          `${e.clientX - r.left}px`,
        );
        e.currentTarget.style.setProperty("--card-y", `${e.clientY - r.top}px`);
        if (window.matchMedia("(prefers-reduced-motion:reduce)").matches)
          return;
        const x = (e.clientX - r.left) / r.width - 0.5,
          y = (e.clientY - r.top) / r.height - 0.5;
        e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-4px)`;
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "";
      }}
    >
      <div className={"event-art " + theme}>
        {event.poster && <img src={event.poster} alt="" loading="lazy" />}
        <div className="art-shade" />
        <span className="event-type">
          <CategoryIcon size={13} />
          {event.category}
        </span>
        <CategoryIcon className="category-icon-ambient" aria-hidden="true" />
        <button
          className={"save-button " + (saved ? "saved" : "")}
          aria-label={
            (saved ? "Remove bookmark for " : "Bookmark ") + event.title
          }
          aria-pressed={saved}
          onClick={() => hub.toggleBookmark(event.id)}
          disabled={syncing}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          {saved && <span className="bookmark-pop" />}
        </button>
        <span className="poster-kicker">FESTFLOW PRESENTS</span>
        <strong>{event.headline}</strong>
        <span className="poster-meta">
          {formatDate(event.start).toUpperCase()} / JSPM UNIVERSITY
        </span>
      </div>
      <div className="event-content">
        <div className="event-date">
          <CalendarDays size={14} />
          {formatDate(event.start).toUpperCase()} ·{" "}
          {formatDate(event.start, {
            hour: "2-digit",
            minute: "2-digit",
          }).toUpperCase()}
          <span>
            {event.free === undefined
              ? "CAMPUS EVENT"
              : event.free
                ? "FREE ENTRY"
                : "TICKETED"}
          </span>
        </div>
        <h3>
          <Highlight text={event.title} query={query} />
        </h3>
        <p>
          <MapPin size={15} />
          <Highlight text={event.venue} query={query} />
          {(event.category === "Hackathons" ||
            event.category === "Gaming/LAN") && (
            <button
              className="teammate-pill"
              onClick={() => onTeammates(event)}
            >
              + Find Teammates
            </button>
          )}
        </p>
        <div
          className={
            "event-status " + status.toLowerCase().replaceAll(" ", "-")
          }
        >
          <span className="status-dot" />
          {status}
          {event.department !== "All departments" && (
            <span className="department-tag">{event.department}</span>
          )}
        </div>
        {(isExternalHttpUrl(event.registrationUrl) ||
          isExternalHttpUrl(event.whatsappUrl) ||
          isExternalHttpUrl(event.instagramUrl)) && (
          <div className="event-social-links">
            {isExternalHttpUrl(event.registrationUrl) && (
              <a
                className="event-social-badge official"
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Link2 size={13} aria-hidden="true" />
                {event.registrationLabel.trim() || "Register Here"}
              </a>
            )}
            {isExternalHttpUrl(event.whatsappUrl) && (
              <a
                className="event-social-badge whatsapp"
                href={event.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={13} aria-hidden="true" />
                Join WhatsApp
              </a>
            )}
            {isExternalHttpUrl(event.instagramUrl) && (
              <a
                className="event-social-badge instagram"
                href={event.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Camera size={13} aria-hidden="true" />
                Instagram
              </a>
            )}
          </div>
        )}
        <p className="event-snippet">
          <Highlight text={event.description} query={query} />
        </p>
        <div className="prize-preview">
          <Trophy size={14} />
          <Highlight text={event.prize} query={query} />
        </div>
        <div className="capacity">
          <span>
            <Users size={14} />
            {total.toLocaleString("en-IN")} registered
          </span>
          <b>{Math.round(filled)}% filled</b>
        </div>
        <Progress
          className={
            "capacity-track " +
            (progressReady ? "progress-ready" : "progress-entering")
          }
          value={filled}
          aria-label={"Registration capacity for " + event.title}
          aria-valuetext={`${Math.round(filled)}% filled, ${total} of ${event.capacity} registered`}
        />
        <p className="capacity-note">
          {status === "COMPLETED"
            ? "Event completed"
            : total >= event.capacity
              ? "All spots filled"
              : `${event.capacity - total} spots left`}{" "}
          <span>{event.capacity.toLocaleString("en-IN")} total spots</span>
        </p>
        <div className="event-actions">
          <button className="button secondary" onClick={() => onDetails(event)}>
            View event
          </button>
          <button
            type="button"
            className="delete-event-button"
            aria-label={"Delete " + event.title}
            title="Delete event"
            onClick={() => {
              setDeleteError("");
              setDeletePin("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
          <button
            className={"interest-button " + (attending ? "going-active" : "")}
            aria-pressed={!!attending}
            aria-busy={syncing}
            aria-label={
              attending
                ? "Going to " + event.title + "; remove interest"
                : "Interested in " + event.title
            }
            disabled={status === "COMPLETED" || syncing}
            onClick={() =>
              attending
                ? void hub.toggleBookmark(event.id)
                : void hub.setAttendance(event.id, "Interested")
            }
          >
            {syncing ? (
              "Syncing…"
            ) : attending ? (
              <>
                <Check size={14} aria-hidden="true" /> Going
              </>
            ) : (
              "+ Interested"
            )}
          </button>
        </div>
        {isRegistered && (
          <button className="card-calendar" onClick={() => onDetails(event)}>
            <Check size={13} /> Pass ready <CalendarPlus size={13} /> Sync
            calendar
          </button>
        )}
      </div>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteOpen(open);
            if (!open) {
              setDeleteError("");
              setDeletePin("");
            }
          }
        }}
      >
        <DialogContent className="pulse-modal organizer-delete-modal">
          <DialogTitle className="modal-title">Delete event</DialogTitle>
          <DialogDescription>
            Enter Organizer PIN to delete this event
          </DialogDescription>
          <form onSubmit={confirmDelete} className="organizer-delete-form">
            <label>
              Organizer PIN
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                minLength={4}
                maxLength={6}
                value={deletePin}
                autoComplete="current-password"
                required
                aria-invalid={!!deleteError}
                aria-describedby={deleteError ? "delete-event-error" : undefined}
                onChange={(e) => {
                  setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setDeleteError("");
                }}
              />
            </label>
            {deleteError && (
              <p className="delete-event-error" id="delete-event-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="organizer-delete-actions">
              <button
                type="button"
                className="button secondary"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="confirm-delete-button"
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}
