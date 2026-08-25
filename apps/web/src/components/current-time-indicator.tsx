import { useEffect, useState } from "react";

const HOUR_HEIGHT = 64;

export function CurrentTimeIndicator({
  date,
  startHour,
  height,
}: {
  date: Date;
  startHour: number;
  height: number;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (now.toDateString() !== date.toDateString()) return null;

  const offset = ((now.getHours() * 60 + now.getMinutes() - startHour * 60) / 60) * HOUR_HEIGHT;
  const top = Math.max(0, Math.min(offset, height - 2));

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
      style={{ top }}
    >
      <span className="absolute -top-1.5 -left-1 size-2.5 rounded-full bg-red-500" />
    </div>
  );
}
