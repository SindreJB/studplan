export function includeCourseEvent(
  event: { sourceId: string },
  excludedSourceIds: readonly string[],
) {
  return !excludedSourceIds.includes(event.sourceId);
}
