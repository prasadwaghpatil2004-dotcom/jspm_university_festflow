"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  ScanLine,
  Camera,
  Sparkles,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  CampusEvent,
  categories,
  isValidOrganizerPin,
} from "@/lib/pulse/events";
import { usePulse } from "./PulseProvider";
import { eventFromRow } from "@/src/lib/pulse-database";
type Draft = {
  title: string;
  category: CampusEvent["category"];
  date: string;
  venue: string;
  description: string;
  capacity: string;
  organizerPin: string;
};
const initialDraft = (): Draft => ({
  title: "",
  category: "Workshops",
  date: "",
  venue: "",
  description: "",
  capacity: "200",
  organizerPin: "",
});
async function posterData(file: File) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Cannot read image");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", 0.78);
}
export function VisionUploadModal({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const { publish } = usePulse();
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [poster, setPoster] = useState("");
  const [drag, setDrag] = useState(false);
  const [scanText, setScanText] = useState("");
  const [camera, setCamera] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const run = useRef(0);
  const [busy, setBusy] = useState(false);
  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  };
  useEffect(() => {
    if (!open) {
      run.current++;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      stopCamera();
      setStep("upload");
      setPoster("");
      setDraft(initialDraft());
    }
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);
  useEffect(() => {
    if (camera && video.current && stream.current)
      video.current.srcObject = stream.current;
  }, [camera]);
  async function process(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP poster.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose an image smaller than 8 MB.");
      return;
    }
    stopCamera();
    const token = ++run.current;
    timers.current.forEach(clearTimeout);
    setStep("scanning");
    setScanText("Scanning poster...");
    const started = Date.now();
    try {
      const image = await posterData(file);
      if (token !== run.current) return;
      setPoster(image);
      const name = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      const next = initialDraft();
      if (
        name &&
        !["image", "poster", "snapshot", "capture"].includes(name.toLowerCase())
      )
        next.title = name
          .slice(0, 100)
          .replace(/\b\w/g, (c) => c.toUpperCase());
      const clue = name.toLowerCase();
      if (/hack|code/.test(clue)) {
        next.category = "Hackathons";
      } else if (/dance|music|fest|culture/.test(clue)) {
        next.category = "Cultural";
      } else if (/sport|cricket|football/.test(clue)) {
        next.category = "Sports";
      }
      setDraft(next);
      timers.current.push(
        setTimeout(
          () => {
            if (token === run.current) setScanText("Parsing dates & venue...");
          },
          Math.max(0, 900 - (Date.now() - started)),
        ),
      );
      timers.current.push(
        setTimeout(
          () => {
            if (token === run.current) {
              setStep("review");
              toast.success(
                "Demo scan complete. Review every detail before publishing.",
              );
            }
          },
          Math.max(0, 2000 - (Date.now() - started)),
        ),
      );
    } catch {
      if (token === run.current) {
        setStep("upload");
        toast.error("This image could not be read. Try another poster.");
      }
    }
  }
  async function startCamera() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (!open) {
        stopCamera();
        return;
      }
      setCamera(true);
    } catch {
      toast.info(
        "Camera access is unavailable. You can upload a photo from your device.",
      );
      input.current?.click();
    }
  }
  function snapshot() {
    const v = video.current;
    if (!v || !v.videoWidth) {
      toast.info("Wait for the camera to be ready.");
      return;
    }
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(
      (blob) => {
        if (blob)
          void process(
            new File([blob], "snapshot.jpg", { type: "image/jpeg" }),
          );
      },
      "image/jpeg",
      0.85,
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    let start: Date;
    try {
      start = new Date(draft.date + ":00+05:30");
      if (!Number.isFinite(start.getTime())) throw Error();
    } catch {
      toast.error("Enter a valid date and time.");
      return;
    }
    if (start.getTime() < Date.now()) {
      toast.error("Choose a future kickoff time.");
      return;
    }
    if (!isValidOrganizerPin(draft.organizerPin)) {
      toast.error("Organizer PIN must be 4 to 6 digits.");
      return;
    }
    setBusy(true);
    try {
      const event = eventFromRow({
        id: crypto.randomUUID(), // Draft only; Supabase generates the published ID.
        title: draft.title.trim(),
        tagline: draft.description.trim(),
        category: draft.category,
        venue: draft.venue.trim(),
        start_date: start.toISOString(),
        total_capacity: Number(draft.capacity) || 200,
        registered_count: 0,
        image_url: poster || null,
      });
      if (await publish(event, draft.organizerPin)) {
        onClose();
        onPublished();
      }
    } catch {
      toast.error("Check the event details before publishing.");
    } finally {
      setBusy(false);
    }
  }
  const change = (key: keyof Draft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="pulse-modal upload-modal">
        <span className="eyebrow">
          <Sparkles size={14} /> POSTER → CAMPUS PLAN
        </span>
        <DialogTitle className="modal-title">
          Put your event on the pulse.
        </DialogTitle>
        <DialogDescription>
          {step === "review"
            ? "Review the suggested details, then publish to your feed."
            : "Drop a poster. Get a starting point for your event."}
        </DialogDescription>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose an event poster"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void process(file);
            e.target.value = "";
          }}
        />
        {step === "upload" && !camera && (
          <>
            <div
              className={"dropzone " + (drag ? "dragging" : "")}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void process(file);
              }}
            >
              <div className="upload-orbit">
                <ImagePlus size={32} />
              </div>
              <h3>Drop your event poster here</h3>
              <p>JPG, PNG or WebP · up to 8 MB</p>
              <button
                className="button primary"
                onClick={() => input.current?.click()}
              >
                <Upload size={16} />
                Choose poster
              </button>
              <button
                className="button secondary"
                onClick={() => void startCamera()}
              >
                <Camera size={16} />
                Take a photo
              </button>
            </div>
            <p className="demo-note">
              The scan animation suggests a title and category from the
              filename. Enter the actual schedule, venue and summary before
              publishing.
            </p>
            <button className="text-button" onClick={() => setStep("review")}>
              Enter details without a poster
            </button>
          </>
        )}
        {camera && (
          <div className="camera-box">
            <video ref={video} autoPlay playsInline muted />
            <button className="button primary" onClick={snapshot}>
              <Camera size={17} />
              Take snapshot
            </button>
            <button className="button secondary" onClick={stopCamera}>
              Cancel camera
            </button>
          </div>
        )}
        {step === "scanning" && (
          <div className="scan-box" aria-live="polite">
            {poster && <img src={poster} alt="Poster being scanned" />}
            <div className="scan-laser" />
            <div className="scan-corner tl" />
            <div className="scan-corner br" />
            <div className="scan-status">
              <ScanLine size={23} />
              <b>{scanText}</b>
              <small>VISION WORKFLOW SIMULATION</small>
            </div>
          </div>
        )}
        {step === "review" && (
          <form onSubmit={submit} className="review-form">
            <div className="review-preview">
              {poster && <img src={poster} alt="Uploaded event poster" />}
              <div>
                <CheckCircle2 size={22} />
                <b>Ready for your review</b>
                <p>
                  Publish your organizer-provided details to the live campus
                  feed.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label className="span-two">
                Event title
                <Input
                  value={draft.title}
                  required
                  minLength={3}
                  maxLength={100}
                  onChange={(e) => change("title", e.target.value)}
                />
              </label>
              <label>
                Category
                <Select
                  value={draft.category}
                  onValueChange={(v) => change("category", v)}
                >
                  <SelectTrigger aria-label="Event category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((c) => (
                      <SelectItem value={c} key={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label>
                Kickoff date & time (IST)
                <Input
                  type="datetime-local"
                  value={draft.date}
                  required
                  onChange={(e) => change("date", e.target.value)}
                />
              </label>
              <label>
                Venue
                <Input
                  value={draft.venue}
                  required
                  minLength={2}
                  maxLength={100}
                  onChange={(e) => change("venue", e.target.value)}
                />
              </label>
              <label>
                Participant capacity
                <Input
                  type="number"
                  min="1"
                  max="100000"
                  value={draft.capacity}
                  required
                  onChange={(e) => change("capacity", e.target.value)}
                />
              </label>
              <label className="span-two">
                Event summary / tagline
                <textarea
                  value={draft.description}
                  minLength={5}
                  maxLength={1200}
                  required
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <label className="span-two">
                Organizer PIN (4-6 digits to edit/delete later)
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,6}"
                  maxLength={6}
                  minLength={4}
                  value={draft.organizerPin}
                  required
                  autoComplete="new-password"
                  onChange={(e) =>
                    change(
                      "organizerPin",
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
              </label>
            </div>
            <p className="demo-note">
              Publishing shares this event through the campus feed. Event
              duration defaults to 3 hours. Keep the review open until
              publishing finishes.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setStep("upload")}
              >
                Change poster
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                <Sparkles size={16} />
                {busy ? "Publishing…" : "Publish to JSPM Feed"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
