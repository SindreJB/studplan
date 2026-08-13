import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { passkey } from "@better-auth/passkey";
import { db } from "@repo/db";
import * as schema from "@repo/db/schema";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

const bindings = env as {
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
};

const createAuth = () =>
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
    plugins: [passkey({ rpName: "Studplan" }), tanstackStartCookies()],

    // https://better-auth.com/docs/concepts/session-management#session-caching
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },

    // https://better-auth.com/docs/concepts/oauth
    socialProviders: {
      github: {
        clientId: bindings.GITHUB_CLIENT_ID,
        clientSecret: bindings.GITHUB_CLIENT_SECRET,
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
export const auth = new Proxy({} as Auth, {
  get(_, property) {
    instance ??= createAuth();
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
