"use client";
import { useEffect, useState, FormEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ticket, Bookmark, Award, Check, UserRound } from "lucide-react";
import { usePulse } from "./PulseProvider";
import { departments, initials, Profile } from "@/lib/pulse/events";
export function ProfileDrawer({
  open,
  onClose,
  onTickets,
  onBookmarks,
}: {
  open: boolean;
  onClose: () => void;
  onTickets: () => void;
  onBookmarks: () => void;
}) {
  const hub = usePulse();
  const [draft, setDraft] = useState<Profile>(hub.profile);
  useEffect(() => {
    if (open) setDraft(hub.profile);
  }, [open, hub.profile]);
  function submit(e: FormEvent) {
    e.preventDefault();
    hub.updateProfile(draft);
  }
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="profile-drawer">
        <span className="eyebrow">YOUR CAMPUS IDENTITY</span>
        <SheetTitle className="modal-title">
          The person behind the pulse.
        </SheetTitle>
        <SheetDescription>
          Bookmarks and attendance sync to your campus feed. Profile details
          stay on this device.
        </SheetDescription>
        <div
          className="profile-avatar"
          style={{ "--aura": draft.aura } as React.CSSProperties}
        >
          {initials(draft.name)}
          <span>
            <UserRound size={15} />
          </span>
        </div>
        <h3 className="profile-name">{hub.profile.name}</h3>
        <p className="profile-meta">
          {hub.profile.department} / {hub.profile.year}
        </p>
        <div className="profile-stat-rack">
          <button onClick={onTickets}>
            <Ticket size={20} />
            <b>{hub.registeredEvents.length}</b>
            <span>Registered</span>
          </button>
          <div>
            <Award size={20} />
            <b>0</b>
            <span>Certificates</span>
          </div>
          <button onClick={onBookmarks}>
            <Bookmark size={20} />
            <b>{hub.savedEvents.length}</b>
            <span>Bookmarks</span>
          </button>
        </div>
        <p className="interests-note">
          {
            Object.values(hub.attendance).filter((s) => s === "Interested")
              .length
          }{" "}
          events on your radar
        </p>
        <form className="profile-form" onSubmit={submit}>
          <label>
            Student name
            <Input
              value={draft.name}
              maxLength={70}
              required
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </label>
          <label>
            Roll / PRN
            <Input
              value={draft.prn}
              maxLength={30}
              required
              onChange={(e) => setDraft((d) => ({ ...d, prn: e.target.value }))}
            />
          </label>
          <div className="form-grid">
            <label>
              Department
              <Select
                value={draft.department}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, department: v }))
                }
              >
                <SelectTrigger aria-label="Student department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.slice(1).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label>
              Year
              <Select
                value={draft.year}
                onValueChange={(v) => setDraft((d) => ({ ...d, year: v }))}
              >
                <SelectTrigger aria-label="Study year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"].map(
                    (d) => (
                      <SelectItem value={d} key={d}>
                        {d}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </label>
          </div>
          <fieldset>
            <legend>Your neon aura</legend>
            <RadioGroup
              className="aura-options"
              value={draft.aura}
              onValueChange={(v) => setDraft((d) => ({ ...d, aura: v }))}
            >
              {[
                ["Violet", "#8B5CF6"],
                ["Cyan", "#06B6D4"],
                ["Lime", "#10B981"],
                ["Orange", "#F97316"],
              ].map(([name, color]) => (
                <label key={name} style={{ color }}>
                  <RadioGroupItem value={color} aria-label={name + " aura"} />
                  {name}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <button className="button primary" type="submit">
            <Check size={16} />
            Save profile
          </button>
        </form>
        <p className="demo-note">
          Demo student identity. Certificates are awarded by organizers outside
          this demo.
        </p>
      </SheetContent>
    </Sheet>
  );
}
