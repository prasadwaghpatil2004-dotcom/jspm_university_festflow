"use client";
import { useMemo } from "react";
import qrcode from "qrcode-generator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CampusEvent, formatDate } from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { Ticket, MapPin, CheckCircle2, CalendarDays } from "lucide-react";
import { CalendarSyncButton } from "./CalendarSyncButton";
function TicketPass({ event }: { event: CampusEvent }) {
  const { profile } = usePulse();
  const ticketId =
    "JP-" + event.id.slice(0, 12).toUpperCase() + "-" + profile.prn.slice(-6);
  const qr = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(
      JSON.stringify({
        app: "festflow",
        demo: true,
        ticket: ticketId,
        event: event.id,
        prn: profile.prn,
      }),
    );
    code.make();
    return code.createDataURL(5, 4);
  }, [ticketId, event.id, profile.prn]);
  return (
    <article className="entry-ticket">
      <div className="ticket-head">
        <Ticket size={17} />
        <b>FESTFLOW / CAMPUS PASS</b>
        <span>
          <CheckCircle2 size={14} />
          REGISTERED
        </span>
      </div>
      <div className="ticket-body">
        <div>
          <h3>{event.title}</h3>
          <p>
            <CalendarDays size={14} />
            {formatDate(event.start)} ·{" "}
            {formatDate(event.start, { hour: "2-digit", minute: "2-digit" })}{" "}
            IST
          </p>
          <p>
            <MapPin size={14} />
            {event.venue}
          </p>
          <strong>{profile.name}</strong>
          <small>
            {profile.prn} · {ticketId}
          </small>
        </div>
        <div className="qr-frame">
          <img src={qr} alt={"Scannable demo entry QR for " + event.title} />
          <span>SCAN YOUR MOMENT</span>
        </div>
      </div>
      <CalendarSyncButton event={event} />
    </article>
  );
}
export function TicketsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { registeredEvents } = usePulse();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="pulse-modal tickets-modal">
        <DialogTitle className="modal-title">
          Your passes. Your plans.
        </DialogTitle>
        <DialogDescription>
          Scannable demo tickets for your registered campus events.
        </DialogDescription>
        {registeredEvents.length ? (
          registeredEvents.map((e) => <TicketPass event={e} key={e.id} />)
        ) : (
          <Empty className="tickets-empty">
            <Ticket size={42} />
            <EmptyTitle>Your next memory is waiting.</EmptyTitle>
            <EmptyDescription>
              Register for an event to get a QR pass here.
            </EmptyDescription>
            <button className="button primary" onClick={onClose}>
              Discover events
            </button>
          </Empty>
        )}
        <p className="demo-note">
          These QR codes contain demo ticket details. They do not verify
          official university admission.
        </p>
      </DialogContent>
    </Dialog>
  );
}
