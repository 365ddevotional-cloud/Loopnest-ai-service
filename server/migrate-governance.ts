/**
 * Idempotent governance schema migration runner.
 * Reads migrations/0001_governance_schema.sql and executes it against the
 * connected PostgreSQL database on every server start.
 * All SQL statements in that file use IF NOT EXISTS / DO $$ guards, so this
 * is safe to run repeatedly on any existing database.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "./db";
import { sql } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runGovernanceMigration(): Promise<void> {
  try {
    const migrationPath = join(__dirname, "../migrations/0001_governance_schema.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    // Split on the drizzle breakpoint marker and execute each statement individually
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (err: any) {
        // Ignore "already exists" errors — the IF NOT EXISTS guards catch most,
        // but raw FK/DO $$ blocks may emit benign duplicate-object errors.
        if (!err?.message?.includes("already exists") && !err?.message?.includes("duplicate")) {
          console.warn("[governance-migration] Statement warning:", err?.message?.slice(0, 120));
        }
      }
    }

    console.log("[governance-migration] Governance schema migration complete");
  } catch (err) {
    // Non-fatal — log and continue. The migration is idempotent so a transient
    // failure is recoverable on the next restart.
    console.error("[governance-migration] Failed to run governance migration:", err);
  }
}
