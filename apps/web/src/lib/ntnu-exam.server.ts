import { Result, TaggedError } from "better-result";
import { z } from "zod";

const NTNU_URL = "https://www.ntnu.no";
const OSLO_TIME_ZONE = "Europe/Oslo";

const buildingResponseSchema = z.object({
  buildings: z.array(
    z.object({
      buildingName: z.string(),
      buildingNr: z.string(),
      url: z.url(),
    }),
  ),
});

export interface ExamLocation {
  buildingNumber: string;
  buildingName: string;
  rooms: string[];
  mazeMapUrl: string | null;
}

export interface NtnuExam {
  courseCode: string;
  occasion: string | null;
  term: string | null;
  form: string;
  startsAt: number;
  endsAt: number;
  deferred: boolean;
  locations: ExamLocation[];
  sourceUrl: string;
}

export class NtnuExamApiError extends TaggedError("NtnuExamApiError")<{
  kind: "input" | "network" | "http" | "validation";
  message: string;
  url: string;
  cause?: unknown;
  httpStatus?: number;
}> {}

const entities = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  oslash: "ø",
  Oslash: "Ø",
  aring: "å",
  Aring: "Å",
  aelig: "æ",
  AElig: "Æ",
} satisfies Record<string, string>;

function isNamedEntity(code: string): code is keyof typeof entities {
  return Object.hasOwn(entities, code);
}

function decodeEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return isNamedEntity(code) ? entities[code] : entity;
  });
}

function textOf(fragment: string) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function dateParts(value: string) {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) } : null;
}

