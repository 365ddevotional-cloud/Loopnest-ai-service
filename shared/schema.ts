import { pgTable, text, serial, date, timestamp, boolean, integer, unique, jsonb, real } from "drizzle-orm/pg-core";
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
  firebaseUid: text("firebase_uid"),
  answeredAt: timestamp("answered_at"),
  answerNote: text("answer_note"),
  privacy: text("privacy").default("private"),
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
  firebaseUid: text("firebase_uid"),
  isDraft: boolean("is_draft").default(true),
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

// Songs Table — Song of the Week / SpiritTone Music feature
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  artist: text("artist"),
  featuredArtist: text("featured_artist"),
  labelName: text("label_name").default("SpiritTone Records").notNull(),
  labelLogoUrl: text("label_logo_url"),
  producer: text("producer").default("Moses Afolabi").notNull(),
  composer: text("composer"),
  lyricist: text("lyricist"),
  choir: text("choir"),
  instrumentalist: text("instrumentalist"),
  genre: text("genre"),
  language: text("language").default("English"),
  scriptureReference: text("scripture_reference").notNull(),
  scriptureText: text("scripture_text"),
  lyrics: text("lyrics"),
  audioUrl: text("audio_url"),
  coverImageUrl: text("cover_image_url"),
  shortDescription: text("short_description"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  featuredWeekStart: date("featured_week_start"),
  featuredWeekEnd: date("featured_week_end"),
  releaseYear: integer("release_year"),
  copyrightNotice: text("copyright_notice"),
  downloadStatus: text("download_status").default("free").notNull(),
  videoUrl: text("video_url"),
  videoDownloadStatus: text("video_download_status").default("disabled").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;

// Song Testimonies Table
export const songTestimonies = pgTable("song_testimonies", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  email: text("email"),
  testimony: text("testimony").notNull(),
  consentToPublish: boolean("consent_to_publish").default(false).notNull(),
  isApproved: boolean("is_approved").default(false),
  isFeatured: boolean("is_featured").default(false),
  songTitle: text("song_title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSongTestimonySchema = createInsertSchema(songTestimonies).omit({
  id: true,
  isApproved: true,
  isFeatured: true,
  createdAt: true,
});

export type SongTestimony = typeof songTestimonies.$inferSelect;
export type InsertSongTestimony = z.infer<typeof insertSongTestimonySchema>;

// User Library Tables — Per-Firebase-UID saved/favorite songs and download history
export const userSavedSongs = pgTable("user_saved_songs", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow(),
}, (t) => ({
  uniqueSavedSong: unique().on(t.firebaseUid, t.songId),
}));

export const userFavoriteSongs = pgTable("user_favorite_songs", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueFavoriteSong: unique().on(t.firebaseUid, t.songId),
}));

export const userDownloadHistory = pgTable("user_download_history", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
});

export type UserSavedSong = typeof userSavedSongs.$inferSelect;
export type UserFavoriteSong = typeof userFavoriteSongs.$inferSelect;
export type UserDownloadRecord = typeof userDownloadHistory.$inferSelect;

// Playback History — per-song listening progress per Firebase UID
export const userPlaybackHistory = pgTable("user_playback_history", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  lastPosition: integer("last_position").default(0),
  durationSecs: integer("duration_secs").default(0),
  progressPercent: integer("progress_percent").default(0),
  lastPlayedAt: timestamp("last_played_at").defaultNow(),
}, (t) => ({
  uniquePlayback: unique().on(t.firebaseUid, t.songId),
}));

// Music Settings — per-user listening preferences
export const userMusicSettings = pgTable("user_music_settings", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  autoplayNext: boolean("autoplay_next").default(false),
  rememberPosition: boolean("remember_position").default(true),
  defaultSpeed: real("default_speed").default(1),
  repeatMode: text("repeat_mode").default("none"),
  shuffle: boolean("shuffle").default(false),
});

export type UserPlaybackHistory = typeof userPlaybackHistory.$inferSelect;
export type UserMusicSettings = typeof userMusicSettings.$inferSelect;

