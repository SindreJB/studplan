import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "@repo/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { z } from "zod";

import { FormError } from "#/components/form-error";
import {
  createCourseSubmissionMutationOptions,
  updateCourseSubmissionMutationOptions,
} from "#/lib/mutations";

export type SubmissionCourse = { id: string; term: number; label: string };

export type EditableSubmission = {
  id: string;
  courseId: string;
  term: number;
  title: string;
  dueAt: number;
  description: string | null;
  link: string | null;
};

const schema = z.object({
  course: z.string().min(1, "Pick a course"),
  title: z.string().trim().min(1, "Enter a title").max(120),
  dueAt: z.string().min(1, "Pick a due date"),
  link: z.union([z.url("Enter a valid link"), z.literal("")]),
  description: z.string().trim().max(500),
});

function courseValue(course: { id: string; term: number }) {
  return `${course.id}¤${course.term}`;
}

/** `datetime-local` inputs speak local wall-clock time without a zone suffix. */
function toDateTimeInput(value: number) {
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function SubmissionForm({
  calendarId,
  semester,
  courses,
  submission,
  onDone,
  onCancel,
}: {
  calendarId: string;
  semester: string;
  courses: SubmissionCourse[];
  submission?: EditableSubmission;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const createSubmission = useMutation(createCourseSubmissionMutationOptions());
  const updateSubmission = useMutation(updateCourseSubmissionMutationOptions());
  const router = useRouter();
  const editedCourse = submission && { id: submission.courseId, term: submission.term };
  const defaultCourse = editedCourse ?? courses[0];
  const form = useForm({
    defaultValues: {
      course: defaultCourse ? courseValue(defaultCourse) : "",
      title: submission?.title ?? "",
      dueAt: submission ? toDateTimeInput(submission.dueAt) : "",
      link: submission?.link ?? "",
      description: submission?.description ?? "",
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value, formApi }) => {
      const dueAt = new Date(value.dueAt).getTime();
      if (Number.isNaN(dueAt)) {
        toast.add({ type: "error", description: "Could not read that due date." });
        return;
      }
      const shared = {
        calendarId,
        semester,
        title: value.title.trim(),
        dueAt,
        description: value.description.trim() || null,
        link: value.link.trim() || null,
      };

      if (submission) {
        const updated = await updateSubmission.mutateAsync({
          ...shared,
          submissionId: submission.id,
        });
        if (!updated) {
          toast.add({ type: "error", description: "Could not update that deadline." });
          return;
        }
      } else {
        const course = courses.find((item) => courseValue(item) === value.course);
        if (!course) return;

        const result = await createSubmission.mutateAsync({
          ...shared,
          courseId: course.id,
          term: course.term,
        });
        if (!result.created) {
          toast.add({
            type: "error",
            description:
              result.reason === "duplicate"
                ? `${course.id} already has a deadline with that title.`
                : "That course is not in this calendar.",
          });
          return;
        }
        formApi.reset();
      }

      await router.invalidate({ sync: true });
      onDone();
    },
  });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="course">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Course</Label>
            <select
              id={field.name}
              name={field.name}
              disabled={submission != null}
              className="h-9 w-full border border-input bg-background px-3 text-sm disabled:opacity-60"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            >
              {courses.map((course) => (
                <option key={courseValue(course)} value={courseValue(course)}>
                  {course.label}
                </option>
              ))}
            </select>
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <form.Field name="dueAt">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Due</Label>
            <Input
              id={field.name}
              name={field.name}
              type="datetime-local"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <form.Field name="title">
        {(field) => (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder="Øving 3"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <form.Field name="link">
        {(field) => (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={field.name}>Link (optional)</Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder="https://..."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={field.name}>Notes (optional)</Label>
            <Textarea
              id={field.name}
              name={field.name}
              rows={2}
              placeholder="What has to be handed in?"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <div className="flex items-center gap-2 sm:col-span-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting || courses.length === 0}>
              {submission ? "Save changes" : "Add deadline"}
            </Button>
          )}
        </form.Subscribe>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
