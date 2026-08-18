import assert from "node:assert/strict";
import test from "node:test";

import { getCourseSchedule } from "./tp.server.ts";

test("an empty course selection is rejected before fetching the full schedule", async () => {
  const result = await getCourseSchedule("26h", []);

  assert(result.isErr());
  assert.equal(result.error.kind, "input");
});
