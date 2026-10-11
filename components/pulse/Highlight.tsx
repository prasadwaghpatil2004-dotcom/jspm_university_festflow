"use client";
import { expandedTerms } from "@/lib/pulse/search";
export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = expandedTerms(query)
    .filter((t) => t.length > 2)
    .sort((a, b) => b.length - a.length);
  if (!terms.length) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp("(" + escaped.join("|") + ")", "gi");
  return (
    <>
      {text
        .split(regex)
        .map((part, i) =>
          terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
            <mark key={i}>{part}</mark>
          ) : (
            part
          ),
        )}
    </>
  );
}
