export interface IcalEvent {
  uid: string;
  startsAt: number;
  endsAt: number;
  summary: string;
  description?: string;
  location?: string;
}

function escape(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function timestamp(value: number) {
  return new Date(value)
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "";
  let length = 0;

  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      parts.push(part);
      part = ` ${character}`;
      length = 1 + bytes;
    } else {
      part += character;
      length += bytes;
    }
  }
  parts.push(part);
  return parts.join("\r\n");
}

export function createIcal(name: string, events: readonly IcalEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studplan//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${escape(event.uid)}`,
      `DTSTAMP:${timestamp(event.startsAt)}`,
      `DTSTART:${timestamp(event.startsAt)}`,
      `DTEND:${timestamp(event.endsAt)}`,
      `SUMMARY:${escape(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
