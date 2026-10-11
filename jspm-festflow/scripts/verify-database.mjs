// Exercises the real Supabase SDK against an in-memory PostgREST transport.
// No credentials or live database are used, and no external rows are written.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const dir = path.resolve(".sites-runtime/database-verification");
await fs.mkdir(dir, { recursive: true });
for (const [file, name] of [
  ["lib/pulse/events.ts", "events"],
  ["src/lib/pulse-database.ts", "database"],
]) {
  const source = (await fs.readFile(file, "utf8")).replace(
    '"../../lib/pulse/events"',
    '"./events.mjs"',
  );
  await fs.writeFile(
    path.join(dir, name + ".mjs"),
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
}
const {
  createPulseDatabase,
  eventFromRow,
  eventToRow,
  persistentDemoUserId,
  activityFromRows,
  eventChangeUpdater,
  prependEvent,
} = await import(
  new URL(
    "../.sites-runtime/database-verification/database.mjs",
    import.meta.url,
  )
);
const id = "dd65a632-de2b-4ccc-b1ab-717b7729e6ae";
const row = {
  id,
  title: "Live Robotics Meetup",
  tagline: null,
  category: "Workshops",
  venue: "Poly Labs",
  start_date: "2026-10-10T16:00:00+05:30",
  total_capacity: 60,
  registered_count: 17,
  image_url: null,
};
const records = [row],
  bookmarks = [],
  requests = [];
let failNext = false;
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
const client = createClient("https://test.supabase.co", "test-anon-key", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (input, init) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      const body =
        request.method === "GET" || request.method === "DELETE"
          ? null
          : await request.json();
      requests.push({
        method: request.method,
        table: url.pathname.split("/").at(-1),
        query: url.searchParams,
        body,
      });
      if (failNext) {
        failNext = false;
        return response(
          { code: "42501", message: "RLS denied", details: null, hint: null },
          403,
        );
      }
      if (url.pathname.endsWith("/events")) {
        if (request.method === "GET") return response(records);
        assert.equal(request.method, "POST");
        const inserted = {
          ...body[0],
          id: "68888281-aad8-4052-bb3f-f9aefbadf920",
        };
        records.push(inserted);
        return response(inserted, 201);
      }
      assert.ok(url.pathname.endsWith("/bookmarks"));
      if (request.method === "GET")
        return response(
          bookmarks.filter(
            (r) => "eq." + r.user_id === url.searchParams.get("user_id"),
          ),
        );
      if (request.method === "DELETE") {
        const deleted = bookmarks.filter(
          (r) =>
            "eq." + r.user_id === url.searchParams.get("user_id") &&
            "eq." + r.event_id === url.searchParams.get("event_id"),
        );
        for (const value of deleted)
          bookmarks.splice(bookmarks.indexOf(value), 1);
        return response(deleted.map((r) => ({ event_id: r.event_id })));
      }
      const values = Array.isArray(body) ? body : [body];
      for (const value of values) {
        assert.ok(
          records.some((r) => r.id === value.event_id),
          "bookmark must reference a stored event UUID",
        );
        const existing = bookmarks.find(
          (r) => r.user_id === value.user_id && r.event_id === value.event_id,
        );
        if (existing) {
          assert.equal(url.searchParams.get("on_conflict"), "user_id,event_id");
          Object.assign(existing, value);
        } else bookmarks.push(value);
      }
      return new Response(null, { status: 201 });
    },
  },
});
const db = createPulseDatabase(client);
const memory = new Map(),
  storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
