import { passkeySignInMutationOptions, signInMutationOptions } from "@repo/auth/tanstack/mutations";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toast } from "@repo/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, KeyRoundIcon } from "lucide-react";
import { z } from "zod";

import { FormError } from "#/components/form-error";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/_guest/login")({ component: LoginForm });

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();
  const login = useMutation({
    ...signInMutationOptions(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({ type: "error", description: error.message || "Sign-in failed." });
        return;
      }
      window.location.href = redirectUrl;
    },
  });
  const passkeyLogin = useMutation({
    ...passkeySignInMutationOptions(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({ type: "error", description: error.message || "Passkey sign-in failed." });
        return;
      }
      window.location.href = redirectUrl;
    },
  });
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: ({ value }) => login.mutateAsync(value),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Link to="/" aria-label="Studplan">
          <CalendarDays className="size-6" />
        </Link>
        <h1 className="text-xl font-bold">Sign in to Studplan</h1>
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
              disabled={!canSubmit || isSubmitting || passkeyLogin.isPending}
            >
              Sign in
            </Button>
          )}
        </form.Subscribe>
      </form>
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:border-t">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">or</span>
      </div>
      <Button
        variant="secondary"
        size="lg"
        disabled={login.isPending || passkeyLogin.isPending}
        onClick={() => passkeyLogin.mutate()}
      >
        <KeyRoundIcon />
        Sign in with a passkey
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link to="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  );
}
