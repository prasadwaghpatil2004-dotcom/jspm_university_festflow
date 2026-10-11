"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users, Code2, Gamepad2, CheckCircle2 } from "lucide-react";
import { CampusEvent, initials, statusOf } from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
export function TeammatesModal({
  event,
  onClose,
}: {
  event: CampusEvent | null;
  onClose: () => void;
}) {
  const hub = usePulse();
  if (!event) return null;
  const gaming = event.category === "Gaming/LAN";
  const joined = hub.teamBoards.includes(event.id);
  const teams = gaming
    ? [
        {
          name: "Respawn Crew",
          skills: "Valorant · strategy & support",
          seats: "2 spots open",
          initials: "RC",
        },
        {
          name: "Pixel Syndicate",
          skills: "FIFA · doubles & knockout",
          seats: "1 spot open",
          initials: "PS",
        },
      ]
    : [
        {
          name: "Byte Brigade",
          skills: "React · Python · campus solutions",
          seats: "2 spots open",
          initials: "BB",
        },
        {
          name: "Midnight Makers",
          skills: "Design · hardware · rapid prototypes",
          seats: "1 spot open",
          initials: "MM",
        },
      ];
  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="pulse-modal">
        <span className="eyebrow">GOOD IDEAS NEED GOOD PEOPLE.</span>
        <DialogTitle className="modal-title">
          Find your campus crew.
        </DialogTitle>
        <DialogDescription>
          {event.title} · Demo teammate board
        </DialogDescription>
        <div className="team-list">
          {teams.map((team) => (
            <div className="team-entry" key={team.name}>
              <span className="team-avatar">{team.initials}</span>
              <div>
                <h3>{team.name}</h3>
                <p>
                  {gaming ? <Gamepad2 size={14} /> : <Code2 size={14} />}{" "}
                  {team.skills}
                </p>
              </div>
              <small>{team.seats}</small>
            </div>
          ))}
          {joined && (
            <div className="team-entry your-team-entry">
              <span
                className="team-avatar"
                style={{ borderColor: hub.profile.aura }}
              >
                {initials(hub.profile.name)}
              </span>
              <div>
                <h3>{hub.profile.name}</h3>
                <p>Looking for teammates · {hub.profile.department}</p>
              </div>
              <CheckCircle2 size={19} />
            </div>
          )}
        </div>
        <button
          className="button primary"
          onClick={() => hub.joinTeamBoard(event.id)}
          disabled={joined || statusOf(event, hub.now) === "COMPLETED"}
        >
          <Users size={17} />
          {joined ? "You’re on the board" : "I’m looking for teammates"}
        </button>
        <p className="demo-note">
          Sample team listings. Joining saves your interest on this device; it
          does not send invitations or contact other students.
        </p>
      </DialogContent>
    </Dialog>
  );
}
