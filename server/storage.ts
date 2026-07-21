import { db } from "./db";
import {
  devotionals,
  prayerRequests,
  prayerReplies,
  threadMessages,
  autoReplyTemplates,
  prayerAttachments,
  supportTickets,
  contactMessages,
  generalInquiries,
  feedbackMessages,
  partnershipInquiries,
  biblePassages,
  sundaySchoolLessons,
  testimonies,
  prayerFollowUps,
  inboxThreads,
  inboxMessages,
  songs,
  songTestimonies,
  givingMethods,
  userSavedSongs,
  userFavoriteSongs,
  userDownloadHistory,
  userPlaybackHistory,
  userMusicSettings,
  userSavedDevotionals,
  userDevotionalHistory,
  userDevotionalStreak,
  userDevotionalNotes,
  type Devotional,
  type InsertDevotional,
  type UpdateDevotionalRequest,
  type PrayerRequest,
  type InsertPrayerRequest,
  type PrayerReply,
  type InsertPrayerReply,
  type ThreadMessage,
  type InsertThreadMessage,
  type AutoReplyTemplate,
  type InsertAutoReplyTemplate,
  type PrayerAttachment,
  type InsertPrayerAttachment,
  type SupportTicket,
  type InsertSupportTicket,
  type ContactMessage,
  type InsertContactMessage,
  type GeneralInquiry,
  type InsertGeneralInquiry,
  type FeedbackMessage,
  type InsertFeedback,
  type PartnershipInquiry,
  type InsertPartnership,
  type BiblePassage,
  type InsertBiblePassage,
  type BibleTranslation,
  type SundaySchoolLesson,
  type InsertSundaySchoolLesson,
  type Testimony,
  type InsertTestimony,
  type PrayerFollowUp,
  type InboxThread,
  type InsertInboxThread,
  type InboxMessage,
  type InsertInboxMessage,
  type Song,
  type InsertSong,
  type GivingMethod,
  type InsertGivingMethod,
  type SongTestimony,
  type UserSavedSong,
  type UserFavoriteSong,
  type UserDownloadRecord,
  type UserPlaybackHistory,
  type UserMusicSettings,
  type UserSavedDevotional,
  type UserDevotionalHistory,
  type UserDevotionalStreak,
  type UserDevotionalNote,
  type InsertSongTestimony,
  type DonationConfirmation,
  type InsertDonationConfirmation,
  donationConfirmations,
  churches,
  churchMembers,
  churchInvitations,
  type Church,
  type InsertChurch,
  type ChurchMember,
  type InsertChurchMember,
  type ChurchInvitation,
  type InsertChurchInvitation,
} from "@shared/schema";
import { eq, desc, and, isNull, or, ilike, lte, notInArray, sql } from "drizzle-orm";

export interface IStorage {
  getDevotionals(): Promise<Devotional[]>;
  getDevotional(id: number): Promise<Devotional | undefined>;
  getDevotionalByDate(date: string): Promise<Devotional | undefined>;
  getLatestDevotional(): Promise<Devotional | undefined>;
  createDevotional(devotional: InsertDevotional): Promise<Devotional>;
  updateDevotional(id: number, updates: UpdateDevotionalRequest): Promise<Devotional>;
  upsertDevotional(devotional: InsertDevotional): Promise<Devotional>;
  deleteDevotional(id: number): Promise<void>;
  
  // Prayer Requests
  getPrayerRequests(): Promise<PrayerRequest[]>;
  getPrayerRequest(id: number): Promise<PrayerRequest | undefined>;
  createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest>;
  markPrayerRequestRead(id: number): Promise<PrayerRequest>;
  
  // Prayer Replies
  getRepliesForRequest(requestId: number): Promise<PrayerReply[]>;
  createPrayerReply(reply: InsertPrayerReply): Promise<PrayerReply>;
  
  // Thread Messages
  getThreadMessages(requestId: number): Promise<ThreadMessage[]>;
  createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage>;
  markAdminMessagesRead(requestId: number): Promise<number>;
  
  // Prayer Requests by Email
  getPrayerRequestsByEmail(email: string): Promise<PrayerRequest[]>;

  // Prayer Requests by Firebase UID (user account)
  getPrayerRequestsByUid(uid: string): Promise<PrayerRequest[]>;
  linkPrayerToUid(id: number, uid: string): Promise<void>;
  markPrayerAnswered(id: number, uid: string, answerNote?: string): Promise<PrayerRequest>;
  withdrawPrayerRequest(id: number, uid: string): Promise<PrayerRequest>;
  updatePrayerRequestByUser(id: number, uid: string, data: { subject?: string; message?: string }): Promise<PrayerRequest>;

  // Prayer Request Status
  updatePrayerRequestStatus(id: number, status: string): Promise<PrayerRequest>;
  updatePrayerRequestCategory(id: number, category: string): Promise<PrayerRequest>;
  
  // Auto-Reply Templates
  getAutoReplyTemplate(templateType: string): Promise<AutoReplyTemplate | undefined>;
  getAutoReplyTemplates(): Promise<AutoReplyTemplate[]>;
  upsertAutoReplyTemplate(template: InsertAutoReplyTemplate): Promise<AutoReplyTemplate>;
  
  // Prayer Attachments
  getAttachmentsForRequest(requestId: number): Promise<PrayerAttachment[]>;
  createPrayerAttachment(attachment: InsertPrayerAttachment): Promise<PrayerAttachment>;
  
  // Support Tickets
  getSupportTickets(): Promise<SupportTicket[]>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  
  // Contact Messages
  getContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  
  // General Inquiries
  getGeneralInquiries(): Promise<GeneralInquiry[]>;
  createGeneralInquiry(inquiry: InsertGeneralInquiry): Promise<GeneralInquiry>;
  
  // Feedback
  getFeedback(): Promise<FeedbackMessage[]>;
  createFeedback(feedback: InsertFeedback): Promise<FeedbackMessage>;
  
  // Partnership
  getPartnershipInquiries(): Promise<PartnershipInquiry[]>;
  createPartnershipInquiry(inquiry: InsertPartnership): Promise<PartnershipInquiry>;
  