// Giving Methods Table — Admin-managed voluntary support options
export const givingMethods = pgTable("giving_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("other"),
  url: text("url"),
  handle: text("handle"),
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertGivingMethodSchema = createInsertSchema(givingMethods).omit({ id: true });
export type GivingMethod = typeof givingMethods.$inferSelect;
export type InsertGivingMethod = z.infer<typeof insertGivingMethodSchema>;

// ── Phase F: Devotional Account Sync ──────────────────────────────────────────

// User Saved Devotionals — "Save Devotional" action, per Firebase UID
export const userSavedDevotionals = pgTable("user_saved_devotionals", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow(),
}, (t) => ({
  uniqueSavedDev: unique().on(t.firebaseUid, t.devotionalId),
}));

export type UserSavedDevotional = typeof userSavedDevotionals.$inferSelect;

// User Devotional Reading History — upsert on open; one record per (uid, devotional)
export const userDevotionalHistory = pgTable("user_devotional_history", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  firstOpenedAt: timestamp("first_opened_at").defaultNow(),
  lastOpenedAt: timestamp("last_opened_at").defaultNow(),
}, (t) => ({
  uniqueDevHistory: unique().on(t.firebaseUid, t.devotionalId),
}));

export type UserDevotionalHistory = typeof userDevotionalHistory.$inferSelect;

// User Devotional Reading Streak — one row per Firebase UID
export const userDevotionalStreak = pgTable("user_devotional_streak", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastReadDate: text("last_read_date"), // "YYYY-MM-DD"
});

export type UserDevotionalStreak = typeof userDevotionalStreak.$inferSelect;

// User Devotional Notes — private, one note per (uid, devotional)
export const userDevotionalNotes = pgTable("user_devotional_notes", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  noteText: text("note_text").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueDevNote: unique().on(t.firebaseUid, t.devotionalId),
}));

export type UserDevotionalNote = typeof userDevotionalNotes.$inferSelect;

// ── Donation Confirmations ─────────────────────────────────────────────────────
// Submitted by donors after making a gift so admin can acknowledge and thank them

export const donationConfirmations = pgTable("donation_confirmations", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phoneWhatsapp: text("phone_whatsapp"),
  country: text("country"),
  amount: text("amount").notNull(),
  currency: text("currency").notNull(),        // USD | NGN | Other
  paymentMethod: text("payment_method").notNull(), // Venmo | OPay Bank Transfer | Other
  givingType: text("giving_type").notNull(),    // One-Time Donation | Monthly Support
  paymentReference: text("payment_reference"),
  message: text("message"),
  wantsThankYou: boolean("wants_thank_you").default(false),
  thankYouStatus: text("thank_you_status").notNull().default("not_sent"), // not_sent | sent
  thankYouSentAt: timestamp("thank_you_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDonationConfirmationSchema = createInsertSchema(donationConfirmations).omit({
  id: true,
  thankYouStatus: true,
  thankYouSentAt: true,
  createdAt: true,
});

export type DonationConfirmation = typeof donationConfirmations.$inferSelect;
export type InsertDonationConfirmation = z.infer<typeof insertDonationConfirmationSchema>;

// ── Church Mode ──────────────────────────────────────────────────────────────

export const CHURCH_ROLES = [
  "owner", "lead_pastor", "administrator", "associate_pastor",
  "ministry_leader", "group_leader", "counselor", "prayer_team", "member"
] as const;
export type ChurchRole = typeof CHURCH_ROLES[number];

export const CHURCH_ROLE_LABELS: Record<ChurchRole, string> = {
  owner: "Church Owner",
  lead_pastor: "Lead Pastor",
  administrator: "Administrator",
  associate_pastor: "Associate Pastor",
  ministry_leader: "Ministry Leader",
  group_leader: "Group Leader",
  counselor: "Counselor",
  prayer_team: "Prayer Team",
  member: "Member",
};

