import { db } from "./db";
import {
  devotionals,
  prayerRequests,
  prayerReplies,
  type Devotional,
  type InsertDevotional,
  type UpdateDevotionalRequest,
  type PrayerRequest,
  type InsertPrayerRequest,
  type PrayerReply,
  type InsertPrayerReply,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
