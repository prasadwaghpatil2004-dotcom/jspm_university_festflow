import type { CampusEvent } from "./events";
const groups = [
  [
    "coding",
    "code",
    "programming",
    "software",
    "hackathon",
    "hackathons",
    "developer",
    "build",
  ],
  ["cash", "money", "prize", "prizes", "pool", "reward", "winning", "₹"],
  ["food", "snack", "snacks", "meal", "stalls"],
  [
    "cultural",
    "culture",
    "dance",
    "music",
    "concert",
    "band",
    "performance",
    "fest",
  ],
  ["beginner", "beginners", "basic", "basics", "first", "zero", "experience"],
  ["python", "script", "automation"],
  ["gaming", "esports", "lan", "valorant", "fifa", "game", "games"],
  ["robot", "robotics", "autonomous", "hardware", "electronics"],
  ["sport", "sports", "cricket", "football", "race"],
  ["startup", "entrepreneurship", "business", "founder", "pitch"],
];
const stop = new Set([
  "a",
  "an",
  "the",
  "for",
  "with",
  "and",
  "or",
  "to",
  "of",
  "in",
  "at",
  "on",
  "my",
  "i",
  "want",
  "me",
  "show",
  "find",
  "events",
  "event",
  "something",
]);
export function tokenize(s: string) {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}₹]+/u)
    .filter((t) => t && !stop.has(t));
}
function concept(t: string) {
  return groups.findIndex((g) => g.includes(t));
}
function distance(a: string, b: string) {
  if (a.length === b.length) {
    const differences = [...a].flatMap((c, i) => (c !== b[i] ? [i] : []));
    if (differences.length === 2) {
      const [i, j] = differences;
      if (j === i + 1 && a[i] === b[j] && a[j] === b[i]) return 1;
    }
  }
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = old;
    }
  }
  return row[b.length];
}
export function searchScore(e: CampusEvent, q: string) {
  const terms = tokenize(q);
  if (!terms.length) return 1;
  const text = [
    e.title,
    e.category,
    e.description,
    e.organizer,
    e.prize,
    e.eligibility,
    e.venue,
  ]
    .join(" ")
    .toLowerCase();
  const words = tokenize(text);
  const title = e.title.toLowerCase();
  let score = 0,
    matches = 0;
  for (const t of terms) {
    let s = title.includes(t) ? 3 : text.includes(t) ? 2 : 0;
    if (
      !s &&
      t.length > 3 &&
      words.some(
        (w) => Math.abs(w.length - t.length) < 2 && distance(t, w) <= 1,
      )
    )
      s = 1.4;
    const c = concept(t);
    if (!s && c >= 0 && words.some((w) => concept(w) === c)) s = 1.1;
    if (s) {
      score += s;
      matches++;
    }
  }
  return matches
    ? (score / Math.sqrt(terms.length)) * (matches / terms.length)
    : 0;
}
export function expandedTerms(q: string) {
  return [
    ...new Set(
      tokenize(q).flatMap((t) => {
        const c = concept(t);
        return c < 0 ? [t] : groups[c];
      }),
    ),
  ];
}
export function rankEvents(events: CampusEvent[], q: string) {
  return events
    .map((e) => ({ event: e, score: searchScore(e, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.event);
}
