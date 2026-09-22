import { signInMutationOptions } from "@repo/auth/tanstack/mutations";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toast } from "@repo/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { FormError } from "#/components/form-error";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/_guest/login")({ component: LoginForm });

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();
  const navigate = useNavigate();
  const login = useMutation({
    ...signInMutationOptions(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({ type: "error", description: error.message || "Sign-in failed." });
        return;
      }
      void navigate({ to: redirectUrl, reloadDocument: true });
    },
  });
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: ({ value }) => login.mutateAsync(value),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <p className="catalog-eyebrow">Welcome back</p>
        <h1 className="catalog-display text-3xl">Sign in to Studplan</h1>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
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
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor={field.name}>Password</Label>
                <Link to="/forgot-password" className="text-sm underline underline-offset-4">
                  Forgot password?
                </Link>
              </div>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
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
            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              Sign in
            </Button>
          )}
        </form.Subscribe>
      </form>
      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link to="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  );
}
