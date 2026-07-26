/**
 * Idempotent governance schema migration runner.
 * Runs migrations/0001_governance_schema.sql against the connected PostgreSQL
 * database on every server start.  All statements use IF NOT EXISTS / DO $$
 * guards so it is safe to run repeatedly on any existing database.
 *
 * CJS-safe: uses process.cwd() instead of import.meta.url so that the built
 * dist/index.cjs (CommonJS) starts without crashing.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { pool } from "./db";

export async function runGovernanceMigration(): Promise<void> {
  try {
    // process.cwd() is always the project root, both in dev (tsx) and in the
    // CJS built output (node dist/index.cjs). This avoids import.meta.url which
    // is undefined in CommonJS modules.
    const migrationPath = resolve(process.cwd(), "migrations", "0001_governance_schema.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    // Execute the entire file in one shot via the pg Pool client.
    // Using the raw pool (not drizzle) so multi-statement SQL, DO $$ blocks,
    // and IF NOT EXISTS guards all work correctly without custom splitting.
    const client = await pool.connect();
    try {
      await client.query(migrationSql);
    } finally {
      client.release();
    }

    console.log("[governance-migration] Governance schema migration complete");
  } catch (err: any) {
    // Log and continue — the migration is idempotent, so a transient failure
    // is recoverable on the next restart.  Do not crash the server.
    console.error("[governance-migration] Failed:", err?.message ?? err);
  }
}
