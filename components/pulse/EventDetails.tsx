"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CampusEvent,
  Attendance,
  formatDate,
  statusOf,
} from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { CalendarSyncButton } from "./CalendarSyncButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, CalendarDays, Bookmark, Trophy, Users } from "lucide-react";
export function EventDetails({
  event,
  onClose,
}: {
  event: CampusEvent | null;
  onClose: () => void;
}) {
  const hub = usePulse();
  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="pulse-modal details-modal">
        {event && (
          <>
            <span className={"detail-category " + event.accent}>
              {event.category} / {statusOf(event, hub.now)}
            </span>
            <DialogTitle className="modal-title">{event.title}</DialogTitle>
            <DialogDescription>{event.description}</DialogDescription>
            <div className="detail-info">
              <span>
                <CalendarDays size={17} />
                {formatDate(event.start, {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                <br />
                {formatDate(event.start, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                –{" "}
                {formatDate(event.end, { hour: "2-digit", minute: "2-digit" })}{" "}
                IST
              </span>
              <span>
                <MapPin size={17} />
                {event.venue}, JSPM University, Pune
              </span>
              <span>
                <Trophy size={17} />
                {event.prize}
              </span>
              <span>
                <Users size={17} />
                {event.eligibility}
              </span>
            </div>
            <div className="detail-rules">
              <h3>Before you show up</h3>
              <p>{event.rules}</p>
              <small>Hosted by {event.organizer}</small>
            </div>
            {event.registrationLink &&
              /^https?:\/\//.test(event.registrationLink) && (
                <a
                  className="button secondary"
                  href={event.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Organizer registration page
                </a>
              )}
            <div className="registration-panel">
              <h3>Your campus plan</h3>
              <RadioGroup
                value={hub.attendance[event.id] || ""}
                onValueChange={(v) =>
                  hub.setAttendance(event.id, v as Attendance)
                }
                className="attendance-rack"
                disabled={
                  statusOf(event, hub.now) === "COMPLETED" ||
                  hub.pending.includes(event.id)
                }
              >
                {(
                  ["Interested", "Registered", "Attending"] as Attendance[]
                ).map((s) => (
                  <label
                    key={s}
                    className={"attendance-option " + s.toLowerCase()}
                  >
                    <RadioGroupItem value={s} id={event.id + s} />
                    {s}
                  </label>
                ))}
              </RadioGroup>
              <button
                className="text-button bookmark-detail"
                onClick={() => hub.toggleBookmark(event.id)}
                disabled={hub.pending.includes(event.id)}
              >
                <Bookmark
                  size={15}
                  fill={hub.saved.includes(event.id) ? "currentColor" : "none"}
                />
                {hub.saved.includes(event.id)
                  ? "Saved to bookmarks"
                  : "Save to bookmarks"}
              </button>
            </div>
            <CalendarSyncButton event={event} />
            <p className="demo-note">
              Demo campus event. Registration and passes are saved on this
              device; they are not official university admission tickets.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
