import { db } from "./db";
import {
  devotionals,
  type Devotional,
  type InsertDevotional,
  type UpdateDevotionalRequest,
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
}

export const storage = new DatabaseStorage();
