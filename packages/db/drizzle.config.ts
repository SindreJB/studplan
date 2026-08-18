import type { Config } from "drizzle-kit";

export default {
  out: "./migrations",
  schema: "./src/schema/*.schema.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "sqlite",
} satisfies Config;
