import { Button } from "@repo/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { BookOpen, Trash2 } from "lucide-react";

import { CoursePicker } from "#/components/course-picker";
import {
  removeCalendarCourseMutationOptions,
  updateCalendarCourseColorMutationOptions,
  updateExcludedSeriesMutationOptions,
} from "#/lib/mutations";
import { availableCoursesQueryOptions, calendarCoursesQueryOptions } from "#/lib/queries/courses";

export const Route = createFileRoute("/_auth/app/$calendarId/")({
  loader: async ({ params, context }) => {
    const semester = context.calendar.semester;
    const [courses, selected] = await Promise.all([
      context.queryClient.ensureQueryData({
        ...availableCoursesQueryOptions(semester),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureQueryData({
        ...calendarCoursesQueryOptions(params.calendarId, semester),
        revalidateIfStale: true,
      }),
    ]);
    return { semester, courses, selected };
  },
  component: CoursesPage,
});

function CoursesPage() {
  const { calendarId } = Route.useParams();
  const { semester, courses, selected } = Route.useLoaderData();
  const router = useRouter();
  const removeCourse = useMutation(removeCalendarCourseMutationOptions());
  const updateColor = useMutation(updateCalendarCourseColorMutationOptions());
  const updateExcluded = useMutation(updateExcludedSeriesMutationOptions());

  async function refresh() {
    await router.invalidate({ sync: true });
  }

  async function toggleSeries(course: (typeof selected)[number], sourceId: string) {
    const excludedSourceIds = course.excludedSourceIds.includes(sourceId)
      ? course.excludedSourceIds.filter((id) => id !== sourceId)
      : [...course.excludedSourceIds, sourceId];
    await updateExcluded.mutateAsync({
      calendarId,
      semester,
      id: course.id,
      term: course.term,
      excludedSourceIds,
    });
    await refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Semester {semester}</p>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the course catalog and add courses to this calendar.
        </p>
      </header>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-medium">Add a course</h2>
        <CoursePicker calendarId={calendarId} semester={semester} courses={courses} />
      </section>
      <section className="space-y-3">
        <h2 className="font-medium">Added courses ({selected.length})</h2>
        {selected.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
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
                className="flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <input
                  type="color"
                  value={course.color}
                  aria-label={`Color for ${course.id}`}
                  className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                  onChange={async (event) => {
                    await updateColor.mutateAsync({
                      calendarId,
                      semester,
                      id: course.id,
                      term: course.term,
                      color: event.target.value,
                    });
                    await refresh();
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{course.id}</h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {details?.nameEn ?? details?.name ?? details?.nameNb} · term {course.term}
                  </p>
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
