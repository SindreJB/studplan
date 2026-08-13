import { authClient } from "@repo/auth/auth-client";
import { Button } from "@repo/ui/components/button";
import { toast } from "@repo/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";

export function AddPasskeyButton() {
  const mutation = useMutation({
    mutationFn: () => authClient.passkey.addPasskey({ name: "My passkey" }),
    onSuccess: ({ error }) => {
      toast.add({
        type: error ? "error" : "success",
        description: error?.message || "Passkey added.",
      });
    },
  });

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <KeyRoundIcon />
      Add passkey
    </Button>
  );
}
