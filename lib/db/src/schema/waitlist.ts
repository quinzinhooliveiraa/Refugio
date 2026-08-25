import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const waitlistTable = pgTable(
  "refugio_waitlist",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    intent: text("intent").notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUniqueIndex: uniqueIndex("refugio_waitlist_email_lower_idx").on(sql`lower(${table.email})`),
  }),
);

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({
  id: true,
  createdAt: true,
});

export const waitlistIntentSchema = z.enum(["desabafar", "ajudar", "os-dois"]);
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlistTable.$inferSelect;