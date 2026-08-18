import { defineRelations } from "drizzle-orm/relations";

import * as authSchema from "./auth.schema";
import * as courseSchema from "./course.schema";

const { authRelations, ...authTables } = authSchema;
const { courseRelations, ...courseTables } = courseSchema;

export { authRelations, courseRelations };
export type { CourseCatalogItem, CourseScheduleEvent } from "./course.schema";

export const schema = { ...authTables, ...courseTables };
export default schema;

export const relations = defineRelations(schema, () => ({}));
