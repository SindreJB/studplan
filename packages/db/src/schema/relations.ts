import { defineRelations } from "drizzle-orm";

import * as schema from "./";

export const relations = defineRelations(schema, () => ({
  // Define your relations here
  // https://orm.drizzle.team/docs/relations-v2
}));
