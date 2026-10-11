import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
const dir = path.resolve(".sites-runtime/verification");
await fs.mkdir(dir, { recursive: true });
for (const name of ["events", "search", "calendar"]) {
  const source = await fs.readFile(`lib/pulse/${name}.ts`, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  await fs.writeFile(path.join(dir, name + ".mjs"), compiled);
}
const { statusOf, eventSchema } = await import(
  new URL("../.sites-runtime/verification/events.mjs", import.meta.url)
);
const { rankEvents } = await import(
  new URL("../.sites-runtime/verification/search.mjs", import.meta.url)
);
const { buildICS, googleCalendarUrl, calendarStamp } = await import(
  new URL("../.sites-runtime/verification/calendar.mjs", import.meta.url)
);
// Synthetic test fixtures only; the application has no event seed or fallback data.
const makeFixture = (overrides) => ({
  id: "test-coding",
  title: "Test Coding Sprint",
  category: "Hackathons",
  department: "All departments",
  start: "2026-10-10T10:00:00.000Z",
  end: "2026-10-11T10:00:00.000Z",
  venue: "Test Lab",
  description: "Coding challenge with cash prizes and mentor feedback",
  organizer: "Test Organizer",
  eligibility: "Test students",
  prize: "Cash prize",
  capacity: 200,
  registered: 0,
  rules: "Test event rules",
  registrationLink: "",
  accent: "cyan",
  headline: "Test fixture",
  free: true,
  ...overrides,
});
const events = [
  makeFixture({}),
  makeFixture({
    id: "test-dance",
    title: "Test Cultural Dance",
    category: "Cultural",
    description: "Cultural dance performances with free food",
    prize: "Test certificate",
  }),
  makeFixture({
    id: "test-python",
    title: "Test Python Basics",
    category: "Workshops",
    venue: "Poly Labs",
    description: "Beginner python workshop and hands-on training",
    prize: "Test certificate",
  }),
];
for (const e of events) {
  assert.equal(eventSchema.safeParse(e).success, true);
  assert.ok(Date.parse(e.end) > Date.parse(e.start));
  assert.ok(e.registered <= e.capacity);
}
assert.equal(rankEvents(events, "coding with cash prize")[0].id, "test-coding");
assert.equal(
  rankEvents(events, "free food cultural dance")[0].id,
  "test-dance",
);
assert.equal(
  rankEvents(events, "beginner python workshop")[0].id,
  "test-python",
);
assert.equal(rankEvents(events, "pythno")[0].id, "test-python");
assert.equal(rankEvents(events, "pyton")[0].id, "test-python");
assert.ok(
  rankEvents(events, "Poly Labs")
    .slice(0, 1)
    .every((e) => e.venue === "Poly Labs"),
);
assert.equal(rankEvents(events, "zzzzzzzzzzzz").length, 0);
assert.equal(
  statusOf(
    makeFixture({
      start: "2026-10-01T05:00:00.000Z",
      end: "2026-10-01T07:00:00.000Z",
    }),
    Date.parse("2026-10-01T06:00:00Z"),
  ),
  "LIVE NOW",
);
assert.equal(
  statusOf(
    makeFixture({
      start: "2026-09-30T05:00:00.000Z",
      end: "2026-09-30T07:00:00.000Z",
    }),
    Date.parse("2026-10-01T06:00:00Z"),
  ),
  "COMPLETED",
);
const event = events[0],
  url = new URL(googleCalendarUrl(event));
assert.equal(url.hostname, "calendar.google.com");
assert.equal(url.searchParams.get("action"), "TEMPLATE");
assert.equal(url.searchParams.get("text"), event.title);
assert.equal(
  url.searchParams.get("dates"),
  calendarStamp(event.start) + "/" + calendarStamp(event.end),
);
assert.equal(url.searchParams.get("ctz"), "Asia/Kolkata");
assert.ok(url.searchParams.get("location").includes(event.venue));
assert.equal(Date.parse(event.end) - Date.parse(event.start), 86400000);
const malicious = {
  ...event,
  title: "Campus, makers; night",
  description: "First line\nEND:VEVENT\nRésumé " + "₹".repeat(60),
};
const ics = buildICS(malicious, new Date("2026-10-01T06:00:00Z"));
assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
assert.ok(ics.includes("SUMMARY:Campus\\, makers\\; night"));
assert.ok(ics.includes("TRIGGER:-PT1H"));
assert.equal(
  ics.split("\r\n").filter((line) => line === "END:VEVENT").length,
  1,
);
for (const line of ics.split("\r\n"))
  assert.ok(Buffer.byteLength(line, "utf8") <= 75);
const unfold = ics.replace(/\r\n /g, "");
assert.ok(unfold.includes("DESCRIPTION:First line\\nEND:VEVENT\\nRésumé"));
for (const name of ["concert.jpg", "hackathon.jpg", "gaming.jpg"]) {
  const buffer = await fs.readFile("public/images/" + name);
  assert.ok(buffer.length > 1000);
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);
}
const logo = await fs.readFile("public/assets/images/logos/jspm_logo.png");
assert.equal(logo.subarray(1, 4).toString(), "PNG");
console.log(
  "PASS: synthetic test fixtures, concept and typo search, status timing, Google Calendar fields, ICS UTC/escaping/folding/alarm, local image assets and official logo.",
);

const countdownSource = await fs.readFile("hooks/use-countdown.ts", "utf8");
await fs.writeFile(
  path.join(dir, "countdown.mjs"),
  ts.transpileModule(countdownSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
);
const { countdownParts } = await import(
  new URL("../.sites-runtime/verification/countdown.mjs", import.meta.url)
);
assert.deepEqual(
  countdownParts("2026-10-03T07:03:04Z", Date.parse("2026-10-01T06:00:00Z"))
    .values,
  [2, 1, 3, 4],
);
assert.deepEqual(
  countdownParts("2026-09-30T06:00:00Z", Date.parse("2026-10-01T06:00:00Z"))
    .values,
  [0, 0, 0, 0],
);
let routeSource = await fs.readFile("app/api/calendar/route.ts", "utf8");
let routeCode = ts
  .transpileModule(routeSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace("@/lib/pulse/events", "./events.mjs")
  .replace("@/lib/pulse/calendar", "./calendar.mjs");
await fs.writeFile(path.join(dir, "calendar-route.mjs"), routeCode);
const { GET } = await import(
  new URL("../.sites-runtime/verification/calendar-route.mjs", import.meta.url)
);
const { calendarDownloadUrl } = await import(
  new URL("../.sites-runtime/verification/calendar.mjs", import.meta.url)
);
const attachment = await GET(
  new Request("http://localhost" + calendarDownloadUrl(event)),
);
assert.equal(attachment.status, 200);
assert.equal(
  attachment.headers.get("content-type"),
  "text/calendar; charset=utf-8",
);
assert.ok(
  attachment.headers
    .get("content-disposition")
    .includes("attachment; filename="),
);
assert.ok((await attachment.text()).includes("BEGIN:VEVENT"));
assert.equal(
  (await GET(new Request("http://localhost/api/calendar?event=invalid")))
    .status,
  400,
);
assert.equal(
  (
    await GET(
      new Request(
        "http://localhost/api/calendar?event=" +
          encodeURIComponent(JSON.stringify({ ...event, end: event.start })),
      ),
    )
  ).status,
  400,
);
console.log(
  "PASS: second-by-second countdown rollover and expiry; HTTP calendar attachment, invalid input and invalid schedule rejection.",
);
