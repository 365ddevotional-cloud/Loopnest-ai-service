import { createHash } from "crypto";
import type { Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

// No IP addresses, raw browser identifiers, or user agents are retained.
export async function ensureAudienceAnalyticsTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS audience_visit_days (
    day date NOT NULL, visitor_hash text NOT NULL, country text NOT NULL DEFAULT 'Unknown',
    PRIMARY KEY (day, visitor_hash)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS audience_song_events (
    id bigserial PRIMARY KEY, song_id integer NOT NULL, kind text NOT NULL,
    country text NOT NULL DEFAULT 'Unknown', created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS audience_song_events_created_at_idx ON audience_song_events(created_at)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS play_store_visits (
    day date NOT NULL, country text NOT NULL, visitors integer NOT NULL,
    PRIMARY KEY (day, country), CHECK (visitors >= 0)
  )`);
}

export function requestCountry(req: Request): string {
  // These are meaningful only when the origin is behind a trusted edge that
  // overwrites them. Otherwise show Unknown rather than guessing from IP.
  const value = req.get("cf-ipcountry") || req.get("x-vercel-ip-country") || "";
  return /^[A-Z]{2}$/i.test(value) && !["XX", "T1"].includes(value.toUpperCase())
    ? value.toUpperCase() : "Unknown";
}

export async function recordBrowserVisit(req: Request, browserId: unknown): Promise<boolean> {
  if (typeof browserId !== "string" || !/^[a-f0-9-]{36}$/i.test(browserId)) throw new Error("Invalid browser ID");
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256").update(`${day}:${process.env.SESSION_SECRET ?? process.env.DATABASE_URL}:${browserId}`).digest("hex");
  const result = await db.execute(sql`
    INSERT INTO audience_visit_days(day, visitor_hash, country)
    VALUES (${day}, ${hash}, ${requestCountry(req)})
    ON CONFLICT DO NOTHING RETURNING visitor_hash
  `);
  return result.rows.length > 0;
}

export async function recordAudienceSongEvent(req: Request, songId: number, kind: "play" | "audio_download" | "video_download") {
  await db.execute(sql`INSERT INTO audience_song_events(song_id, kind, country)
    VALUES (${songId}, ${kind}, ${requestCountry(req)})`);
}

export async function getAudienceAnalytics(days: number) {
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const [visits, songCounts, songCountries, songs, playStore, playCountries, trend] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS total FROM audience_visit_days WHERE day >= ${since}`),
    db.execute(sql`SELECT kind, COUNT(*)::int AS total FROM audience_song_events WHERE created_at >= ${since}::date GROUP BY kind`),
    db.execute(sql`SELECT kind, country, COUNT(*)::int AS total FROM audience_song_events WHERE created_at >= ${since}::date GROUP BY kind, country ORDER BY total DESC`),
    db.execute(sql`SELECT e.song_id AS id, COALESCE(s.title, 'Removed song') AS title,
      COUNT(*) FILTER (WHERE e.kind = 'play')::int AS plays,
      COUNT(*) FILTER (WHERE e.kind IN ('audio_download','video_download'))::int AS downloads
      FROM audience_song_events e LEFT JOIN songs s ON s.id = e.song_id
      WHERE e.created_at >= ${since}::date GROUP BY e.song_id, s.title ORDER BY plays DESC, downloads DESC LIMIT 30`),
    db.execute(sql`SELECT COALESCE(SUM(visitors), 0)::int AS total FROM play_store_visits WHERE day >= ${since}`),
    db.execute(sql`SELECT country, SUM(visitors)::int AS total FROM play_store_visits WHERE day >= ${since} GROUP BY country ORDER BY total DESC`),
    db.execute(sql`SELECT day::text, COUNT(*)::int AS visitors FROM audience_visit_days WHERE day >= ${since} GROUP BY day ORDER BY day`),
  ]);
  const websiteCountries = await db.execute(sql`SELECT country, COUNT(*)::int AS total FROM audience_visit_days WHERE day >= ${since} GROUP BY country ORDER BY total DESC`);
  return {
    periodDays: days, since, websiteVisitors: Number((visits.rows[0] as any)?.total ?? 0),
    websiteCountries: websiteCountries.rows, dailyVisitors: trend.rows,
    songPlays: Number((songCounts.rows.find((r: any) => r.kind === "play") as any)?.total ?? 0),
    downloadLinks: Number(songCounts.rows.filter((r: any) => r.kind.includes("download")).reduce((sum, r: any) => sum + Number(r.total), 0)),
    songCountries: songCountries.rows, topSongs: songs.rows,
    playStoreVisitors: Number((playStore.rows[0] as any)?.total ?? 0), playStoreCountries: playCountries.rows,
  };
}

export async function savePlayStoreVisit(day: string, country: string, visitors: number) {
  await db.execute(sql`INSERT INTO play_store_visits(day, country, visitors)
    VALUES (${day}, ${country}, ${visitors})
    ON CONFLICT (day, country) DO UPDATE SET visitors = EXCLUDED.visitors`);
}
