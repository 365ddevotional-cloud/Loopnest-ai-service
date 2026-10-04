import { sql } from "drizzle-orm";
import { db } from "./db";
import type { MusicOrder } from "./music-commerce";

// Small additive migration: existing music and church data are untouched.
export async function ensureMusicOrdersTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS music_purchase_orders (
    session_id text PRIMARY KEY, firebase_uid text NOT NULL,
    product_id text NOT NULL, amount_cents integer NOT NULL CHECK (amount_cents >= 50),
    status text NOT NULL DEFAULT 'pending', payment_intent_id text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`ALTER TABLE music_purchase_orders ADD COLUMN IF NOT EXISTS download_window_hours integer`);
  await db.execute(sql`ALTER TABLE music_purchase_orders ADD COLUMN IF NOT EXISTS download_expires_at timestamptz`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS music_purchase_orders_uid_idx ON music_purchase_orders(firebase_uid)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS music_purchase_orders_intent_idx ON music_purchase_orders(payment_intent_id)`);
}
const fromRow = (r: any): MusicOrder => ({ sessionId: r.session_id, uid: r.firebase_uid,
  productId: r.product_id, amountCents: r.amount_cents, status: r.status,
  paymentIntentId: r.payment_intent_id, downloadWindowHours: r.download_window_hours,
  downloadExpiresAt: r.download_expires_at ? new Date(r.download_expires_at).toISOString() : null, createdAt: new Date(r.created_at).toISOString() });
export const musicOrderStorage = {
  async createOrder(order: MusicOrder) {
    await db.execute(sql`INSERT INTO music_purchase_orders (session_id,firebase_uid,product_id,amount_cents,status,download_window_hours)
      VALUES (${order.sessionId},${order.uid},${order.productId},${order.amountCents},'pending',${order.downloadWindowHours ?? null}) ON CONFLICT (session_id) DO NOTHING`);
  },
  async getOrder(id: string) {
    const r = await db.execute(sql`SELECT * FROM music_purchase_orders WHERE session_id=${id}`);
    return r.rows[0] ? fromRow(r.rows[0]) : undefined;
  },
  async listOrders(uid: string) {
    const r = await db.execute(sql`SELECT * FROM music_purchase_orders WHERE firebase_uid=${uid} ORDER BY created_at DESC LIMIT 100`);
    return r.rows.map(fromRow);
  },
  async updateOrder(id: string, status: string, intent?: string, downloadExpiresAt?: string) {
    // Once revoked, neither a late webhook nor a success-page retry can reinstate it.
    await db.execute(sql`UPDATE music_purchase_orders SET status=${status}, payment_intent_id=COALESCE(${intent ?? null},payment_intent_id),
      download_expires_at=COALESCE(download_expires_at,${downloadExpiresAt ?? null}::timestamptz)
      WHERE session_id=${id} AND status <> 'revoked'`);
  },
  async revokeByPaymentIntent(id: string) {
    await db.execute(sql`UPDATE music_purchase_orders SET status='revoked' WHERE payment_intent_id=${id}`);
  },
};

