import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import { relations, authRelations, courseRelations } from "./schema";

// SAFETY: Cloudflare provides the D1 binding in the worker environment.
const bindings = env as { DB: D1Database };

export const db = drizzle(bindings.DB, {
  // Relation parts must follow the main relation map. Their order preserves all inferred fields.
  // https://orm.drizzle.team/docs/sqlite/relations#relations-parts
  relations: { ...relations, ...authRelations, ...courseRelations },
});