  // Testimonies
  getApprovedTestimonies(): Promise<Testimony[]>;
  getAllTestimonies(): Promise<Testimony[]>;
  createTestimony(testimony: InsertTestimony): Promise<Testimony>;
  approveTestimony(id: number): Promise<Testimony>;
  rejectTestimony(id: number): Promise<Testimony>;
  deleteTestimony(id: number): Promise<void>;
  // User-linked testimony workflow
  getUserTestimony(prayerRequestId: number, uid: string): Promise<Testimony | undefined>;
  upsertUserTestimony(prayerRequestId: number, uid: string, data: { name?: string; message: string }): Promise<Testimony>;
  submitTestimonyForReview(id: number, uid: string): Promise<Testimony>;

  // Prayer Follow-Ups
  getFollowUpsForRequest(requestId: number): Promise<PrayerFollowUp[]>;
  createFollowUp(requestId: number, dayNumber: number, message: string): Promise<PrayerFollowUp>;
  getRequestsNeedingFollowUp(dayNumber: number): Promise<PrayerRequest[]>;

  // Inbox
  createInboxThread(thread: InsertInboxThread, firstMessage: string): Promise<InboxThread>;
  getInboxThreadsByEmail(email: string): Promise<InboxThread[]>;
  getAllInboxThreads(filters?: { category?: string; status?: string }): Promise<InboxThread[]>;
  getInboxThread(id: number): Promise<InboxThread | undefined>;
  getInboxMessages(threadId: number, viewerType: "user" | "admin"): Promise<InboxMessage[]>;
  createInboxMessage(message: InsertInboxMessage): Promise<InboxMessage>;
  updateInboxThreadStatus(id: number, status: string): Promise<InboxThread>;
  markInboxThreadRead(id: number, readerType: "user" | "admin"): Promise<void>;
  deleteInboxMessage(id: number, viewerType: "user" | "admin"): Promise<void>;
  getLastInboxMessage(threadId: number): Promise<InboxMessage | undefined>;
  cleanupOldInboxMessages(daysOld: number): Promise<number>;

  // Bible Passages
  getBiblePassage(reference: string, translation: BibleTranslation): Promise<BiblePassage | undefined>;
  getBiblePassages(references: string[], translation: BibleTranslation): Promise<BiblePassage[]>;
  getAllBiblePassages(translation: BibleTranslation): Promise<BiblePassage[]>;
  createBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage>;
  upsertBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage>;

  // Sunday School
  getSundaySchoolLessons(): Promise<SundaySchoolLesson[]>;
  getSundaySchoolLesson(id: number): Promise<SundaySchoolLesson | undefined>;
  createSundaySchoolLesson(lesson: InsertSundaySchoolLesson): Promise<SundaySchoolLesson>;
  updateSundaySchoolLesson(id: number, updates: Partial<InsertSundaySchoolLesson>): Promise<SundaySchoolLesson>;
  deleteSundaySchoolLesson(id: number): Promise<void>;

  // Songs — Song of the Week / SpiritTone Music
  getFeaturedSong(): Promise<Song | undefined>;
  getPublicSongs(): Promise<Song[]>;
  getSongs(): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  getSongBySlug(slug: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, updates: Partial<InsertSong>): Promise<Song>;
  deleteSong(id: number): Promise<void>;
  getSongTestimonies(songId?: number): Promise<SongTestimony[]>;
  createSongTestimony(testimony: InsertSongTestimony): Promise<SongTestimony>;
  updateSongTestimony(id: number, data: Partial<SongTestimony>): Promise<SongTestimony>;
  deleteSongTestimony(id: number): Promise<void>;

  // Giving Methods — Admin-managed voluntary support options
  getGivingMethods(activeOnly?: boolean): Promise<GivingMethod[]>;
  createGivingMethod(method: InsertGivingMethod): Promise<GivingMethod>;
  updateGivingMethod(id: number, data: Partial<InsertGivingMethod>): Promise<GivingMethod | undefined>;
  deleteGivingMethod(id: number): Promise<void>;

  // User Library — saved/favorite songs and download history keyed by Firebase UID
  getUserSavedSongs(uid: string): Promise<(UserSavedSong & { song: Song })[]>;
  saveSong(uid: string, songId: number): Promise<UserSavedSong>;
  unsaveSong(uid: string, songId: number): Promise<void>;
  isSongSaved(uid: string, songId: number): Promise<boolean>;

  getUserFavoriteSongs(uid: string): Promise<(UserFavoriteSong & { song: Song })[]>;
  favoriteSong(uid: string, songId: number): Promise<UserFavoriteSong>;
  unfavoriteSong(uid: string, songId: number): Promise<void>;
  isSongFavorited(uid: string, songId: number): Promise<boolean>;
  mergeLocalFavorites(uid: string, songIds: number[]): Promise<void>;

  getUserDownloadHistory(uid: string): Promise<(UserDownloadRecord & { song: Song | null })[]>;
  recordDownload(uid: string, songId: number): Promise<UserDownloadRecord>;
  getUserPlaybackHistory(uid: string): Promise<(UserPlaybackHistory & { song: Song | null })[]>;
  upsertPlaybackPosition(uid: string, songId: number, lastPosition: number, durationSecs: number, progressPercent: number): Promise<void>;
  getUserMusicSettings(uid: string): Promise<UserMusicSettings | null>;
  upsertUserMusicSettings(uid: string, settings: Partial<Pick<UserMusicSettings, "autoplayNext" | "rememberPosition" | "defaultSpeed" | "repeatMode" | "shuffle">>): Promise<UserMusicSettings>;

  // Phase F: Devotional Account Sync
  getSavedDevotionals(uid: string): Promise<(UserSavedDevotional & { devotional: Devotional })[]>;
  saveDevotional(uid: string, devotionalId: number): Promise<void>;
  unsaveDevotional(uid: string, devotionalId: number): Promise<void>;
  isDevotionalSaved(uid: string, devotionalId: number): Promise<boolean>;
  mergeLocalDevotionalSaves(uid: string, devotionalIds: number[]): Promise<void>;
  recordDevotionalRead(uid: string, devotionalId: number): Promise<void>;
  getDevotionalHistory(uid: string): Promise<(UserDevotionalHistory & { devotional: Devotional })[]>;
  getDevotionalStreak(uid: string): Promise<UserDevotionalStreak | null>;
  upsertDevotionalStreak(uid: string, currentStreak: number, longestStreak: number, lastReadDate: string): Promise<UserDevotionalStreak>;
  getDevotionalNote(uid: string, devotionalId: number): Promise<UserDevotionalNote | null>;
  upsertDevotionalNote(uid: string, devotionalId: number, noteText: string): Promise<void>;
  deleteDevotionalNote(uid: string, devotionalId: number): Promise<void>;

