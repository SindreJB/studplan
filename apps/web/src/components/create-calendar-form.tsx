import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { z } from "zod";

import { FormError } from "#/components/form-error";
import { createCalendarMutationOptions } from "#/lib/mutations";
import { currentSemester, semesterOptions } from "#/lib/semester";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a calendar name").max(100),
  semester: z.string().regex(/^\d{2}[vh]$/),
});

export function CreateCalendarForm() {
  const createCalendar = useMutation(createCalendarMutationOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const form = useForm({
    defaultValues: { name: "", semester: currentSemester() },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const calendar = await createCalendar.mutateAsync(value);
      if (!calendar) return;
      await navigate({ to: "/app/$calendarId", params: { calendarId: calendar.id } });
      await router.invalidate({ sync: true });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center">
      <div className="w-full border border-border p-6 ">
        <span className="mb-5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarPlus />
        </span>
        <h1 className="catalog-display text-4xl">Create a calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give it a name. You can add courses next.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Calendar name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Autumn semester"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FormError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
          <form.Field name="semester">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Semester</Label>
                <select
                  id={field.name}
                  name={field.name}
                  className="h-9 w-full border border-input bg-background px-3 text-sm"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                >
                  {semesterOptions().map((semester) => (
                    <option key={semester.value} value={semester.value}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button className="w-full" type="submit" disabled={!canSubmit || isSubmitting}>
                Create calendar
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
