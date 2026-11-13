import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";

export const ministryShopMigrationFiles = [
  "20261108_ministry_shop.sql",
  "20261108_ministry_shop_orders.sql",
  "20261108_ministry_shop_sales_controls.sql",
  "20261113_spirit_tone_producer_credit_fix.sql",
];

export async function ensureMinistryShopTables() {
  const directory = process.env.NODE_ENV === "production" ? "dist/shop-migrations" : "migrations";
  const scripts = await Promise.all(ministryShopMigrationFiles.map(file => readFile(path.join(directory, file), "utf8")));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '2s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SELECT pg_advisory_xact_lock(365, 23)");
    for (const script of scripts) await client.query(script);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
