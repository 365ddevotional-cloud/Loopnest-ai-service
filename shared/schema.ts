import { pgTable, text, serial, date, timestamp, boolean, integer, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bible Translation Types
export const BIBLE_TRANSLATIONS = ["KJV", "WEB", "ASV", "DRB"] as const;
export type BibleTranslation = typeof BIBLE_TRANSLATIONS[number];
export const bibleTranslationSchema = z.enum(BIBLE_TRANSLATIONS);

// Bible Passages Table - stores scripture text by reference and translation
export const biblePassages = pgTable("bible_passages", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(), // e.g., "John 3:16", "Psalm 23:1-6"
  translation: text("translation").notNull(), // KJV, WEB, ASV, DRB
  content: text("content").notNull(), // The actual scripture text
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRefTranslation: unique().on(table.reference, table.translation),
}));

export const insertBiblePassageSchema = createInsertSchema(biblePassages).omit({
  id: true,
  createdAt: true,
});

export type BiblePassage = typeof biblePassages.$inferSelect;
export type InsertBiblePassage = z.infer<typeof insertBiblePassageSchema>;

export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(), // Format: YYYY-MM-DD
  title: text("title").notNull(),
  scriptureReference: text("scripture_reference").notNull(),
  scriptureText: text("scripture_text").notNull(),
  content: text("content").notNull(),
  prayerPoints: text("prayer_points").array().notNull(),
  faithDeclarations: text("faith_declarations").array().notNull(),
  author: text("author").default("Moses Afolabi"),
  createdAt: timestamp("created_at").defaultNow(),
  // Soft-delete: When true, devotional is hidden but not permanently removed
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  // Red Letter Scripture: When true, renders divine speech (God/Jesus) in red
  redLetterEnabled: boolean("red_letter_enabled").default(true),
  // Seasonal Override: When true, marks devotional as a seasonal entry (Easter, Christmas, etc.)
  seasonalOverride: boolean("seasonal_override").default(false),
  // Christian Quotes: newline-separated quotes
  christianQuotes: text("christian_quotes"),
  // Prophetic Declaration: paragraph text
  propheticDeclaration: text("prophetic_declaration"),
});

export const insertDevotionalSchema = createInsertSchema(devotionals).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  deletedAt: true,
});

export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = z.infer<typeof insertDevotionalSchema>;

