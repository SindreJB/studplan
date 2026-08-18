import assert from "node:assert/strict";
import test from "node:test";

import { positionEvents } from "./calendar-layout.ts";

test("overlapping events use separate columns and later events reuse free columns", () => {
  const positioned = positionEvents([
    { id: "a", startsAt: 9, endsAt: 12 },
    { id: "b", startsAt: 10, endsAt: 11 },
    { id: "c", startsAt: 11, endsAt: 13 },
    { id: "d", startsAt: 14, endsAt: 15 },
  ]);

  assert.deepEqual(
    positioned.map(({ event, column, columns }) => [event.id, column, columns]),
    [
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 1, 2],
      ["d", 0, 1],
    ],
  );
});
