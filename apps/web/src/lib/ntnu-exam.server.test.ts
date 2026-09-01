import assert from "node:assert/strict";
import test from "node:test";

import { parseCourseExams } from "./ntnu-exam.server";

const html = `
<div class="exam-element">
  <h4 class="h3 course-exam-heading2">Ordinær eksamen - Vår 2026</h4>
  <h5 class="h4 exam-form">Skriftlig skoleeksamen</h5>
  <span class="exam-item exam-fact-label">Dato</span><span class="exam-item">18.05.2026</span>
  <span class="exam-item exam-fact-label">Tid</span><span class="exam-item">09:00</span>
  <span class="exam-item exam-fact-label">Varighet</span><span class="exam-item">4 timer</span>
  <span class="exam-fact-location-label building-code-485">Sluppenvegen 14</span>
  <div class="exam-room">Rom <span>SL111 grønn sone</span></div>
</div>`;

test("parses an NTNU exam in Europe/Oslo with its building and rooms", () => {
  const [exam] = parseCourseExams(
    html,
    "IDATT2101",
    "26v",
    "https://www.ntnu.no/studier/emner/IDATT2101/2026",
  );

  assert(exam);
  assert.equal(new Date(exam.startsAt).toISOString(), "2026-05-18T07:00:00.000Z");
  assert.equal(new Date(exam.endsAt).toISOString(), "2026-05-18T11:00:00.000Z");
  assert.deepEqual(exam.locations, [
    {
      buildingNumber: "485",
      buildingName: "Sluppenvegen 14",
      rooms: ["SL111 grønn sone"],
      mazeMapUrl: null,
    },
  ]);
});

test("does not return exams from another semester", () => {
  assert.equal(parseCourseExams(html, "IDATT2101", "26h", "https://example.test").length, 0);
});
