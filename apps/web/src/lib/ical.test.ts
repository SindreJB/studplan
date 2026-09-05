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

test("refreshes event timestamps at eight-hour UTC boundaries while preserving identity", () => {
  const events = [
    {
      uid: "event-1@example.test",
      startsAt: Date.UTC(2026, 8, 11, 12, 15),
      endsAt: Date.UTC(2026, 8, 11, 14),
      summary: "Class",
    },
  ];

  for (const hour of [0, 8, 16]) {
    const boundary = Date.UTC(2026, 8, 5, hour);
    const initial = createIcal("Calendar", events, boundary);
    const withinWindow = createIcal("Calendar", events, boundary + 8 * 60 * 60 * 1000 - 1);
    const nextWindow = createIcal("Calendar", events, boundary + 8 * 60 * 60 * 1000);
    const expected = `20260905T${String(hour).padStart(2, "0")}0000Z`;

    assert.equal(initial, withinWindow);
    assert(initial.includes(`DTSTAMP:${expected}\r\nLAST-MODIFIED:${expected}\r\n`));
    assert.notEqual(initial, nextWindow);
    assert(nextWindow.includes("UID:event-1@example.test\r\n"));
    assert(nextWindow.includes("DTSTART:20260911T121500Z\r\n"));
    assert(nextWindow.includes("DTEND:20260911T140000Z\r\n"));
  }
});
