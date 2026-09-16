import { Button } from "@repo/ui/components/button";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { ClipboardList, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { SubmissionForm, type SubmissionCourse } from "#/components/submission-form";
import { deleteCourseSubmissionMutationOptions } from "#/lib/mutations";
import { availableCoursesQueryOptions, calendarCoursesQueryOptions } from "#/lib/queries/courses";
import { calendarSubmissionsQueryOptions } from "#/lib/queries/submissions";

export const Route = createFileRoute("/_auth/app/$calendarId/submissions")({
  loader: async ({ params, context }) => {
    const semester = context.calendar.semester;
    await Promise.all([
      context.queryClient.fetchQuery(availableCoursesQueryOptions(semester)),
      context.queryClient.fetchQuery(calendarCoursesQueryOptions(params.calendarId, semester)),
      context.queryClient.fetchQuery(calendarSubmissionsQueryOptions(params.calendarId, semester)),
    ]);
    // Split upcoming from past against the load time: a value read during render
    // would differ between the server and client passes.
    return { semester, loadedAt: Date.now() };
  },
  component: SubmissionsPage,
});

function courseKey(courseId: string, term: number) {
  return `${courseId}¤${term}`;
}

function SubmissionsPage() {
  const { calendarId } = Route.useParams();
  const { semester, loadedAt } = Route.useLoaderData();
  const { data: catalog } = useSuspenseQuery(availableCoursesQueryOptions(semester));
  const { data: calendarCourses } = useSuspenseQuery(
    calendarCoursesQueryOptions(calendarId, semester),
  );
  const { data: submissions } = useSuspenseQuery(
    calendarSubmissionsQueryOptions(calendarId, semester),
  );
  const router = useRouter();
  const deleteSubmission = useMutation(deleteCourseSubmissionMutationOptions());
  const [editingId, setEditingId] = useState<string | null>(null);

  const courses: SubmissionCourse[] = calendarCourses.map((course) => {
    const details = catalog.find((item) => item.id === course.id && item.term === course.term);
    const name = details?.nameEn ?? details?.name ?? details?.nameNb;
    return {
      id: course.id,
      term: course.term,
      label: name ? `${course.id} · ${name}` : course.id,
    };
  });
  const coursesByKey = new Map(
    calendarCourses.map((course) => [courseKey(course.id, course.term), course]),
  );
  const upcoming = submissions.filter((submission) => submission.dueAt >= loadedAt);
  const past = submissions.filter((submission) => submission.dueAt < loadedAt);

  async function removeSubmission(submissionId: string, title: string) {
    if (!window.confirm(`Delete "${title}" for everyone using this course?`)) return;

    await deleteSubmission.mutateAsync({ calendarId, semester, submissionId });
    await router.invalidate({ sync: true });
  }

  function renderSubmission(submission: (typeof submissions)[number]) {
    const course = coursesByKey.get(courseKey(submission.courseId, submission.term));

    if (editingId === submission.id) {
      return (
        <article className="rounded-xl border bg-card p-4" key={submission.id}>
          <SubmissionForm
            calendarId={calendarId}
            semester={semester}
            courses={courses}
            submission={submission}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        </article>
      );
    }

    return (
      <article className="flex items-start gap-4 rounded-xl border bg-card p-4" key={submission.id}>
        <span
          aria-hidden
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: course?.color ?? "#6366f1" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-medium">{submission.title}</h3>
            <span className="text-sm text-muted-foreground">
              {submission.courseId} · term {submission.term}
            </span>
          </div>
          <p className="text-sm">{format(submission.dueAt, "EEE d MMM yyyy 'at' HH:mm")}</p>
          {submission.description && (
            <p className="mt-1 text-sm text-muted-foreground">{submission.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Added by {submission.isMine ? "you" : (submission.createdByName ?? "someone")}
            </span>
            {course && !course.includeSubmissionDates && (
              <span>Not in your filtered calendar feed</span>
            )}
            {submission.link && (
              <a
                className="inline-flex items-center gap-1 hover:text-primary"
                href={submission.link}
                target="_blank"
                rel="noreferrer noopener"
              >
                Link <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Edit ${submission.title}`}
            onClick={() => setEditingId(submission.id)}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Delete ${submission.title}`}
            onClick={async () => {
              await removeSubmission(submission.id, submission.title);
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Semester {semester}</p>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deadlines for the assignments in your courses. They are shared with everyone taking the
          course, so anyone can add and correct them. The full calendar feed always includes them;
          the filtered feed follows the &ldquo;Include submission due dates&rdquo; choice on the{" "}
          <Link
            className="underline underline-offset-4 hover:text-primary"
            to="/app/$calendarId"
            params={{ calendarId }}
          >
            Courses
          </Link>{" "}
          page.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 size-8" />
          <p>
            Add a course on the{" "}
            <Link
              className="underline underline-offset-4 hover:text-primary"
              to="/app/$calendarId"
              params={{ calendarId }}
            >
              Courses
            </Link>{" "}
            page before adding deadlines.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-medium">Add a deadline</h2>
            <SubmissionForm
              calendarId={calendarId}
              semester={semester}
              courses={courses}
              onDone={() => setEditingId(null)}
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-medium">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-3 size-8" />
                <p>No upcoming deadlines registered.</p>
              </div>
            ) : (
              upcoming.map(renderSubmission)
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-medium">Past ({past.length})</h2>
              <div className="space-y-3 opacity-60">{past.map(renderSubmission)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
