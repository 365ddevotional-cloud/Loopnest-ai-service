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
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getDevotionals(): Promise<Devotional[]>;
  getDevotional(id: number): Promise<Devotional | undefined>;
  getDevotionalByDate(date: string): Promise<Devotional | undefined>;
  getLatestDevotional(): Promise<Devotional | undefined>;
  createDevotional(devotional: InsertDevotional): Promise<Devotional>;
  updateDevotional(id: number, updates: UpdateDevotionalRequest): Promise<Devotional>;
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
}

export class DatabaseStorage implements IStorage {
  async getDevotionals(): Promise<Devotional[]> {
    return await db.select().from(devotionals).orderBy(desc(devotionals.date));
  }

  async getDevotional(id: number): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.id, id));
    return devotional;
  }

  async getDevotionalByDate(date: string): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.date, date));
    return devotional;
  }

  async getLatestDevotional(): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
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

  async deleteDevotional(id: number): Promise<void> {
    await db.delete(devotionals).where(eq(devotionals.id, id));
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
}

export const storage = new DatabaseStorage();
