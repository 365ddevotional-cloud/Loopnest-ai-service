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

// Prayer Request Priority Types
export const PRAYER_PRIORITIES = [
  "prayer_normal",
  "prayer_urgent", 
  "counseling_normal",
  "counseling_urgent"
] as const;

export const PRAYER_STATUSES = ["new", "replied", "closed"] as const;

export const PRAYER_CATEGORIES = [
  "healing",
  "marriage",
  "finance",
  "deliverance",
  "guidance",
  "family",
  "salvation",
  "other"
] as const;

export const prayerCategorySchema = z.enum(PRAYER_CATEGORIES);

// Prayer Requests Table
export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  email: text("email"),
  subject: text("subject"),
  message: text("message").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  priority: text("priority").default("prayer_normal").notNull(),
  category: text("category").default("other").notNull(),
  status: text("status").default("new").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests).omit({
  id: true,
  isRead: true,
  status: true,
  createdAt: true,
}).extend({
  category: prayerCategorySchema.optional().default("other"),
});

export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;

// Thread Messages Table (for conversations)
export const threadMessages = pgTable("thread_messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  message: text("message").notNull(),
  senderType: text("sender_type").notNull(), // 'user' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertThreadMessageSchema = createInsertSchema(threadMessages).omit({
  id: true,
  createdAt: true,
});

export type ThreadMessage = typeof threadMessages.$inferSelect;
export type InsertThreadMessage = z.infer<typeof insertThreadMessageSchema>;

// Prayer Request Replies Table (keeping for backward compatibility)
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

// Auto-Reply Templates Table
export const autoReplyTemplates = pgTable("auto_reply_templates", {
  id: serial("id").primaryKey(),
  templateType: text("template_type").notNull().unique(), // prayer_normal, prayer_urgent, counseling_normal, counseling_urgent
  encouragement: text("encouragement").notNull(),
  scriptureReference: text("scripture_reference").notNull(),
  scriptureText: text("scripture_text").notNull(),
  prayer: text("prayer").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAutoReplyTemplateSchema = createInsertSchema(autoReplyTemplates).omit({
  id: true,
  updatedAt: true,
});

export type AutoReplyTemplate = typeof autoReplyTemplates.$inferSelect;
export type InsertAutoReplyTemplate = z.infer<typeof insertAutoReplyTemplateSchema>;

// File Attachments Table (for prayer request attachments)
export const prayerAttachments = pgTable("prayer_attachments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrayerAttachmentSchema = createInsertSchema(prayerAttachments).omit({
  id: true,
  createdAt: true,
});

export type PrayerAttachment = typeof prayerAttachments.$inferSelect;
export type InsertPrayerAttachment = z.infer<typeof insertPrayerAttachmentSchema>;
