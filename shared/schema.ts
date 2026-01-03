import { pgTable, text, serial, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(), // Format: YYYY-MM-DD
  title: text("title").notNull(),
  scriptureReference: text("scripture_reference").notNull(),
  scriptureText: text("scripture_text").notNull(),
  content: text("content").notNull(),
  prayerPoints: text("prayer_points").array().notNull(),
  faithDeclarations: text("faith_declarations").array().notNull(),
  author: text("author").default("Rev. Moses Afolabi"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDevotionalSchema = createInsertSchema(devotionals).omit({
  id: true,
  createdAt: true,
});

export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = z.infer<typeof insertDevotionalSchema>;

// Request Types
export type CreateDevotionalRequest = InsertDevotional;
export type UpdateDevotionalRequest = Partial<InsertDevotional>;

// Response Types
export type DevotionalResponse = Devotional;
