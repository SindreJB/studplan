import { requestPasswordResetMutationOptions } from "@repo/auth/tanstack/mutations";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { FormError } from "#/components/form-error";

import { Route as ResetPasswordRoute } from "./reset-password";

const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email address") });

export const Route = createFileRoute("/_guest/forgot-password")({
  component: ForgotPasswordForm,
});

function ForgotPasswordForm() {
  const reset = useMutation({
    ...requestPasswordResetMutationOptions(
      () => new URL(ResetPasswordRoute.fullPath, window.location.origin).href,
    ),
    onSuccess: (_, _variables, _onMutateResult, context) =>
      context.client.invalidateQueries({ queryKey: authQueryOptions().queryKey }),
  });
  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: forgotPasswordSchema },
    onSubmit: ({ value }) => reset.mutateAsync(value),
  });

  if (reset.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="catalog-display text-3xl">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for that address, we sent a password reset link.
        </p>
        <Link to="/login" className="text-sm underline underline-offset-4">
          Back to sign in
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
      <div>
        <h1 className="catalog-display text-3xl">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We will email you a reset link.</p>
      </div>
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              autoComplete="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            <FormError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button className="w-full" type="submit" disabled={!canSubmit || isSubmitting}>
            Send reset link
          </Button>
        )}
      </form.Subscribe>
      {reset.isError && <p className="text-sm text-destructive">Could not send the reset link.</p>}
    </form>
  );
}
