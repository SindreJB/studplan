import { resetPasswordMutationOptions } from "@repo/auth/tanstack/mutations";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { FormError } from "#/components/form-error";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const Route = createFileRoute("/_guest/reset-password")({
  validateSearch: z.object({ token: z.string().optional(), error: z.string().optional() }),
  component: ResetPasswordForm,
});

function ResetPasswordForm() {
  const { token, error } = Route.useSearch();
  const reset = useMutation({
    ...resetPasswordMutationOptions(token ?? ""),
    onSuccess: (_, _variables, _onMutateResult, context) =>
      context.client.invalidateQueries({ queryKey: authQueryOptions().queryKey }),
  });
  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: ({ value }) => reset.mutateAsync(value),
  });

  if (error || !token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="catalog-display text-3xl">Invalid reset link</h1>
        <Link to="/forgot-password" className="text-sm underline underline-offset-4">
          Request another link
        </Link>
      </div>
    );
  }

  if (reset.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="catalog-display text-3xl">Password updated</h1>
        <Link to="/login" className="text-sm underline underline-offset-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <h1 className="catalog-display text-3xl">Choose a new password</h1>
      {(["password", "confirmPassword"] as const).map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                {name === "password" ? "New password" : "Confirm password"}
              </Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FormError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>
      ))}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button className="w-full" type="submit" disabled={!canSubmit || isSubmitting}>
            Update password
          </Button>
        )}
      </form.Subscribe>
      {reset.isError && <p className="text-sm text-destructive">Could not reset the password.</p>}
    </form>
  );
}
