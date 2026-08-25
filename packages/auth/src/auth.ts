import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { db } from "@repo/db";
import schema from "@repo/db/schema";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

// SAFETY: Cloudflare provides these bindings in the worker environment.
const bindings = env as {
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  EMAIL: SendEmail;
};

export const createAuth = () =>
  betterAuth({
    baseURL: bindings.APP_URL,
    secret: bindings.BETTER_AUTH_SECRET,
    telemetry: {
      enabled: false,
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),

    // https://better-auth.com/docs/integrations/tanstack#usage-tips
    plugins: [tanstackStartCookies()],

    // https://better-auth.com/docs/concepts/session-management#session-caching
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },

    user: {
      deleteUser: { enabled: true },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await bindings.EMAIL.send({
          from: `no-reply@${new URL(bindings.APP_URL).hostname}`,
          to: user.email,
          subject: "Reset your Studplan password",
          text: `Reset your Studplan password: ${url}\n\nThis link expires in one hour.`,
        });
      },
    },

    advanced: {
      database: {
        // https://better-auth.com/docs/adapters/drizzle#joins
        joins: true,
      },
    },
  });

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

// Cloudflare bindings are available per request, not while Vite loads this module.
// SAFETY: The proxy target exposes the lazily created Auth instance's contract.
const authTarget = {} as Auth;
export const auth = new Proxy(authTarget, {
  get(_, property) {
    instance ??= createAuth();
    if (!(property in instance)) return undefined;
    // SAFETY: The `in` check confirms this proxy property exists on the Auth instance.
    const value = instance[property as keyof Auth];
    return value instanceof Function ? value.bind(instance) : value;
  },
});
