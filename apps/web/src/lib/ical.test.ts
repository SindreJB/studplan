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
      description: "Room 1\r\nMore information: https://example.test/course",
      location: "Room, 1",
      url: "https://example.test/course",
    },
  ]);

  assert.match(ical, /X-WR-CALNAME:My\\, calendar\r\n/);
  assert.match(ical, /DTSTART:20260817T081500Z\r\n/);
  assert.match(ical, /SUMMARY:Course\\; lecture\r\n/);
  assert.match(ical, /DESCRIPTION:Room 1\\nMore information: https:\/\/example.test\/course\r\n/);
  assert.match(ical, /LOCATION:Room\\, 1\r\n/);
  assert.match(ical, /URL:https:\/\/example.test\/course\r\n/);
  assert.match(ical, /STATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\n/);
  assert(!ical.includes("SEQUENCE:"));
  assert(ical.endsWith("END:VCALENDAR\r\n"));
});