function timeParts(value: string) {
  const match = value.match(/(?:^|\D)([01]\d|2[0-3]):([0-5]\d)(?:\D|$)/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

const osloFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: OSLO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function osloTimestamp(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  const expected = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let timestamp = expected;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = Object.fromEntries(
      osloFormatter
        .formatToParts(timestamp)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const represented = Date.UTC(
      actual.year ?? 0,
      (actual.month ?? 1) - 1,
      actual.day ?? 1,
      actual.hour ?? 0,
      actual.minute ?? 0,
      actual.second ?? 0,
    );
    timestamp -= represented - expected;
  }
  return timestamp;
}

function durationMilliseconds(value: string | null) {
  if (!value) return 60 * 60_000;
  const match = value.match(
    /([\d,.]+)\s*(minutter?|minutes?|timer?|hours?|dager?|døgn|days?|uker?|weeks?)/i,
  );
  if (!match) return 60 * 60_000;
  const amount = Number(match[1]?.replace(",", "."));
  const unit = match[2]?.toLowerCase() ?? "";
  if (unit.startsWith("min")) return amount * 60_000;
  if (unit.startsWith("dag") || unit === "døgn" || unit.startsWith("day")) {
    return amount * 24 * 60 * 60_000;
  }
  if (unit.startsWith("uke") || unit.startsWith("week")) return amount * 7 * 24 * 60 * 60_000;
  return amount * 60 * 60_000;
}

function semesterMatches(term: string | null, semester: string) {
  const year = `20${semester.slice(0, 2)}`;
  const season = semester.endsWith("v") ? /vår|spring/i : /høst|autumn/i;
  return term?.includes(year) === true && season.test(term);
}

function parseLocations(chunk: string): ExamLocation[] {
  const locations: ExamLocation[] = [];
  const pattern =
    /class="exam-fact-location-label[^" ]*[^" ]*\s+building-code-(\d+)[^"]*">([^<]*)<|<div class="exam-room">\s*(?:Rom|Room)\s*<span>([^<]*)<\/span>/g;
  let current: ExamLocation | undefined;
  for (const match of chunk.matchAll(pattern)) {
    if (match[1]) {
      current = {
        buildingNumber: match[1],
        buildingName: textOf(match[2] ?? ""),
        rooms: [],
        mazeMapUrl: null,
      };
      locations.push(current);
    } else if (current && match[3]) {
      current.rooms.push(textOf(match[3]));
    }
  }
  return locations;
}

export function parseCourseExams(
  html: string,
  courseCode: string,
  semester: string,
  sourceUrl: string,
) {
  const exams: NtnuExam[] = [];
  let occasion: string | null = null;
  let term: string | null = null;

  for (const chunk of html.split('<div class="exam-element">').slice(1)) {
    const heading = chunk.match(/course-exam-heading2">([^<]*)</)?.[1];
    if (heading) {
      const [nextOccasion, nextTerm] = textOf(heading).split(/\s+-\s+/, 2);
      occasion = nextOccasion || null;
      term = nextTerm || null;
    }
    if (!semesterMatches(term, semester)) continue;

    const form = textOf(chunk.match(/exam-form">([^<]*)/)?.[1] ?? "");
    let date: ReturnType<typeof dateParts> = null;
    let time: ReturnType<typeof timeParts> = null;
    let duration: string | null = null;
    let pendingLabel: string | null = null;

    for (const span of chunk.matchAll(/<span class="(exam-item[^"]*)">([\s\S]*?)<\/span>/g)) {
      const classes = span[1] ?? "";
      const value = textOf(span[2] ?? "");
      if (classes.includes("exam-fact-label")) {
        pendingLabel = value.toLowerCase();
      } else if (pendingLabel === "dato" || pendingLabel === "date") {
        date = dateParts(value);
        pendingLabel = null;
      } else if (pendingLabel === "tid" || pendingLabel === "time") {
        time = timeParts(value);
        pendingLabel = null;
      } else if (pendingLabel === "varighet" || pendingLabel === "duration") {
        duration = value;
        pendingLabel = null;
      }
    }

    if (!form || !date || !time) continue;
    const startsAt = osloTimestamp({ ...date, ...time });
    exams.push({
      courseCode,
      occasion,
      term,
      form,
      startsAt,
      endsAt: startsAt + durationMilliseconds(duration),
      deferred: /utsatt|kont|re-sit/i.test(occasion ?? ""),
      locations: parseLocations(chunk),
      sourceUrl,
    });
  }
  return exams;
}

async function fetchBuildings(buildingNumbers: string[]) {
  if (buildingNumbers.length === 0) return new Map<string, string>();
  const url = new URL("/web/studier/emner", NTNU_URL);
  url.search = new URLSearchParams({
    p_p_id: "coursedetailsportlet_WAR_courselistportlet",
    p_p_lifecycle: "2",
    p_p_resource_id: "building",
    buildings: [...new Set(buildingNumbers)].join(","),
  }).toString();
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new NtnuExamApiError({
      kind: "http",
      message: `NTNU returned HTTP ${response.status}`,
      url: url.href,
      httpStatus: response.status,
    });
  }
  const parsed = buildingResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new NtnuExamApiError({
      kind: "validation",
      message: "NTNU returned unexpected building data",
      url: url.href,
      cause: parsed.error,
    });
  }
  return new Map(parsed.data.buildings.map((building) => [building.buildingNr, building.url]));
}

export async function getCourseExams(courseCode: string, semester: string) {
  const normalizedCode = courseCode.trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(normalizedCode) || !/^\d{2}[vh]$/.test(semester)) {
    return Result.err(
      new NtnuExamApiError({
        kind: "input",
        message: "Invalid course code or semester",
        url: NTNU_URL,
      }),
    );
  }

  const year = `20${semester.slice(0, 2)}`;
  const url = new URL(`/studier/emner/${normalizedCode}/${year}`, NTNU_URL);
  const responseResult = await Result.tryPromise({
    try: () => fetch(url, { headers: { Accept: "text/html" } }),
    catch: (cause) =>
      new NtnuExamApiError({
        kind: "network",
        message: "Could not reach NTNU",
        url: url.href,
        cause,
      }),
  });
  if (responseResult.isErr()) return Result.err(responseResult.error);
  if (!responseResult.value.ok) {
    return Result.err(
      new NtnuExamApiError({
        kind: "http",
        message: `NTNU returned HTTP ${responseResult.value.status}`,
        url: url.href,
        httpStatus: responseResult.value.status,
      }),
    );
  }

  const exams = parseCourseExams(
    await responseResult.value.text(),
    normalizedCode,
    semester,
    url.href,
  );
  const buildingNumbers = exams.flatMap((exam) =>
    exam.locations.map((location) => location.buildingNumber),
  );
  const mapsResult = await Result.tryPromise({
    try: () => fetchBuildings(buildingNumbers),
    catch: (cause) =>
      cause instanceof NtnuExamApiError
        ? cause
        : new NtnuExamApiError({
            kind: "network",
            message: "Could not load NTNU building data",
            url: url.href,
            cause,
          }),
  });
  if (mapsResult.isErr()) return Result.err(mapsResult.error);

  return Result.ok(
    exams.map((exam) => ({
      ...exam,
      locations: exam.locations.map((location) => ({
        ...location,
        mazeMapUrl: mapsResult.value.get(location.buildingNumber) ?? null,
      })),
    })),
  );
}