  // Donation Confirmations
  createDonationConfirmation(data: InsertDonationConfirmation): Promise<DonationConfirmation>;
  getDonationConfirmations(): Promise<DonationConfirmation[]>;
  updateDonationConfirmationThankYouStatus(id: number, status: string): Promise<DonationConfirmation>;

  // Church Mode — Phase 2A
  createChurch(data: InsertChurch): Promise<Church>;
  getChurch(id: number): Promise<Church | undefined>;
  getChurchBySlug(slug: string): Promise<Church | undefined>;
  getChurchesByOwner(ownerId: string): Promise<Church[]>;
  updateChurch(id: number, data: Partial<InsertChurch>): Promise<Church>;
  deleteChurch(id: number): Promise<void>;
  addChurchMember(data: InsertChurchMember): Promise<ChurchMember>;
  getChurchMembers(churchId: number): Promise<ChurchMember[]>;
  getChurchMember(churchId: number, firebaseUid: string): Promise<ChurchMember | undefined>;
  getUserChurches(firebaseUid: string): Promise<(ChurchMember & { church: Church })[]>;
  updateChurchMemberRole(id: number, role: string): Promise<ChurchMember>;
  updateChurchMemberStatus(id: number, status: string): Promise<ChurchMember>;
  removeChurchMember(churchId: number, firebaseUid: string): Promise<void>;
  createChurchInvitation(data: InsertChurchInvitation): Promise<ChurchInvitation>;
  getChurchInvitation(inviteCode: string): Promise<ChurchInvitation | undefined>;
  getChurchInvitations(churchId: number): Promise<ChurchInvitation[]>;
  useChurchInvitation(inviteCode: string): Promise<ChurchInvitation>;
  deactivateChurchInvitation(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper to filter out soft-deleted devotionals
  private notDeleted() {
    return or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted));
  }

  async getDevotionals(): Promise<Devotional[]> {
    return await db
      .select()
      .from(devotionals)
      .where(this.notDeleted())
      .orderBy(desc(devotionals.date));
  }

  async getDevotional(id: number): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.id, id), this.notDeleted()));
    return devotional;
  }

  async getDevotionalByDate(date: string): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.date, date), this.notDeleted()));
    return devotional;
  }

  async getLatestDevotional(): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(this.notDeleted())
      .orderBy(desc(devotionals.date))
      .limit(1);
    return devotional;
  }

  async createDevotional(insertDevotional: InsertDevotional): Promise<Devotional> {
    const [devotional] = await db
      .insert(devotionals)
      .values(insertDevotional)
      .returning();
    return devotional;
  }

  async updateDevotional(
    id: number,
    updates: UpdateDevotionalRequest,
  ): Promise<Devotional> {
    const [updated] = await db
      .update(devotionals)
      .set(updates)
      .where(eq(devotionals.id, id))
      .returning();
    return updated;
  }

  async upsertDevotional(insertDevotional: InsertDevotional): Promise<Devotional> {
    const [devotional] = await db
      .insert(devotionals)
      .values(insertDevotional)
      .onConflictDoUpdate({
        target: devotionals.date,
        set: {
          title: insertDevotional.title,
          scriptureReference: insertDevotional.scriptureReference,
          scriptureText: insertDevotional.scriptureText,
          content: insertDevotional.content,
          prayerPoints: insertDevotional.prayerPoints,
          faithDeclarations: insertDevotional.faithDeclarations,
          author: insertDevotional.author,
          isDeleted: false,
          deletedAt: null,
        },
      })
      .returning();
    return devotional;
  }

  async deleteDevotional(id: number): Promise<void> {
    await db
      .update(devotionals)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(devotionals.id, id));
  }

  // Admin-only method to restore a soft-deleted devotional
  async restoreDevotional(id: number): Promise<Devotional | undefined> {
    const [restored] = await db
      .update(devotionals)
      .set({ isDeleted: false, deletedAt: null })
      .where(eq(devotionals.id, id))
      .returning();
    return restored;
  }

  // Admin-only method to get deleted devotionals (for restoration)
  async getDeletedDevotionals(): Promise<Devotional[]> {
    return await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.isDeleted, true))
      .orderBy(desc(devotionals.date));
  }

  // Prayer Requests
  async getPrayerRequests(): Promise<PrayerRequest[]> {
    return await db.select().from(prayerRequests).orderBy(desc(prayerRequests.createdAt));
  }

  async getPrayerRequest(id: number): Promise<PrayerRequest | undefined> {
    const [request] = await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.id, id));
    return request;
  }

  async createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest> {
    const [created] = await db
      .insert(prayerRequests)
      .values(request)
      .returning();
    return created;
  }

  async markPrayerRequestRead(id: number): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ isRead: true })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  // Prayer Replies
  async getRepliesForRequest(requestId: number): Promise<PrayerReply[]> {
    return await db
      .select()
      .from(prayerReplies)
      .where(eq(prayerReplies.requestId, requestId))
      .orderBy(desc(prayerReplies.createdAt));
  }

  async createPrayerReply(reply: InsertPrayerReply): Promise<PrayerReply> {
    const [created] = await db
      .insert(prayerReplies)
      .values(reply)
      .returning();
    return created;
  }

  // Thread Messages
  async getThreadMessages(requestId: number): Promise<ThreadMessage[]> {
    return await db
      .select()
      .from(threadMessages)
      .where(eq(threadMessages.requestId, requestId))
      .orderBy(threadMessages.createdAt);
  }

  async createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage> {
    const [created] = await db
      .insert(threadMessages)
      .values(message)
      .returning();
    return created;
  }

  async markAdminMessagesRead(requestId: number): Promise<number> {
    const result = await db
      .update(threadMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(threadMessages.requestId, requestId),
          eq(threadMessages.senderType, "admin"),
          eq(threadMessages.isRead, false)
        )
      )
      .returning();
    return result.length;
  }

  async getPrayerRequestsByEmail(email: string): Promise<PrayerRequest[]> {
    return await db
      .select()
      .from(prayerRequests)
      .where(ilike(prayerRequests.email, email))
      .orderBy(desc(prayerRequests.createdAt));
  }

  async getPrayerRequestsByUid(uid: string): Promise<PrayerRequest[]> {
    return await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.firebaseUid, uid))
      .orderBy(desc(prayerRequests.createdAt));
  }

  async linkPrayerToUid(id: number, uid: string): Promise<void> {
    await db
      .update(prayerRequests)
      .set({ firebaseUid: uid })
      .where(and(eq(prayerRequests.id, id), isNull(prayerRequests.firebaseUid)));
  }

  async markPrayerAnswered(id: number, uid: string, answerNote?: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status: "answered", answeredAt: new Date(), answerNote: answerNote ?? null })
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid)))
      .returning();
    return updated;
  }

  async withdrawPrayerRequest(id: number, uid: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status: "closed" })
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid), eq(prayerRequests.status, "new")))
      .returning();
    return updated;
  }

  async updatePrayerRequestByUser(id: number, uid: string, data: { subject?: string; message?: string }): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set(data)
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid), eq(prayerRequests.status, "new")))
      .returning();
    return updated;
  }

  // Prayer Request Status
  async updatePrayerRequestStatus(id: number, status: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  async updatePrayerRequestCategory(id: number, category: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ category })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  // Auto-Reply Templates
  async getAutoReplyTemplate(templateType: string): Promise<AutoReplyTemplate | undefined> {
    const [template] = await db
      .select()
      .from(autoReplyTemplates)
      .where(eq(autoReplyTemplates.templateType, templateType));
    return template;
  }

  async getAutoReplyTemplates(): Promise<AutoReplyTemplate[]> {
    return await db.select().from(autoReplyTemplates);
  }

  async upsertAutoReplyTemplate(template: InsertAutoReplyTemplate): Promise<AutoReplyTemplate> {
    const existing = await this.getAutoReplyTemplate(template.templateType);
    if (existing) {
      const [updated] = await db
        .update(autoReplyTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(autoReplyTemplates.templateType, template.templateType))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(autoReplyTemplates)
      .values(template)
      .returning();
    return created;
  }

  // Prayer Attachments
  async getAttachmentsForRequest(requestId: number): Promise<PrayerAttachment[]> {
    return await db
      .select()
      .from(prayerAttachments)
      .where(eq(prayerAttachments.requestId, requestId))
      .orderBy(prayerAttachments.createdAt);
  }

  async createPrayerAttachment(attachment: InsertPrayerAttachment): Promise<PrayerAttachment> {
    const [created] = await db
      .insert(prayerAttachments)
      .values(attachment)
      .returning();
    return created;
  }

  // Support Tickets
  async getSupportTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return created;
  }

  // Contact Messages
  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return created;
  }

  // General Inquiries
  async getGeneralInquiries(): Promise<GeneralInquiry[]> {
    return await db.select().from(generalInquiries).orderBy(desc(generalInquiries.createdAt));
  }

  async createGeneralInquiry(inquiry: InsertGeneralInquiry): Promise<GeneralInquiry> {
    const [created] = await db
      .insert(generalInquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  // Feedback
  async getFeedback(): Promise<FeedbackMessage[]> {
    return await db.select().from(feedbackMessages).orderBy(desc(feedbackMessages.createdAt));
  }

  async createFeedback(feedback: InsertFeedback): Promise<FeedbackMessage> {
    const [created] = await db
      .insert(feedbackMessages)
      .values(feedback)
      .returning();
    return created;
  }

  // Partnership
  async getPartnershipInquiries(): Promise<PartnershipInquiry[]> {
    return await db.select().from(partnershipInquiries).orderBy(desc(partnershipInquiries.createdAt));
  }

  async createPartnershipInquiry(inquiry: InsertPartnership): Promise<PartnershipInquiry> {
    const [created] = await db
      .insert(partnershipInquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  // Bible Passages
  async getBiblePassage(reference: string, translation: BibleTranslation): Promise<BiblePassage | undefined> {
    const [passage] = await db
      .select()
      .from(biblePassages)
      .where(and(
        eq(biblePassages.reference, reference),
        eq(biblePassages.translation, translation)
      ));
    return passage;
  }

  async getBiblePassages(references: string[], translation: BibleTranslation): Promise<BiblePassage[]> {
    if (references.length === 0) return [];
    const results: BiblePassage[] = [];
    for (const ref of references) {
      const passage = await this.getBiblePassage(ref, translation);
      if (passage) results.push(passage);
    }
    return results;
  }

  async getAllBiblePassages(translation: BibleTranslation): Promise<BiblePassage[]> {
    return await db
      .select()
      .from(biblePassages)
      .where(eq(biblePassages.translation, translation))
      .orderBy(biblePassages.reference);
  }

  async createBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage> {
    const [created] = await db
      .insert(biblePassages)
      .values(passage)
      .returning();
    return created;
  }

  async upsertBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage> {
    const existing = await this.getBiblePassage(passage.reference, passage.translation as BibleTranslation);
    if (existing) {
      const [updated] = await db
        .update(biblePassages)
        .set({ content: passage.content })
        .where(eq(biblePassages.id, existing.id))
        .returning();
      return updated;
    }
    return this.createBiblePassage(passage);
  }

  // Sunday School
  async getSundaySchoolLessons(): Promise<SundaySchoolLesson[]> {
    return await db
      .select()
      .from(sundaySchoolLessons)
      .orderBy(desc(sundaySchoolLessons.date));
  }

  async getSundaySchoolLesson(id: number): Promise<SundaySchoolLesson | undefined> {
    const [lesson] = await db
      .select()
      .from(sundaySchoolLessons)
      .where(eq(sundaySchoolLessons.id, id));
    return lesson;
  }

  async createSundaySchoolLesson(lesson: InsertSundaySchoolLesson): Promise<SundaySchoolLesson> {
    const [created] = await db
      .insert(sundaySchoolLessons)
      .values(lesson)
      .returning();
    return created;
  }

  async updateSundaySchoolLesson(id: number, updates: Partial<InsertSundaySchoolLesson>): Promise<SundaySchoolLesson> {
    const [updated] = await db
      .update(sundaySchoolLessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sundaySchoolLessons.id, id))
      .returning();
    return updated;
  }

  async deleteSundaySchoolLesson(id: number): Promise<void> {
    await db.delete(sundaySchoolLessons).where(eq(sundaySchoolLessons.id, id));
  }

  async getApprovedTestimonies(): Promise<Testimony[]> {
    return await db
      .select()
      .from(testimonies)
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));
  }

  async getAllTestimonies(): Promise<Testimony[]> {
    return await db
      .select()
      .from(testimonies)
      .where(or(eq(testimonies.isDraft, false), isNull(testimonies.isDraft)))
      .orderBy(desc(testimonies.createdAt));
  }

  async createTestimony(testimony: InsertTestimony): Promise<Testimony> {
    const [created] = await db
      .insert(testimonies)
      .values(testimony)
      .returning();
    return created;
  }

  async approveTestimony(id: number): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isApproved: true })
      .where(eq(testimonies.id, id))
      .returning();
    return updated;
  }

  async rejectTestimony(id: number): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isDraft: true, isApproved: false })
      .where(eq(testimonies.id, id))
      .returning();
    return updated;
  }

  async deleteTestimony(id: number): Promise<void> {
    await db.delete(testimonies).where(eq(testimonies.id, id));
  }

  async getUserTestimony(prayerRequestId: number, uid: string): Promise<Testimony | undefined> {
    const [t] = await db
      .select()
      .from(testimonies)
      .where(and(eq(testimonies.requestId, prayerRequestId), eq(testimonies.firebaseUid, uid)));
    return t;
  }

  async upsertUserTestimony(prayerRequestId: number, uid: string, data: { name?: string; message: string }): Promise<Testimony> {
    const existing = await this.getUserTestimony(prayerRequestId, uid);
    if (existing) {
      const [updated] = await db
        .update(testimonies)
        .set({ name: data.name ?? existing.name, message: data.message })
        .where(eq(testimonies.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(testimonies)
      .values({ requestId: prayerRequestId, firebaseUid: uid, name: data.name ?? null, message: data.message, isDraft: true })
      .returning();
    return created;
  }

  async submitTestimonyForReview(id: number, uid: string): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isDraft: false })
      .where(and(eq(testimonies.id, id), eq(testimonies.firebaseUid, uid)))
      .returning();
    return updated;
  }

  async getFollowUpsForRequest(requestId: number): Promise<PrayerFollowUp[]> {
    return await db
      .select()
      .from(prayerFollowUps)
      .where(eq(prayerFollowUps.requestId, requestId))
      .orderBy(prayerFollowUps.sentAt);
  }

  async createFollowUp(requestId: number, dayNumber: number, message: string): Promise<PrayerFollowUp> {
    const [created] = await db
      .insert(prayerFollowUps)
      .values({ requestId, dayNumber, message })
      .returning();
    return created;
  }

  async getRequestsNeedingFollowUp(dayNumber: number): Promise<PrayerRequest[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayNumber);
    cutoffDate.setHours(0, 0, 0, 0);

    const endDate = new Date(cutoffDate);
    endDate.setDate(endDate.getDate() + 1);

    const existingFollowUps = db
      .select({ requestId: prayerFollowUps.requestId })
      .from(prayerFollowUps)
      .where(eq(prayerFollowUps.dayNumber, dayNumber));

    return await db
      .select()
      .from(prayerRequests)
      .where(
        and(
          lte(prayerRequests.createdAt, endDate),
          sql`${prayerRequests.createdAt} >= ${cutoffDate}`,
          sql`${prayerRequests.id} NOT IN (${existingFollowUps})`
        )
      );
  }
  // Inbox methods
  async createInboxThread(thread: InsertInboxThread, firstMessage: string): Promise<InboxThread> {
    const [created] = await db
      .insert(inboxThreads)
      .values({ ...thread, hasUnreadAdmin: true })
      .returning();
    await db
      .insert(inboxMessages)
      .values({ threadId: created.id, senderType: "user", message: firstMessage });
    return created;
  }

  async getInboxThreadsByEmail(email: string): Promise<InboxThread[]> {
    return await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.userEmail, email.toLowerCase()))
      .orderBy(desc(inboxThreads.updatedAt));
  }

  async getAllInboxThreads(filters?: { category?: string; status?: string }): Promise<InboxThread[]> {
    const conditions = [];
    if (filters?.category) conditions.push(eq(inboxThreads.category, filters.category));
    if (filters?.status) conditions.push(eq(inboxThreads.status, filters.status));
    return await db
      .select()
      .from(inboxThreads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inboxThreads.updatedAt));
  }

  async getInboxThread(id: number): Promise<InboxThread | undefined> {
    const [thread] = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, id));
    return thread;
  }

  async getInboxMessages(threadId: number, viewerType: "user" | "admin"): Promise<InboxMessage[]> {
    const deletedCol = viewerType === "user" ? inboxMessages.deletedByUser : inboxMessages.deletedByAdmin;
    return await db
      .select()
      .from(inboxMessages)
      .where(and(eq(inboxMessages.threadId, threadId), eq(deletedCol, false)))
      .orderBy(inboxMessages.createdAt);
  }

  async createInboxMessage(message: InsertInboxMessage): Promise<InboxMessage> {
    const [created] = await db
      .insert(inboxMessages)
      .values(message)
      .returning();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (message.senderType === "admin" || message.senderType === "ai") {
      updateData.hasUnreadUser = true;
      updateData.status = "replied";
    } else {
      updateData.hasUnreadAdmin = true;
    }
    await db
      .update(inboxThreads)
      .set(updateData)
      .where(eq(inboxThreads.id, message.threadId));
    return created;
  }

  async updateInboxThreadStatus(id: number, status: string): Promise<InboxThread> {
    const [updated] = await db
      .update(inboxThreads)
      .set({ status, updatedAt: new Date() })
      .where(eq(inboxThreads.id, id))
      .returning();
    return updated;
  }

  async markInboxThreadRead(id: number, readerType: "user" | "admin"): Promise<void> {
    const field = readerType === "user" ? { hasUnreadUser: false } : { hasUnreadAdmin: false };
    await db
      .update(inboxThreads)
      .set(field)
      .where(eq(inboxThreads.id, id));
  }

  async deleteInboxMessage(id: number, viewerType: "user" | "admin"): Promise<void> {
    const field = viewerType === "user" ? { deletedByUser: true } : { deletedByAdmin: true };
    await db
      .update(inboxMessages)
      .set(field)
      .where(eq(inboxMessages.id, id));
  }

  async getLastInboxMessage(threadId: number): Promise<InboxMessage | undefined> {
    const [msg] = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(desc(inboxMessages.createdAt))
      .limit(1);
    return msg;
  }

  async cleanupOldInboxMessages(daysOld: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const result = await db
      .delete(inboxMessages)
      .where(lte(inboxMessages.createdAt, cutoff))
      .returning();
    return result.length;
  }

  // Songs — Song of the Week
  async getFeaturedSong(): Promise<Song | undefined> {
    const today = new Date().toISOString().split("T")[0];
    // Try to find a song featured for today's date range first
    const [dated] = await db
      .select()
      .from(songs)
      .where(
        and(
          eq(songs.isActive, true),
          sql`${songs.featuredWeekStart} <= ${today}`,
          sql`${songs.featuredWeekEnd} >= ${today}`
        )
      )
      .orderBy(desc(songs.featuredWeekStart))
      .limit(1);
    if (dated) return dated;
    // Fall back to the most recently created active song
    const [fallback] = await db
      .select()
      .from(songs)
      .where(eq(songs.isActive, true))
      .orderBy(desc(songs.createdAt))
      .limit(1);
    return fallback;
  }

  async getPublicSongs(): Promise<Song[]> {
    return db.select().from(songs)
      .where(eq(songs.isActive, true))
      .orderBy(desc(songs.createdAt));
  }

  async getSongs(): Promise<Song[]> {
    return db.select().from(songs).orderBy(desc(songs.createdAt));
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async getSongBySlug(slug: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.slug, slug));
    return song;
  }

  async deleteSong(id: number): Promise<void> {
    await db.delete(songs).where(eq(songs.id, id));
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [created] = await db.insert(songs).values(song).returning();
    return created;
  }

  async updateSong(id: number, updates: Partial<InsertSong>): Promise<Song> {
    const [updated] = await db
      .update(songs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(songs.id, id))
      .returning();
    return updated;
  }

  async getSongTestimonies(songId?: number): Promise<SongTestimony[]> {
    if (songId !== undefined) {
      return db
        .select()
        .from(songTestimonies)
        .where(eq(songTestimonies.songId, songId))
        .orderBy(desc(songTestimonies.createdAt));
    }
    return db.select().from(songTestimonies).orderBy(desc(songTestimonies.createdAt));
  }

  async createSongTestimony(testimony: InsertSongTestimony): Promise<SongTestimony> {
    const [created] = await db.insert(songTestimonies).values(testimony).returning();
    return created;
  }

  async updateSongTestimony(id: number, data: Partial<SongTestimony>): Promise<SongTestimony> {
    const [updated] = await db
      .update(songTestimonies)
      .set(data)
      .where(eq(songTestimonies.id, id))
      .returning();
    return updated;
  }

  async deleteSongTestimony(id: number): Promise<void> {
    await db.delete(songTestimonies).where(eq(songTestimonies.id, id));
  }

  async getGivingMethods(activeOnly = false): Promise<GivingMethod[]> {
    if (activeOnly) {
      return db
        .select()
        .from(givingMethods)
        .where(eq(givingMethods.isActive, true))
        .orderBy(givingMethods.displayOrder, givingMethods.id);
    }
    return db.select().from(givingMethods).orderBy(givingMethods.displayOrder, givingMethods.id);
  }

  async createGivingMethod(method: InsertGivingMethod): Promise<GivingMethod> {
    const [created] = await db.insert(givingMethods).values(method).returning();
    return created;
  }

  async updateGivingMethod(id: number, data: Partial<InsertGivingMethod>): Promise<GivingMethod | undefined> {
    const [updated] = await db
      .update(givingMethods)
      .set(data)
      .where(eq(givingMethods.id, id))
      .returning();
    return updated;
  }

  async deleteGivingMethod(id: number): Promise<void> {
    await db.delete(givingMethods).where(eq(givingMethods.id, id));
  }

  // ── User Library ──────────────────────────────────────────────────────────

  async getUserSavedSongs(uid: string): Promise<(UserSavedSong & { song: Song })[]> {
    const rows = await db
      .select({ saved: userSavedSongs, song: songs })
      .from(userSavedSongs)
      .innerJoin(songs, eq(userSavedSongs.songId, songs.id))
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(songs.isActive, true)))
      .orderBy(desc(userSavedSongs.savedAt));
    return rows.map((r) => ({ ...r.saved, song: r.song }));
  }

  async saveSong(uid: string, songId: number): Promise<UserSavedSong> {
    const [row] = await db
      .insert(userSavedSongs)
      .values({ firebaseUid: uid, songId })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(userSavedSongs)
        .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
      return existing;
    }
    return row;
  }

  async unsaveSong(uid: string, songId: number): Promise<void> {
    await db
      .delete(userSavedSongs)
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
  }

  async isSongSaved(uid: string, songId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: userSavedSongs.id })
      .from(userSavedSongs)
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
    return !!row;
  }

  async getUserFavoriteSongs(uid: string): Promise<(UserFavoriteSong & { song: Song })[]> {
    const rows = await db
      .select({ fav: userFavoriteSongs, song: songs })
      .from(userFavoriteSongs)
      .innerJoin(songs, eq(userFavoriteSongs.songId, songs.id))
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(songs.isActive, true)))
      .orderBy(desc(userFavoriteSongs.createdAt));
    return rows.map((r) => ({ ...r.fav, song: r.song }));
  }

  async favoriteSong(uid: string, songId: number): Promise<UserFavoriteSong> {
    const [row] = await db
      .insert(userFavoriteSongs)
      .values({ firebaseUid: uid, songId })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(userFavoriteSongs)
        .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
      return existing;
    }
    return row;
  }

  async unfavoriteSong(uid: string, songId: number): Promise<void> {
    await db
      .delete(userFavoriteSongs)
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
  }

  async isSongFavorited(uid: string, songId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: userFavoriteSongs.id })
      .from(userFavoriteSongs)
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
    return !!row;
  }

  async mergeLocalFavorites(uid: string, songIds: number[]): Promise<void> {
    if (!songIds.length) return;
    const validSongs = await db
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.isActive, true), sql`${songs.id} = ANY(${songIds})`));
    const validIds = validSongs.map((s) => s.id);
    if (!validIds.length) return;
    await db
      .insert(userFavoriteSongs)
      .values(validIds.map((songId) => ({ firebaseUid: uid, songId })))
      .onConflictDoNothing();
  }

  async getUserDownloadHistory(uid: string): Promise<(UserDownloadRecord & { song: Song | null })[]> {
    const rows = await db
      .select({ dl: userDownloadHistory, song: songs })
      .from(userDownloadHistory)
      .leftJoin(songs, eq(userDownloadHistory.songId, songs.id))
      .where(eq(userDownloadHistory.firebaseUid, uid))
      .orderBy(desc(userDownloadHistory.downloadedAt))
      .limit(100);
    return rows.map((r) => ({ ...r.dl, song: r.song }));
  }

  async recordDownload(uid: string, songId: number): Promise<UserDownloadRecord> {
    const [row] = await db
      .insert(userDownloadHistory)
      .values({ firebaseUid: uid, songId })
      .returning();
    return row;
  }

  async getUserPlaybackHistory(uid: string): Promise<(UserPlaybackHistory & { song: Song | null })[]> {
    const rows = await db
      .select({ history: userPlaybackHistory, song: songs })
      .from(userPlaybackHistory)
      .leftJoin(songs, eq(userPlaybackHistory.songId, songs.id))
      .where(eq(userPlaybackHistory.firebaseUid, uid))
      .orderBy(desc(userPlaybackHistory.lastPlayedAt))
      .limit(20);
    return rows.map((r) => ({ ...r.history, song: r.song }));
  }

  async upsertPlaybackPosition(uid: string, songId: number, lastPosition: number, durationSecs: number, progressPercent: number): Promise<void> {
    await db
      .insert(userPlaybackHistory)
      .values({ firebaseUid: uid, songId, lastPosition, durationSecs, progressPercent, lastPlayedAt: new Date() })
      .onConflictDoUpdate({
        target: [userPlaybackHistory.firebaseUid, userPlaybackHistory.songId],
        set: { lastPosition, durationSecs, progressPercent, lastPlayedAt: new Date() },
      });
  }

  async getUserMusicSettings(uid: string): Promise<UserMusicSettings | null> {
    const [row] = await db
      .select()
      .from(userMusicSettings)
      .where(eq(userMusicSettings.firebaseUid, uid));
    return row ?? null;
  }

  async upsertUserMusicSettings(uid: string, settings: Partial<Pick<UserMusicSettings, "autoplayNext" | "rememberPosition" | "defaultSpeed" | "repeatMode" | "shuffle">>): Promise<UserMusicSettings> {
    const [row] = await db
      .insert(userMusicSettings)
      .values({
        firebaseUid: uid,
        autoplayNext: settings.autoplayNext ?? false,
        rememberPosition: settings.rememberPosition ?? true,
        defaultSpeed: settings.defaultSpeed ?? 1,
        repeatMode: settings.repeatMode ?? "none",
        shuffle: settings.shuffle ?? false,
      })
      .onConflictDoUpdate({
        target: userMusicSettings.firebaseUid,
        set: {
          ...(settings.autoplayNext !== undefined && { autoplayNext: settings.autoplayNext }),
          ...(settings.rememberPosition !== undefined && { rememberPosition: settings.rememberPosition }),
          ...(settings.defaultSpeed !== undefined && { defaultSpeed: settings.defaultSpeed }),
          ...(settings.repeatMode !== undefined && { repeatMode: settings.repeatMode }),
          ...(settings.shuffle !== undefined && { shuffle: settings.shuffle }),
        },
      })
      .returning();
    return row;
  }

  // ── Phase F: Devotional Account Sync ────────────────────────────────────────

  async getSavedDevotionals(uid: string): Promise<(UserSavedDevotional & { devotional: Devotional })[]> {
    const rows = await db
      .select({ saved: userSavedDevotionals, devotional: devotionals })
      .from(userSavedDevotionals)
      .innerJoin(devotionals, eq(userSavedDevotionals.devotionalId, devotionals.id))
      .where(and(eq(userSavedDevotionals.firebaseUid, uid), or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted))))
      .orderBy(desc(userSavedDevotionals.savedAt));
    return rows.map(r => ({ ...r.saved, devotional: r.devotional }));
  }

  async saveDevotional(uid: string, devotionalId: number): Promise<void> {
    await db.insert(userSavedDevotionals).values({ firebaseUid: uid, devotionalId }).onConflictDoNothing();
  }

  async unsaveDevotional(uid: string, devotionalId: number): Promise<void> {
    await db.delete(userSavedDevotionals).where(and(eq(userSavedDevotionals.firebaseUid, uid), eq(userSavedDevotionals.devotionalId, devotionalId)));
  }

  async isDevotionalSaved(uid: string, devotionalId: number): Promise<boolean> {
    const [row] = await db.select({ id: userSavedDevotionals.id }).from(userSavedDevotionals)
      .where(and(eq(userSavedDevotionals.firebaseUid, uid), eq(userSavedDevotionals.devotionalId, devotionalId)));
    return !!row;
  }

  async mergeLocalDevotionalSaves(uid: string, devotionalIds: number[]): Promise<void> {
    if (!devotionalIds.length) return;
    const values = devotionalIds.map(devotionalId => ({ firebaseUid: uid, devotionalId }));
    await db.insert(userSavedDevotionals).values(values).onConflictDoNothing();
  }

  async recordDevotionalRead(uid: string, devotionalId: number): Promise<void> {
    await db.insert(userDevotionalHistory)
      .values({ firebaseUid: uid, devotionalId, firstOpenedAt: new Date(), lastOpenedAt: new Date() })
      .onConflictDoUpdate({
        target: [userDevotionalHistory.firebaseUid, userDevotionalHistory.devotionalId],
        set: { lastOpenedAt: new Date() },
      });
  }

  async getDevotionalHistory(uid: string): Promise<(UserDevotionalHistory & { devotional: Devotional })[]> {
    const rows = await db
      .select({ history: userDevotionalHistory, devotional: devotionals })
      .from(userDevotionalHistory)
      .innerJoin(devotionals, eq(userDevotionalHistory.devotionalId, devotionals.id))
      .where(and(eq(userDevotionalHistory.firebaseUid, uid), or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted))))
      .orderBy(desc(userDevotionalHistory.lastOpenedAt))
      .limit(20);
    return rows.map(r => ({ ...r.history, devotional: r.devotional }));
  }

  async getDevotionalStreak(uid: string): Promise<UserDevotionalStreak | null> {
    const [row] = await db.select().from(userDevotionalStreak).where(eq(userDevotionalStreak.firebaseUid, uid));
    return row ?? null;
  }

  async upsertDevotionalStreak(uid: string, currentStreak: number, longestStreak: number, lastReadDate: string): Promise<UserDevotionalStreak> {
    const [row] = await db.insert(userDevotionalStreak)
      .values({ firebaseUid: uid, currentStreak, longestStreak, lastReadDate })
      .onConflictDoUpdate({
        target: userDevotionalStreak.firebaseUid,
        set: { currentStreak, longestStreak, lastReadDate },
      })
      .returning();
    return row;
  }

  async getDevotionalNote(uid: string, devotionalId: number): Promise<UserDevotionalNote | null> {
    const [row] = await db.select().from(userDevotionalNotes)
      .where(and(eq(userDevotionalNotes.firebaseUid, uid), eq(userDevotionalNotes.devotionalId, devotionalId)));
    return row ?? null;
  }

  async upsertDevotionalNote(uid: string, devotionalId: number, noteText: string): Promise<void> {
    await db.insert(userDevotionalNotes)
      .values({ firebaseUid: uid, devotionalId, noteText, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [userDevotionalNotes.firebaseUid, userDevotionalNotes.devotionalId],
        set: { noteText, updatedAt: new Date() },
      });
  }

  async deleteDevotionalNote(uid: string, devotionalId: number): Promise<void> {
    await db.delete(userDevotionalNotes).where(and(eq(userDevotionalNotes.firebaseUid, uid), eq(userDevotionalNotes.devotionalId, devotionalId)));
  }

  async createDonationConfirmation(data: InsertDonationConfirmation): Promise<DonationConfirmation> {
    const [row] = await db.insert(donationConfirmations).values(data).returning();
    return row;
  }

  async getDonationConfirmations(): Promise<DonationConfirmation[]> {
    return await db.select().from(donationConfirmations).orderBy(desc(donationConfirmations.createdAt));
  }

  async updateDonationConfirmationThankYouStatus(id: number, status: string): Promise<DonationConfirmation> {
    const [row] = await db
      .update(donationConfirmations)
      .set({ thankYouStatus: status, thankYouSentAt: status === "sent" ? new Date() : null })
      .where(eq(donationConfirmations.id, id))
      .returning();
    return row;
  }

  // ── Church Mode — Phase 2A ──────────────────────────────────────────────────

  async createChurch(data: InsertChurch): Promise<Church> {
    const [row] = await db.insert(churches).values(data).returning();
    return row;
  }

  async getChurch(id: number): Promise<Church | undefined> {
    const [row] = await db.select().from(churches).where(eq(churches.id, id));
    return row;
  }

  async getChurchBySlug(slug: string): Promise<Church | undefined> {
    const [row] = await db.select().from(churches).where(eq(churches.slug, slug));
    return row;
  }

  async getChurchesByOwner(ownerId: string): Promise<Church[]> {
    return await db.select().from(churches).where(eq(churches.ownerId, ownerId)).orderBy(desc(churches.createdAt));
  }

  async updateChurch(id: number, data: Partial<InsertChurch>): Promise<Church> {
    const [row] = await db.update(churches).set(data).where(eq(churches.id, id)).returning();
    return row;
  }

  async deleteChurch(id: number): Promise<void> {
    await db.delete(churches).where(eq(churches.id, id));
  }

  async addChurchMember(data: InsertChurchMember): Promise<ChurchMember> {
    const [row] = await db.insert(churchMembers).values(data)
      .onConflictDoUpdate({
        target: [churchMembers.churchId, churchMembers.firebaseUid],
        set: { role: data.role, status: data.status ?? "active" },
      })
      .returning();
    return row;
  }

  async getChurchMembers(churchId: number): Promise<ChurchMember[]> {
    return await db.select().from(churchMembers)
      .where(eq(churchMembers.churchId, churchId))
      .orderBy(churchMembers.joinedAt);
  }

  async getChurchMember(churchId: number, firebaseUid: string): Promise<ChurchMember | undefined> {
    const [row] = await db.select().from(churchMembers)
      .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.firebaseUid, firebaseUid)));
    return row;
  }

  async getUserChurches(firebaseUid: string): Promise<(ChurchMember & { church: Church })[]> {
    const rows = await db
      .select({ member: churchMembers, church: churches })
      .from(churchMembers)
      .innerJoin(churches, eq(churchMembers.churchId, churches.id))
      .where(and(eq(churchMembers.firebaseUid, firebaseUid), eq(churchMembers.status, "active")))
      .orderBy(desc(churchMembers.joinedAt));
    return rows.map(r => ({ ...r.member, church: r.church }));
  }

  async updateChurchMemberRole(id: number, role: string): Promise<ChurchMember> {
    const [row] = await db.update(churchMembers).set({ role }).where(eq(churchMembers.id, id)).returning();
    return row;
  }

  async updateChurchMemberStatus(id: number, status: string): Promise<ChurchMember> {
    const [row] = await db.update(churchMembers).set({ status }).where(eq(churchMembers.id, id)).returning();
    return row;
  }

  async removeChurchMember(churchId: number, firebaseUid: string): Promise<void> {
    await db.delete(churchMembers).where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.firebaseUid, firebaseUid)));
  }

  async createChurchInvitation(data: InsertChurchInvitation): Promise<ChurchInvitation> {
    const [row] = await db.insert(churchInvitations).values(data).returning();
    return row;
  }

  async getChurchInvitation(inviteCode: string): Promise<ChurchInvitation | undefined> {
    const [row] = await db.select().from(churchInvitations).where(eq(churchInvitations.inviteCode, inviteCode));
    return row;
  }

  async getChurchInvitations(churchId: number): Promise<ChurchInvitation[]> {
    return await db.select().from(churchInvitations)
      .where(eq(churchInvitations.churchId, churchId))
      .orderBy(desc(churchInvitations.createdAt));
  }

  async useChurchInvitation(inviteCode: string): Promise<ChurchInvitation> {
    const [row] = await db.update(churchInvitations)
      .set({ usedCount: sql`${churchInvitations.usedCount} + 1` })
      .where(eq(churchInvitations.inviteCode, inviteCode))
      .returning();
    return row;
  }

  async deactivateChurchInvitation(id: number): Promise<void> {
    await db.update(churchInvitations).set({ isActive: false }).where(eq(churchInvitations.id, id));
  }
}

export const storage = new DatabaseStorage();
