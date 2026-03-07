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
  deleteTestimony(id: number): Promise<void>;

  // Prayer Follow-Ups
  getFollowUpsForRequest(requestId: number): Promise<PrayerFollowUp[]>;
  createFollowUp(requestId: number, dayNumber: number, message: string): Promise<PrayerFollowUp>;
  getRequestsNeedingFollowUp(dayNumber: number): Promise<PrayerRequest[]>;

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

  async deleteTestimony(id: number): Promise<void> {
    await db.delete(testimonies).where(eq(testimonies.id, id));
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
}

export const storage = new DatabaseStorage();
