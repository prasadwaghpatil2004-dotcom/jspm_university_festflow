import type { CampusEvent } from "./events";
export type CalendarEvent = Pick<
  CampusEvent,
  "id" | "title" | "start" | "end" | "description" | "organizer" | "venue"
>;
export function calendarStamp(s: string) {
  return new Date(s)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
export function googleCalendarUrl(e: CalendarEvent) {
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: e.title,
      dates: calendarStamp(e.start) + "/" + calendarStamp(e.end),
      details:
        e.description +
        "\nOrganizer: " +
        e.organizer +
        "\nDemo event from JSPM Pulse",
      location: e.venue + ", JSPM University, Pune",
      ctz: "Asia/Kolkata",
    }).toString()
  );
}
function escape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function fold(s: string) {
  let out = "",
    line = "",
    size = 0;
  for (const c of s) {
    const n = new TextEncoder().encode(c).length;
    if (size + n > 75) {
      out += line + "\r\n";
      line = " ";
      size = 1;
    }
    line += c;
    size += n;
  }
  return out + line;
}
export function buildICS(e: CalendarEvent, now = new Date()) {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JSPM Pulse//Campus Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + e.id + "@jspm-pulse.local",
      "DTSTAMP:" + calendarStamp(now.toISOString()),
      "DTSTART:" + calendarStamp(e.start),
      "DTEND:" + calendarStamp(e.end),
      "SUMMARY:" + escape(e.title),
      "LOCATION:" + escape(e.venue + ", JSPM University, Pune"),
      "DESCRIPTION:" + escape(e.description + "\nOrganizer: " + e.organizer),
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + escape(e.title + " starts in 1 hour"),
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
export function downloadICS(e: CampusEvent) {
  const url = URL.createObjectURL(
    new Blob([buildICS(e)], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function calendarDownloadUrl(e: CalendarEvent) {
  const { id, title, start, end, description, organizer, venue } = e;
  return (
    "/api/calendar?" +
    new URLSearchParams({
      event: JSON.stringify({
        id,
        title,
        start,
        end,
        description,
        organizer,
        venue,
      }),
    }).toString()
  );
}