export const devotionalTranslations = pgTable("devotional_translations", {
  id: serial("id").primaryKey(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  devotionalMessage: text("devotional_message").notNull(),
  prayerPoints: text("prayer_points").array().notNull(),
  faithDeclarations: text("faith_declarations").array().notNull(),
  christianQuotes: text("christian_quotes"),
  propheticDeclaration: text("prophetic_declaration"),
  scriptureTextTranslated: text("scripture_text_translated"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDevotionalLang: unique().on(table.devotionalId, table.languageCode),
}));

export const insertDevotionalTranslationSchema = createInsertSchema(devotionalTranslations).omit({
  id: true,
  createdAt: true,
});

export type DevotionalTranslation = typeof devotionalTranslations.$inferSelect;
export type InsertDevotionalTranslation = z.infer<typeof insertDevotionalTranslationSchema>;

export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt", "yo", "ig", "ha", "sw", "zh", "hi"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

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
  phoneNumber: text("phone_number"),
  smsEnabled: boolean("sms_enabled").default(false),
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
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertThreadMessageSchema = createInsertSchema(threadMessages).omit({
  id: true,
  isRead: true,
  readAt: true,
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

// Support Tickets Table (for Technical Support)
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  issueDescription: text("issue_description").notNull(),
  deviceBrowser: text("device_browser"),
  email: text("email"),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

// Contact Messages Table (for in-app compose)
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isUrgent: boolean("is_urgent").default(false),
  isPrayerRelated: boolean("is_prayer_related").default(false),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// General Inquiries Table
export const generalInquiries = pgTable("general_inquiries", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGeneralInquirySchema = createInsertSchema(generalInquiries).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type GeneralInquiry = typeof generalInquiries.$inferSelect;
export type InsertGeneralInquiry = z.infer<typeof insertGeneralInquirySchema>;

// Feedback Table
export const feedbackMessages = pgTable("feedback_messages", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  feedbackType: text("feedback_type").notNull(),
  message: text("message").notNull(),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackMessages).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type FeedbackMessage = typeof feedbackMessages.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Partnership Inquiries Table
export const partnershipInquiries = pgTable("partnership_inquiries", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  organization: text("organization"),
  email: text("email").notNull(),
  partnershipType: text("partnership_type").notNull(),
  message: text("message").notNull(),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartnershipSchema = createInsertSchema(partnershipInquiries).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type PartnershipInquiry = typeof partnershipInquiries.$inferSelect;
export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;

export const sundaySchoolLessons = pgTable("sunday_school_lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull().unique(),
  scriptureReferences: text("scripture_references").notNull(),
  scriptureText: text("scripture_text").notNull(),
  lessonContent: text("lesson_content").notNull(),
  discussionQuestions: text("discussion_questions").array().notNull(),
  prayerFocus: text("prayer_focus").notNull(),
  weeklyAssignment: text("weekly_assignment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSundaySchoolLessonSchema = createInsertSchema(sundaySchoolLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SundaySchoolLesson = typeof sundaySchoolLessons.$inferSelect;
export type InsertSundaySchoolLesson = z.infer<typeof insertSundaySchoolLessonSchema>;

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  type: text("type").notNull(),
  isActive: boolean("is_active").default(true),
  themeConfig: jsonb("theme_config").$type<Record<string, any>>(),
  musicFile: text("music_file"),
  settings: jsonb("settings").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

// Testimonies Table
export const testimonies = pgTable("testimonies", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id"),
  name: text("name"),
  country: text("country"),
  message: text("message").notNull(),
  photoUrl: text("photo_url"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTestimonySchema = createInsertSchema(testimonies).omit({
  id: true,
  isApproved: true,
  createdAt: true,
});

export type Testimony = typeof testimonies.$inferSelect;
export type InsertTestimony = z.infer<typeof insertTestimonySchema>;

// Prayer Follow-Up Messages Table
export const prayerFollowUps = pgTable("prayer_follow_ups", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  dayNumber: integer("day_number").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type PrayerFollowUp = typeof prayerFollowUps.$inferSelect;

export const promiseDeliveryState = pgTable("promise_delivery_state", {
  id: serial("id").primaryKey(),
  lastIndex: integer("last_index").default(0).notNull(),
  lastSentTime: timestamp("last_sent_time").defaultNow(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

export type PromiseDeliveryState = typeof promiseDeliveryState.$inferSelect;

export const promiseAmens = pgTable("promise_amens", {
  id: serial("id").primaryKey(),
  promiseId: integer("promise_id").notNull(),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PromiseAmen = typeof promiseAmens.$inferSelect;

export const INBOX_CATEGORIES = ["Prayer", "Counseling", "Scripture Question", "Support", "General"] as const;
export type InboxCategory = typeof INBOX_CATEGORIES[number];

export const INBOX_STATUSES = ["open", "replied", "closed"] as const;
export type InboxStatus = typeof INBOX_STATUSES[number];

export const inboxThreads = pgTable("inbox_threads", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  status: text("status").default("open").notNull(),
  hasUnreadAdmin: boolean("has_unread_admin").default(false),
  hasUnreadUser: boolean("has_unread_user").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInboxThreadSchema = createInsertSchema(inboxThreads).omit({
  id: true,
  status: true,
  hasUnreadAdmin: true,
  hasUnreadUser: true,
  createdAt: true,
  updatedAt: true,
});

export type InboxThread = typeof inboxThreads.$inferSelect;
export type InsertInboxThread = z.infer<typeof insertInboxThreadSchema>;

export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  senderType: text("sender_type").notNull(),
  message: text("message").notNull(),
  deletedByUser: boolean("deleted_by_user").default(false),
  deletedByAdmin: boolean("deleted_by_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInboxMessageSchema = createInsertSchema(inboxMessages).omit({
  id: true,
  deletedByUser: true,
  deletedByAdmin: true,
  createdAt: true,
});

export type InboxMessage = typeof inboxMessages.$inferSelect;
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;
