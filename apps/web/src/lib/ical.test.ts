import assert from "node:assert/strict";
import test from "node:test";

import { createIcal } from "./ical";

test("creates an escaped UTC iCalendar feed", () => {
  const ical = createIcal("My, calendar", [
    {
      uid: "event-1@example.test",
      startsAt: Date.UTC(2026, 7, 17, 8, 15),
      endsAt: Date.UTC(2026, 7, 17, 10),
      summary: "Course; lecture",
      location: "Room, 1",
    },
  ]);

  assert.match(ical, /X-WR-CALNAME:My\\, calendar\r\n/);
  assert.match(ical, /DTSTART:20260817T081500Z\r\n/);
  assert.match(ical, /SUMMARY:Course\\; lecture\r\n/);
  assert.match(ical, /LOCATION:Room\\, 1\r\n/);
  assert(ical.endsWith("END:VCALENDAR\r\n"));
});
