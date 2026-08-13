import { SiGithub } from "@icons-pack/react-simple-icons";
import { authClient } from "@repo/auth/auth-client";
import { Button } from "@repo/ui/components/button";
import { toast } from "@repo/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GalleryVerticalEndIcon, KeyRoundIcon } from "lucide-react";

import { SignInSocialButton } from "#/components/sign-in-social-button.tsx";

export const Route = createFileRoute("/_guest/login")({
  component: LoginForm,
});

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();
  const passkeyLogin = useMutation({
    mutationFn: () => authClient.signIn.passkey(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({ type: "error", description: error.message || "Passkey sign-in failed." });
        return;
      }
      window.location.href = redirectUrl;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="flex flex-col items-center gap-2 font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-md">
              <GalleryVerticalEndIcon className="size-6" />
            </div>
            <span className="sr-only">Studplan</span>
          </Link>
          <h1 className="text-xl font-bold">Sign in to Studplan</h1>
        </div>

        <SignInSocialButton
          provider="github"
          callbackURL={redirectUrl}
          disabled={passkeyLogin.isPending}
          icon={<SiGithub className="size-4" />}
        />

        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">Or</span>
        </div>

        <Button
          variant="secondary"
          size="lg"
          disabled={passkeyLogin.isPending}
          onClick={() => passkeyLogin.mutate()}
        >
          <KeyRoundIcon />
          Sign in with a passkey
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        New here? GitHub creates your account. You can add a passkey after signing in.
      </p>
    </div>
  );
}
