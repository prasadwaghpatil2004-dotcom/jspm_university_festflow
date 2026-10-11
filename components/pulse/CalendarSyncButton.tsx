"use client";
import { CalendarDays, Download, Bell } from "lucide-react";
import { CampusEvent, statusOf } from "@/lib/pulse/events";
import { calendarDownloadUrl, googleCalendarUrl } from "@/lib/pulse/calendar";
import { usePulse } from "./PulseProvider";
export function CalendarSyncButton({ event }: { event: CampusEvent }) {
  const hub = usePulse();
  return (
    <div className="calendar-actions">
      <a
        className="button secondary"
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <CalendarDays size={16} />
        Add to Google Calendar
      </a>
      <a
        className="button secondary"
        role="button"
        href={calendarDownloadUrl(event)}
        download={
          event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics"
        }
      >
        <Download size={16} />
        Add to Apple/Outlook (.ics)
      </a>
      <button
        className={
          "button secondary " +
          (hub.reminders.includes(event.id) ? "reminder-on" : "")
        }
        disabled={statusOf(event) === "COMPLETED"}
        onClick={() => void hub.toggleReminder(event.id)}
      >
        <Bell size={16} />
        {hub.reminders.includes(event.id) ? "Reminder on" : "1h reminder"}
      </button>
      <small>
        Calendar exports include a 1-hour alert. Browser reminders need this tab
        open.
      </small>
    </div>
  );
}
