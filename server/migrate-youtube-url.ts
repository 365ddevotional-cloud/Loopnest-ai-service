/**
 * Idempotent migration: adds youtube_url column to songs table.
 * Safe to run on every server start.
 */
import { pool } from "./db";

export async function runYoutubeUrlMigration(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE songs
      ADD COLUMN IF NOT EXISTS youtube_url TEXT
    `);
  } catch (err) {
    console.error("[youtube-url-migration] Error:", err);
  }
}
