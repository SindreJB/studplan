import {
  changePasswordMutationOptions,
  deleteAccountMutationOptions,
} from "@repo/auth/tanstack/mutations";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toast } from "@repo/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { z } from "zod";

import { FormError } from "#/components/form-error";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const deleteSchema = z.object({ password: z.string().min(1, "Enter your password") });

export const Route = createFileRoute("/_auth/app/settings")({ component: AccountSettingsPage });

function AccountSettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const changePassword = useMutation({
    ...changePasswordMutationOptions(),
    onSuccess: async ({ error }, _variables, _onMutateResult, context) => {
      await context.client.invalidateQueries({ queryKey: authQueryOptions().queryKey });
      toast.add({
        type: error ? "error" : "success",
        description: error?.message || "Password updated.",
      });
    },
  });
  const deleteAccount = useMutation({
    ...deleteAccountMutationOptions(),
    onSuccess: ({ error }, _variables, _onMutateResult, context) => {
      if (error) {
        toast.add({ type: "error", description: error.message });
        return;
      }
      context.client.setQueryData(authQueryOptions().queryKey, null);
      void navigate({ to: "/", reloadDocument: true });
    },
  });
  const passwordForm = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validators: { onSubmit: passwordSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await changePassword.mutateAsync(value);
      if (!result.error) formApi.reset();
    },
  });
  const deleteForm = useForm({
    defaultValues: { password: "" },
    validators: { onSubmit: deleteSchema },
    onSubmit: ({ value }) => {
      if (window.confirm("Permanently delete your account and all calendars?")) {
        return deleteAccount.mutateAsync(value);
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-medium">Change password</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            passwordForm.handleSubmit();
          }}
        >
          {(["currentPassword", "newPassword", "confirmPassword"] as const).map((name) => (
            <passwordForm.Field key={name} name={name}>
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    {name === "currentPassword"
                      ? "Current password"
                      : name === "newPassword"
                        ? "New password"
                        : "Confirm new password"}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FormError errors={field.state.meta.errors} />
                </div>
              )}
            </passwordForm.Field>
          ))}
          <passwordForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                Update password
              </Button>
            )}
          </passwordForm.Subscribe>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 p-5">
        <h2 className="font-medium">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This permanently deletes your calendars and account.
        </p>
        <form
          className="mt-4 flex items-start gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            deleteForm.handleSubmit();
          }}
        >
          <deleteForm.Field name="password">
            {(field) => (
              <div className="flex-1 space-y-2">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FormError errors={field.state.meta.errors} />
              </div>
            )}
          </deleteForm.Field>
          <Button
            className="mt-6"
            variant="destructive"
            type="submit"
            disabled={deleteAccount.isPending}
          >
            <Trash2 /> Delete account
          </Button>
        </form>
      </section>
    </div>
  );
}