const student = persistentDemoUserId(storage);
assert.equal(
  persistentDemoUserId(storage),
  student,
  "identity survives another initialization",
);
assert.notEqual(
  student,
  persistentDemoUserId({ getItem: () => null, setItem: () => {} }),
);
assert.equal(eventFromRow(row).start, "2026-10-10T10:30:00.000Z");
assert.equal(eventFromRow(row).capacity, 60);
assert.equal(eventFromRow(row).registered, 17);
assert.equal(eventFromRow({ ...row, title: "AI", tagline: "Fun" }).title, "AI");
assert.throws(() => eventFromRow({ ...row, start_date: "bad" }));
assert.throws(() =>
  activityFromRows(
    [{ user_id: "other", event_id: id, status: "interested" }],
    student,
  ),
);
const listed = await db.events();
assert.equal(listed.length, 1);
assert.equal(listed[0].poster, undefined);
await db.bookmark(student, id);
assert.deepEqual((await db.activity(student)).saved, [id]);
assert.equal((await db.activity(student)).attendance[id], "Interested");
await db.attendance(student, id, "Registered");
assert.equal((await db.activity(student)).attendance[id], "Registered");
await db.attendance(student, id, "Attending");
assert.equal((await db.activity(student)).attendance[id], "Attending");
await db.bookmark("other-student", id);
await db.removeBookmark(student, id);
assert.deepEqual(await db.activity(student), { saved: [], attendance: {} });
assert.equal(bookmarks.length, 1, "delete must preserve another student’s row");
failNext = true;
await assert.rejects(
  db.attendance(student, id, "Registered"),
  (error) => error.message === "RLS denied",
);
assert.deepEqual((await db.activity(student)).saved, []);
const draft = eventFromRow({
    ...row,
    title: "Organizer Workshop",
    tagline: "Organizer supplied summary",
    total_capacity: 200,
    registered_count: 0,
  }),
  payload = eventToRow(draft);
assert.deepEqual(
  Object.keys(payload).sort(),
  [
    "title",
    "tagline",
    "category",
    "venue",
    "start_date",
    "total_capacity",
    "registered_count",
    "image_url",
  ].sort(),
);
assert.equal(payload.tagline, draft.description);
const published = await db.publish(draft);
assert.equal(
  published.id,
  "68888281-aad8-4052-bb3f-f9aefbadf920",
  "server-generated UUID replaces draft ID",
);
assert.equal((await db.events()).length, 2);
assert.equal(payload.registered_count, 0);
assert.equal(payload.total_capacity, 200);
assert.equal(payload.image_url, null);
assert.ok(
  requests.some(
    (r) =>
      r.table === "events" &&
      r.method === "GET" &&
      r.query.get("order") === "created_at.desc,id.desc",
  ),
);
const received = {
  ...row,
  id: published.id,
  title: "Posted on another device",
  registered_count: 1,
};
let feed = eventChangeUpdater({ eventType: "INSERT", new: received, old: {} })(
  listed,
);
assert.equal(feed[0].title, received.title);
feed = eventChangeUpdater({ eventType: "INSERT", new: received, old: {} })(
  feed,
);
assert.equal(
  feed.length,
  2,
  "own insert plus Realtime echo must not duplicate a card",
);
feed = eventChangeUpdater({
  eventType: "UPDATE",
  new: { ...received, registered_count: 30 },
  old: {},
})(feed);
assert.equal(feed[0].registered, 30, "capacity updates apply immediately");
feed = prependEvent(feed, published);
assert.equal(feed[0].id, published.id, "successful publish stays first");
assert.equal(feed.length, 2);
feed = eventChangeUpdater({
  eventType: "DELETE",
  new: {},
  old: { id: published.id },
})(feed);
assert.deepEqual(
  feed.map((e) => e.id),
  [id],
);
feed = eventChangeUpdater({ eventType: "DELETE", new: {}, old: { id } })(feed);
assert.deepEqual(feed, [], "last deletion leaves an empty live feed");
assert.throws(() =>
  eventChangeUpdater({
    eventType: "INSERT",
    new: { title: "partial replica row" },
    old: {},
  }),
);
await db.bookmark(student, published.id);
assert.ok((await db.activity(student)).saved.includes(published.id));
failNext = true;
await assert.rejects(
  db.publish(draft),
  (error) => error.message === "RLS denied",
);
records.splice(0);
assert.deepEqual(
  await db.events(),
  [],
  "successful empty feed is distinct from a failed query",
);
failNext = true;
await assert.rejects(db.events(), (error) => error.message === "RLS denied");
assert.ok(
  requests
    .filter((r) => r.table === "bookmarks" && r.method === "GET")
    .every((r) => r.query.get("user_id") === "eq." + student),
);
console.log(
  "Passed live-only empty feeds, newest-first reads, organizer publishing, Realtime insert/update/delete and deduplication, bookmark scoping, identity persistence, and denied writes (mock HTTP transport).",
);
