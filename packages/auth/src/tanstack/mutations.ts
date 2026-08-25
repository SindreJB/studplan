import { mutationOptions } from "@tanstack/react-query";

import { authClient } from "../auth-client";

export const resetPasswordMutationOptions = (token: string) =>
  mutationOptions({
    mutationFn: ({ password }: { password: string }) =>
      authClient.resetPassword({ newPassword: password, token }),
  });

export const requestPasswordResetMutationOptions = (redirectTo: string) =>
  mutationOptions({
    mutationFn: ({ email }: { email: string }) =>
      authClient.requestPasswordReset({ email, redirectTo }),
  });

export const signInMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: { email: string; password: string }) => authClient.signIn.email(input),
  });

export const passkeySignInMutationOptions = () =>
  mutationOptions({ mutationFn: () => authClient.signIn.passkey() });

export const signUpMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signUp.email({ email, password, name: email }),
  });

export const addPasskeyMutationOptions = () =>
  mutationOptions({ mutationFn: () => authClient.passkey.addPasskey({ name: "My passkey" }) });

export const removePasskeyMutationOptions = () =>
  mutationOptions({ mutationFn: (id: string) => authClient.passkey.deletePasskey({ id }) });

export const changePasswordMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }),
  });

export const deleteAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ password }: { password: string }) => authClient.deleteUser({ password }),
  });
