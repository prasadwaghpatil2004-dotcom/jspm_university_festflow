"use client";
import { Megaphone, Plus, Sparkles } from "lucide-react";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export function OrganizerEmptyState({ onPost }: { onPost: () => void }) {
  return (
    <Empty className="feed-empty organizer-empty frosted-surface" role="status">
      <div className="organizer-empty-icon">
        <Megaphone size={36} />
        <Sparkles size={17} />
      </div>
      <span className="eyebrow">YOUR CAMPUS. YOUR FIRST MOVE.</span>
      <EmptyTitle>No events published yet.</EmptyTitle>
      <EmptyDescription>
        Are you organizing a fest or workshop? Tap '+ Post an event' to publish
        the first one!
      </EmptyDescription>
      <button className="button primary" onClick={onPost}>
        <Plus size={18} /> Post an event
      </button>
    </Empty>
  );
}