export const CHURCH_ADMIN_ROLES: ChurchRole[] = ["owner", "lead_pastor", "administrator", "associate_pastor"];

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  address: text("address"),
  denomination: text("denomination"),
  ownerId: text("owner_id").notNull(), // firebase_uid of the creator
  status: text("status").notNull().default("active"), // "active" | "inactive"
  approvalMode: text("approval_mode").notNull().default("require_approval"), // "require_approval" | "auto_approve"
  memberDirectoryEnabled: boolean("member_directory_enabled").notNull().default(false),
  bannerUrl: text("banner_url"),
  themeColor: text("theme_color"),
  createdAt: timestamp("created_at").defaultNow(),
  // Public website fields
  pastorName: text("pastor_name"),
  phone: text("phone"),
  email: text("email"),
  serviceTimes: jsonb("service_times").$type<Array<{ day: string; time: string; type: string }>>(),
  missionStatement: text("mission_statement"),
  vision: text("vision"),
  welcomeMessage: text("welcome_message"),
  socialLinks: jsonb("social_links").$type<{ facebook?: string; instagram?: string; youtube?: string; twitter?: string; whatsapp?: string }>(),
  publicPhotos: text("public_photos").array(),
  publicWebsiteEnabled: boolean("public_website_enabled").notNull().default(true),
  mapEmbedUrl: text("map_embed_url"),
  visitorInfo: text("visitor_info"),
  websiteHeroImage: text("website_hero_image"),
  homepageSections: jsonb("homepage_sections").$type<Array<{ id: string; enabled: boolean; order: number }>>(),
});

export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
});
export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;

export const churchMembers = pgTable("church_members", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("member"), // ChurchRole
  status: text("status").notNull().default("active"), // "active" | "pending" | "declined" | "suspended" | "left" | "removed"
  invitedGroupId: integer("invited_group_id"), // group to assign after approval
  inviteCodeUsed: text("invite_code_used"),    // which invitation code they used
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => ({
  uniqueMemberChurch: unique().on(t.churchId, t.firebaseUid),
}));

export const insertChurchMemberSchema = createInsertSchema(churchMembers).omit({
  id: true,
  joinedAt: true,
});
export type ChurchMember = typeof churchMembers.$inferSelect;
export type InsertChurchMember = z.infer<typeof insertChurchMemberSchema>;

// ── Church Member Profiles (extended info) ────────────────────────────────────
export const churchMemberProfiles = pgTable("church_member_profiles", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  country: text("country"),
  city: text("city"),
  address: text("address"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  // Privacy
  showInDirectory: boolean("show_in_directory").notNull().default(true),
  allowMemberMessages: boolean("allow_member_messages").notNull().default(true),
  allowLeaderContact: boolean("allow_leader_contact").notNull().default(true),
  showPhoneToLeadersOnly: boolean("show_phone_to_leaders_only").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueProfile: unique().on(t.churchId, t.firebaseUid),
}));
export const insertChurchMemberProfileSchema = createInsertSchema(churchMemberProfiles).omit({ id: true, updatedAt: true });
export type ChurchMemberProfile = typeof churchMemberProfiles.$inferSelect;

export const INVITATION_TYPES = [
  "membership", "group", "ministry_team", "leadership", "special_program", "custom"
] as const;
export type InvitationType = typeof INVITATION_TYPES[number];
export const INVITATION_TYPE_LABELS: Record<InvitationType, string> = {
  membership: "Church Membership",
  group: "Church Group",
  ministry_team: "Ministry Team",
  leadership: "Leadership Invitation",
  special_program: "Special Program",
  custom: "Custom",
};

export const churchInvitations = pgTable("church_invitations", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by").notNull(), // firebase_uid
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),                        // null = unlimited
  approvedUses: integer("approved_uses").notNull().default(0), // only active/approved members count
  usedCount: integer("used_count").notNull().default(0),       // all join attempts
  isActive: boolean("is_active").notNull().default(true),
  label: text("label"),
  invitationType: text("invitation_type").notNull().default("membership"), // InvitationType
  targetGroupId: integer("target_group_id"),           // if group/ministry invitation
  targetGroupName: text("target_group_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChurchInvitationSchema = createInsertSchema(churchInvitations).omit({
  id: true,
  approvedUses: true,
  usedCount: true,
  createdAt: true,
});
export type ChurchInvitation = typeof churchInvitations.$inferSelect;
export type InsertChurchInvitation = z.infer<typeof insertChurchInvitationSchema>;

// ── Church Messaging ──────────────────────────────────────────────────────────
export const CHURCH_MESSAGE_CATEGORIES = [
  "general", "pastoral", "counseling", "prayer_followup",
  "membership_question", "group_message", "announcement", "ministry_assignment"
] as const;

