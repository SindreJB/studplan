import { authClient } from "@repo/auth/auth-client";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toast } from "@repo/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { z } from "zod";

import { FormError } from "#/components/form-error.tsx";

const signupSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const Route = createFileRoute("/_guest/signup")({ component: SignupForm });

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const signup = useMutation({
    mutationFn: ({ email, password }: z.infer<typeof signupSchema>) =>
      authClient.signUp.email({ email, password, name: email }),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({ type: "error", description: error.message || "Sign-up failed." });
        return;
      }
      window.location.href = redirectUrl;
    },
  });
  const form = useForm({
    defaultValues: { email: "", password: "", confirmPassword: "" },
    validators: { onSubmit: signupSchema },
    onSubmit: ({ value }) => signup.mutateAsync(value),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Link to="/" aria-label="Studplan">
          <CalendarDays className="size-6" />
        </Link>
        <h1 className="text-xl font-bold">Create your account</h1>
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
        {(["password", "confirmPassword"] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  {name === "password" ? "Password" : "Confirm password"}
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
            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              Sign up
            </Button>
          )}
        </form.Subscribe>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
