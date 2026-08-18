import assert from "node:assert/strict";
import test from "node:test";

import { includeCourseEvent } from "./course-event-filter.ts";

test("course event filtering is a blacklist", () => {
  const excludedSourceIds = ["hidden-series"];

  assert(includeCourseEvent({ sourceId: "existing-series" }, excludedSourceIds));
  assert(includeCourseEvent({ sourceId: "future-series" }, excludedSourceIds));
  assert(!includeCourseEvent({ sourceId: "hidden-series" }, excludedSourceIds));
});
