import { pgTable, text, serial, date, timestamp, boolean, integer } from "drizzle-orm/pg-core";
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

// Prayer Requests Table
export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;

// Prayer Request Replies Table
export const prayerReplies = pgTable("prayer_replies", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  replyMessage: text("reply_message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrayerReplySchema = createInsertSchema(prayerReplies).omit({
  id: true,
  createdAt: true,
});

export type PrayerReply = typeof prayerReplies.$inferSelect;
export type InsertPrayerReply = z.infer<typeof insertPrayerReplySchema>;
