import { authClient } from "@repo/auth/auth-client";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <Button
      aria-label="Sign out"
      title="Sign out"
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onResponse: async () => {
              queryClient.setQueryData(authQueryOptions().queryKey, null);
              await router.invalidate();
            },
          },
        })
      }
      type="button"
      variant="destructive"
      size="icon"
    >
      <LogOut />
    </Button>
  );
}
