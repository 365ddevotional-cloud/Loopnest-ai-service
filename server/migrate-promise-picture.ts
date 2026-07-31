/**
 * Idempotent migration: adds show_picture_on_promise column to user_profiles.
 * Safe to run on every server start.
 */
import { pool } from "./db";

export async function runPromisePictureMigration(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS show_picture_on_promise BOOLEAN NOT NULL DEFAULT FALSE
    `);
  } catch (err) {
    console.error("[promise-picture-migration] Error:", err);
  }
}
