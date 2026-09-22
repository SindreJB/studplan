import type { CourseScheduleEvent } from "@repo/db/schema";
import { Button } from "@repo/ui/components/button";
import { format } from "date-fns";
import { Eye, Trash2 } from "lucide-react";

export type ScheduleEventDisplay = {
  courseId: string;
  startsAt: number;
  endsAt: number;
  summary?: string | null;
  teachingTitle?: string | null;
  kind?: CourseScheduleEvent["kind"];
  rooms: ReadonlyArray<{ roomName: string; roomUrl: string }>;
};

/**
 * Events keep their per-course color, but as a rule down the leading edge
 * rather than a tinted block — the grid stays paper and ink.
 */
export function scheduleEventColorStyle(color: string) {
  return {
    backgroundColor: "var(--background)",
    borderColor: "var(--border)",
    boxShadow: `inset 3px 0 0 0 ${color}`,
  };
}

export function ScheduleEventContent({
  event,
  color = "#6366f1",
  compact = false,
  hidden = false,
  timeLabel,
  onToggle,
}: {
  event: ScheduleEventDisplay;
  color?: string;
  compact?: boolean;
  hidden?: boolean;
  timeLabel?: string;
  onToggle?: () => void;
}) {
  const room = event.rooms.map((item) => item.roomName).join(", ");
  const mapUrls = [...new Set(event.rooms.map((item) => item.roomUrl).filter(Boolean))];

  return (
    <div
      className={
        compact
          ? `relative h-full pl-1.5 leading-tight ${onToggle ? "pr-6" : ""}`
          : `relative border p-2 pl-3 ${onToggle ? "pb-9" : ""}`
      }
      style={compact ? undefined : scheduleEventColorStyle(color)}
    >
      <strong className="block font-mono text-[11px] tracking-[0.06em] uppercase">
        {event.courseId}
      </strong>
      <span className="block font-mono text-[11px] tabular-nums">
        {timeLabel ?? `${format(event.startsAt, "HH:mm")}–${format(event.endsAt, "HH:mm")}`}
      </span>
      <span className="block truncate">{event.summary ?? event.teachingTitle}</span>
      {room && <span className="block truncate text-muted-foreground">{room}</span>}
      {mapUrls.map((url, index) => (
        <a
          className="block truncate underline underline-offset-2"
          href={url}
          key={url}
          rel="noreferrer"
          target="_blank"
        >
          {mapUrls.length === 1 ? "MazeMap" : `MazeMap ${index + 1}`}
        </a>
      ))}
      {event.kind !== "exam" && onToggle && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="absolute right-1 bottom-1"
          aria-label={`${hidden ? "Show" : "Hide"} repeating ${event.courseId} event`}
          onClick={onToggle}
        >
          {hidden ? <Eye /> : <Trash2 />}
        </Button>
      )}
    </div>
  );
}
