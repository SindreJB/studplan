import { Button } from "@repo/ui/components/button";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { BookOpen, Trash2 } from "lucide-react";

import { CoursePicker } from "#/components/course-picker";
import {
  removeCalendarCourseMutationOptions,
  updateCalendarCourseColorMutationOptions,
  updateExcludedSeriesMutationOptions,
  updateIncludeExamDatesMutationOptions,
  updateIncludeSubmissionDatesMutationOptions,
} from "#/lib/mutations";
import { availableCoursesQueryOptions, calendarCoursesQueryOptions } from "#/lib/queries/courses";

export const Route = createFileRoute("/_auth/app/$calendarId/")({
  loader: async ({ params, context }) => {
    const semester = context.calendar.semester;
    await Promise.all([
      context.queryClient.fetchQuery(availableCoursesQueryOptions(semester)),
      context.queryClient.fetchQuery(calendarCoursesQueryOptions(params.calendarId, semester)),
    ]);
    return { semester };
  },
  component: CoursesPage,
});

function CoursesPage() {
  const { calendarId } = Route.useParams();
  const { semester } = Route.useLoaderData();
  const { data: courses } = useSuspenseQuery(availableCoursesQueryOptions(semester));
  const { data: selected } = useSuspenseQuery(calendarCoursesQueryOptions(calendarId, semester));
  const router = useRouter();
  const removeCourse = useMutation(removeCalendarCourseMutationOptions());
  const updateColor = useMutation(updateCalendarCourseColorMutationOptions());
  const updateExcluded = useMutation(updateExcludedSeriesMutationOptions());
  const updateIncludeExamDates = useMutation(updateIncludeExamDatesMutationOptions());
  const updateIncludeSubmissionDates = useMutation(updateIncludeSubmissionDatesMutationOptions());

  async function refresh() {
    await router.invalidate({ sync: true });
  }

  function toggleSeries(course: (typeof selected)[number], sourceId: string) {
    const excludedSourceIds = course.excludedSourceIds.includes(sourceId)
      ? course.excludedSourceIds.filter((id) => id !== sourceId)
      : [...course.excludedSourceIds, sourceId];
    updateExcluded.mutate(
      {
        calendarId,
        semester,
        id: course.id,
        term: course.term,
        excludedSourceIds,
      },
      { onSuccess: () => void refresh() },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="border-b border-border pb-5">
        <p className="catalog-eyebrow">Semester {semester}</p>
        <h1 className="catalog-display text-4xl">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the course catalog and add courses to this calendar.
        </p>
      </header>
      <section className="border border-border p-5">
        <h2 className="catalog-eyebrow mb-3">Add a course</h2>
        <CoursePicker calendarId={calendarId} semester={semester} courses={courses} />
      </section>
      <section className="space-y-3">
        <h2 className="catalog-eyebrow">Added courses ({selected.length})</h2>
        {selected.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-3 size-8" />
            <p>No courses added yet.</p>
          </div>
        ) : (
          selected.map((course) => {
            const details = courses.find(
              (item) => item.id === course.id && item.term === course.term,
            );
            return (
              <article
                key={`${course.id}-${course.term}`}
                className="flex items-center gap-4 border border-border p-4"
              >
                <input
                  type="color"
                  value={course.color}
                  aria-label={`Color for ${course.id}`}
                  className="size-9 shrink-0 cursor-pointer border border-border bg-transparent p-1"
                  onChange={(event) => {
                    updateColor.mutate({
                      calendarId,
                      semester,
                      id: course.id,
                      term: course.term,
                      color: event.target.value,
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold tracking-tight">{course.id}</h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {details?.nameEn ?? details?.name ?? details?.nameNb} · term {course.term}
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={course.includeExamDates}
                      onChange={(event) => {
                        updateIncludeExamDates.mutate({
                          calendarId,
                          semester,
                          id: course.id,
                          term: course.term,
                          includeExamDates: event.target.checked,
                        });
                      }}
                    />
                    Include exam dates
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={course.includeSubmissionDates}
                      onChange={(event) => {
                        updateIncludeSubmissionDates.mutate({
                          calendarId,
                          semester,
                          id: course.id,
                          term: course.term,
                          includeSubmissionDates: event.target.checked,
                        });
                      }}
                    />
                    Include submission due dates
                  </label>
                  {course.series.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Repeating events ({course.series.length})
                      </summary>
                      <div className="mt-2 grid gap-2">
                        {course.series.map((series) => (
                          <label className="flex items-start gap-2" key={series.sourceId}>
                            <input
                              className="mt-0.5"
                              type="checkbox"
                              checked={!course.excludedSourceIds.includes(series.sourceId)}
                              onChange={() => toggleSeries(course, series.sourceId)}
                            />
                            <span>
                              {format(series.startsAt, "EEE HH:mm")}–
                              {format(series.endsAt, "HH:mm")} · {series.summary ?? "Class"}
                              {series.room && ` · ${series.room}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${course.id}`}
                  onClick={async () => {
                    await removeCourse.mutateAsync({
                      calendarId,
                      semester,
                      id: course.id,
                      term: course.term,
                    });
                    await refresh();
                  }}
                >
                  <Trash2 />
                </Button>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
