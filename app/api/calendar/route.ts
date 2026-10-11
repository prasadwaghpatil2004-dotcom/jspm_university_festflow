import { eventSchema } from "@/lib/pulse/events";
import { buildICS } from "@/lib/pulse/calendar";
const calendarSchema = eventSchema.pick({
  id: true,
  title: true,
  start: true,
  end: true,
  description: true,
  organizer: true,
  venue: true,
});

/** A real HTTP attachment also works in browsers which don't download blob URLs. */
export async function GET(request: Request) {
  const payload = new URL(request.url).searchParams.get("event");
  if (!payload || payload.length > 8000)
    return new Response("Invalid calendar event", { status: 400 });
  try {
    const result = calendarSchema.safeParse(JSON.parse(payload));
    if (
      !result.success ||
      Date.parse(result.data.end) <= Date.parse(result.data.start)
    )
      return new Response("Invalid calendar event", { status: 400 });
    const filename =
      result.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics";
    return new Response(buildICS(result.data), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Invalid calendar event", { status: 400 });
  }
}
