"use client";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { rankEvents } from "@/lib/pulse/search";
import { CampusEvent, formatDate } from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { Highlight } from "./Highlight";
import { Search } from "lucide-react";
export function SearchModal({
  open,
  onClose,
  onSearch,
  onDetails,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onDetails: (e: CampusEvent) => void;
}) {
  const [query, setQuery] = useState("");
  const { events } = usePulse();
  const results = useMemo(
    () => rankEvents(events, query).slice(0, 8),
    [events, query],
  );
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="pulse-modal search-modal">
        <DialogTitle className="modal-title">
          Find your next experience
        </DialogTitle>
        <DialogDescription>
          Search the idea, not just the name.
        </DialogDescription>
        <Command shouldFilter={false} className="pulse-command">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Try coding with cash prize…"
            aria-label="Search campus events"
          />
          <div className="search-suggestions">
            {[
              "coding with cash prize",
              "free food cultural dance",
              "beginner python workshop",
            ].map((q) => (
              <button key={q} onClick={() => setQuery(q)}>
                {q}
              </button>
            ))}
          </div>
          <CommandList className="search-results">
            <CommandEmpty>No matches yet. Try a shorter phrase.</CommandEmpty>
            {results.map((e) => (
              <CommandItem
                key={e.id}
                value={e.id}
                onSelect={() => {
                  onDetails(e);
                  onClose();
                }}
                className="search-result"
              >
                <div>
                  <strong>
                    <Highlight text={e.title} query={query} />
                  </strong>
                  <p>
                    <Highlight text={e.description} query={query} />
                  </p>
                </div>
                <small>
                  {formatDate(e.start)}
                  <br />
                  {e.category}
                </small>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        <button
          className="button primary"
          onClick={() => {
            onSearch(query);
            onClose();
          }}
        >
          <Search size={16} />
          Show matches in feed
        </button>
        <small className="keyboard-note">
          ↑ ↓ to explore · Enter to view · Esc to close
        </small>
      </DialogContent>
    </Dialog>
  );
}