export const churchConversations = pgTable("church_conversations", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("open"), // "open" | "closed" | "archived"
  createdBy: text("created_by").notNull(),          // firebase_uid
  assignedTo: text("assigned_to"),                  // firebase_uid of pastor/staff
  isUrgent: boolean("is_urgent").notNull().default(false),
  // Targeting: null = direct message, "all" = all members, groupId = group
  targetType: text("target_type").notNull().default("direct"), // "direct" | "group" | "all" | "leaders"
  targetGroupId: integer("target_group_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertChurchConversationSchema = createInsertSchema(churchConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type ChurchConversation = typeof churchConversations.$inferSelect;
export type InsertChurchConversation = typeof insertChurchConversationSchema._type;

export const churchConversationParticipants = pgTable("church_conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => churchConversations.id, { onDelete: "cascade" }),
  churchId: integer("church_id").notNull(),
  firebaseUid: text("firebase_uid").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("member"), // "member" | "pastor" | "assistant" | "admin"
  addedBy: text("added_by"),                      // firebase_uid of who added them (for audit)
  addedAt: timestamp("added_at").defaultNow(),
}, (t) => ({
  uniqueParticipant: unique().on(t.conversationId, t.firebaseUid),
}));
export const insertChurchConversationParticipantSchema = createInsertSchema(churchConversationParticipants).omit({ id: true, addedAt: true });
export type ChurchConversationParticipant = typeof churchConversationParticipants.$inferSelect;
export type InsertChurchConversationParticipant = typeof insertChurchConversationParticipantSchema._type;

export const churchMessages = pgTable("church_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => churchConversations.id, { onDelete: "cascade" }),
  churchId: integer("church_id").notNull(),
  senderUid: text("sender_uid").notNull(),
  senderName: text("sender_name"),
  senderRole: text("sender_role"),                // "member" | "pastor" | "admin" etc.
  body: text("body").notNull(),
  isSystemMessage: boolean("is_system_message").notNull().default(false),
  deletedBySender: boolean("deleted_by_sender").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchMessageSchema = createInsertSchema(churchMessages).omit({ id: true, createdAt: true });
export type ChurchMessage = typeof churchMessages.$inferSelect;
export type InsertChurchMessage = typeof insertChurchMessageSchema._type;

export const churchMessageReads = pgTable("church_message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => churchMessages.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  readAt: timestamp("read_at").defaultNow(),
}, (t) => ({
  uniqueRead: unique().on(t.messageId, t.firebaseUid),
}));

// ── Church Sermons ────────────────────────────────────────────────────────────
export const churchSermons = pgTable("church_sermons", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  speakerName: text("speaker_name"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  pdfNotesUrl: text("pdf_notes_url"),
  outlineUrl: text("outline_url"),
  imageUrl: text("image_url"),
  bibleReference: text("bible_reference"),
  sermonDate: timestamp("sermon_date"),
  scheduledDate: timestamp("scheduled_date"),
  isPublished: boolean("is_published").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchSermonSchema = createInsertSchema(churchSermons).omit({ id: true, createdAt: true });
export type ChurchSermon = typeof churchSermons.$inferSelect;
export type InsertChurchSermon = z.infer<typeof insertChurchSermonSchema>;

// ── Church Sermon Bookmarks ───────────────────────────────────────────────────
export const churchSermonBookmarks = pgTable("church_sermon_bookmarks", {
  id: serial("id").primaryKey(),
  sermonId: integer("sermon_id").notNull().references(() => churchSermons.id, { onDelete: "cascade" }),
  churchId: integer("church_id").notNull(),
  firebaseUid: text("firebase_uid").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueBookmark: unique().on(t.sermonId, t.firebaseUid),
}));
export type ChurchSermonBookmark = typeof churchSermonBookmarks.$inferSelect;

// ── Church Sermon Notes (private per member) ──────────────────────────────────
export const churchSermonNotes = pgTable("church_sermon_notes", {
  id: serial("id").primaryKey(),
  sermonId: integer("sermon_id").notNull().references(() => churchSermons.id, { onDelete: "cascade" }),
  churchId: integer("church_id").notNull(),
  firebaseUid: text("firebase_uid").notNull(),
  body: text("body").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueNote: unique().on(t.sermonId, t.firebaseUid),
}));
export type ChurchSermonNote = typeof churchSermonNotes.$inferSelect;

// ── Church Announcements ──────────────────────────────────────────────────────
export const churchAnnouncements = pgTable("church_announcements", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  imageUrl: text("image_url"),
  pdfUrl: text("pdf_url"),
  externalLink: text("external_link"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchAnnouncementSchema = createInsertSchema(churchAnnouncements).omit({ id: true, createdAt: true });
export type ChurchAnnouncement = typeof churchAnnouncements.$inferSelect;
export type InsertChurchAnnouncement = z.infer<typeof insertChurchAnnouncementSchema>;

// ── Church Groups ─────────────────────────────────────────────────────────────
export const churchGroups = pgTable("church_groups", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  leaderId: text("leader_id"),
  leaderName: text("leader_name"),
  meetingSchedule: text("meeting_schedule"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchGroupSchema = createInsertSchema(churchGroups).omit({ id: true, createdAt: true });
export type ChurchGroup = typeof churchGroups.$inferSelect;
export type InsertChurchGroup = z.infer<typeof insertChurchGroupSchema>;

export const churchGroupMembers = pgTable("church_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => churchGroups.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  displayName: text("display_name"),
  email: text("email").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => ({
  uniqueGroupMember: unique().on(t.groupId, t.firebaseUid),
}));
export const insertChurchGroupMemberSchema = createInsertSchema(churchGroupMembers).omit({ id: true, joinedAt: true });
export type ChurchGroupMember = typeof churchGroupMembers.$inferSelect;
export type InsertChurchGroupMember = z.infer<typeof insertChurchGroupMemberSchema>;

// ── Church Prayer Requests ────────────────────────────────────────────────────
export const churchPrayerRequests = pgTable("church_prayer_requests", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  displayName: text("display_name"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isConfidential: boolean("is_confidential").notNull().default(false),
  prayerCount: integer("prayer_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchPrayerRequestSchema = createInsertSchema(churchPrayerRequests).omit({ id: true, prayerCount: true, createdAt: true });
export type ChurchPrayerRequest = typeof churchPrayerRequests.$inferSelect;
export type InsertChurchPrayerRequest = z.infer<typeof insertChurchPrayerRequestSchema>;

// ── Church Activity Log ───────────────────────────────────────────────────────
export const churchActivityLog = pgTable("church_activity_log", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  displayName: text("display_name"),
  activityType: text("activity_type").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchActivitySchema = createInsertSchema(churchActivityLog).omit({ id: true, createdAt: true });
export type ChurchActivity = typeof churchActivityLog.$inferSelect;

// ── Church Giving Settings ────────────────────────────────────────────────────
export const churchGivingSettings = pgTable("church_giving_settings", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().unique().references(() => churches.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  currency: text("currency").notNull().default("USD"),
  platformFeeAccepted: boolean("platform_fee_accepted").notNull().default(false),
  givingStatement: text("giving_statement"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchGivingSettingsSchema = createInsertSchema(churchGivingSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type ChurchGivingSettings = typeof churchGivingSettings.$inferSelect;

// ── Church Giving Categories ──────────────────────────────────────────────────
export const churchGivingCategories = pgTable("church_giving_categories", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchGivingCategorySchema = createInsertSchema(churchGivingCategories).omit({ id: true, createdAt: true });
export type ChurchGivingCategory = typeof churchGivingCategories.$inferSelect;

// ── Church Payout Config ──────────────────────────────────────────────────────
export const churchPayoutConfigs = pgTable("church_payout_configs", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().unique().references(() => churches.id, { onDelete: "cascade" }),
  country: text("country"),
  currency: text("currency"),
  legalName: text("legal_name"),
  publicName: text("public_name"),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  swiftBic: text("swift_bic"),
  mobileMoneyProvider: text("mobile_money_provider"),
  mobileMoneyNumber: text("mobile_money_number"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  isAuthorizedToReceive: boolean("is_authorized_to_receive").notNull().default(false),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchPayoutConfigSchema = createInsertSchema(churchPayoutConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type ChurchPayoutConfig = typeof churchPayoutConfigs.$inferSelect;

// ── Church Transactions ───────────────────────────────────────────────────────
export const churchTransactions = pgTable("church_transactions", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => churchGivingCategories.id),
  categoryName: text("category_name").notNull(),
  donorFirebaseUid: text("donor_firebase_uid"),
  donorName: text("donor_name"),
  donorEmail: text("donor_email"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  note: text("note"),
  currency: text("currency").notNull().default("USD"),
  grossAmount: integer("gross_amount").notNull(),
  platformFeeAmount: integer("platform_fee_amount").notNull().default(0),
  providerFeeAmount: integer("provider_fee_amount").notNull().default(0),
  churchNetAmount: integer("church_net_amount").notNull(),
  status: text("status").notNull().default("pending"),
  payoutStatus: text("payout_status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  reference: text("reference").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchTransactionSchema = createInsertSchema(churchTransactions).omit({ id: true, createdAt: true });
export type ChurchTransaction = typeof churchTransactions.$inferSelect;

// ── Global Giving Settings ────────────────────────────────────────────────────
export const globalGivingSettings = pgTable("global_giving_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type GlobalGivingSetting = typeof globalGivingSettings.$inferSelect;
export type InsertChurchActivity = z.infer<typeof insertChurchActivitySchema>;

// ── Church Departments ────────────────────────────────────────────────────────
export const PREDEFINED_DEPARTMENT_TYPES = [
  "Youth Ministry", "Children's Ministry", "Women's Fellowship", "Men's Fellowship",
  "Choir", "Ushering", "Media", "Evangelism", "Prayer Team", "Sunday School",
  "Hospitality", "Finance", "Protocol", "Follow-Up", "Missions", "Custom",
] as const;

export const churchDepartments = pgTable("church_departments", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull().default("Custom"),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  inviteCode: text("invite_code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchDepartmentSchema = createInsertSchema(churchDepartments).omit({ id: true, createdAt: true });
export type ChurchDepartment = typeof churchDepartments.$inferSelect;
export type InsertChurchDepartment = z.infer<typeof insertChurchDepartmentSchema>;

export const DEPT_MEMBER_ROLES = ["leader", "assistant_leader", "secretary", "member"] as const;
export type DeptMemberRole = typeof DEPT_MEMBER_ROLES[number];

export const churchDepartmentMembers = pgTable("church_department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => churchDepartments.id, { onDelete: "cascade" }),
  churchMemberId: integer("church_member_id").notNull().references(() => churchMembers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});
export type ChurchDepartmentMember = typeof churchDepartmentMembers.$inferSelect;

export const churchDepartmentPosts = pgTable("church_department_posts", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => churchDepartments.id, { onDelete: "cascade" }),
  authorMemberId: integer("author_member_id").notNull().references(() => churchMembers.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("message"),
  title: text("title"),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchDepartmentPostSchema = createInsertSchema(churchDepartmentPosts).omit({ id: true, createdAt: true, isDeleted: true });
export type ChurchDepartmentPost = typeof churchDepartmentPosts.$inferSelect;

export const churchDepartmentEvents = pgTable("church_department_events", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => churchDepartments.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => churchMembers.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isAllDay: boolean("is_all_day").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchDepartmentEventSchema = createInsertSchema(churchDepartmentEvents).omit({ id: true, createdAt: true });
export type ChurchDepartmentEvent = typeof churchDepartmentEvents.$inferSelect;
export type InsertChurchDepartmentEvent = z.infer<typeof insertChurchDepartmentEventSchema>;

export const churchDepartmentTasks = pgTable("church_department_tasks", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => churchDepartments.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => churchMembers.id),
  assignedTo: integer("assigned_to").references(() => churchMembers.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchDepartmentTaskSchema = createInsertSchema(churchDepartmentTasks).omit({ id: true, createdAt: true });
export type ChurchDepartmentTask = typeof churchDepartmentTasks.$inferSelect;
export type InsertChurchDepartmentTask = z.infer<typeof insertChurchDepartmentTaskSchema>;

export const churchDepartmentAttendance = pgTable("church_department_attendance", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => churchDepartments.id, { onDelete: "cascade" }),
  sessionDate: timestamp("session_date").notNull(),
  sessionTitle: text("session_title"),
  attendeeIds: integer("attendee_ids").array().notNull(),
  createdBy: integer("created_by").notNull().references(() => churchMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChurchDepartmentAttendanceSchema = createInsertSchema(churchDepartmentAttendance).omit({ id: true, createdAt: true });
export type ChurchDepartmentAttendance = typeof churchDepartmentAttendance.$inferSelect;
export type InsertChurchDepartmentAttendance = z.infer<typeof insertChurchDepartmentAttendanceSchema>;
