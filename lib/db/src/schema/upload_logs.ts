import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const uploadLogsTable = pgTable("upload_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  importedCount: integer("imported_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUploadLogSchema = createInsertSchema(uploadLogsTable).omit({
  id: true,
  uploadedAt: true,
});
export type InsertUploadLog = z.infer<typeof insertUploadLogSchema>;
export type UploadLog = typeof uploadLogsTable.$inferSelect;
