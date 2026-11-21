import type { Express, RequestHandler } from "express";
import { z } from "zod";

const playback = z.object({
  kind: z.enum(["devotional", "school"]),
  language: z.enum(["en", "es", "fr", "yo", "ha", "ig", "pcm"]),
}).strict();

// Aggregate by account and day. Guests share one anonymous bucket per language.
let ready: Promise<void> | undefined;
async function database() {
  const { pool } = await import("./db");
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS audio_listening_daily (
    day date NOT NULL DEFAULT CURRENT_DATE, kind text NOT NULL, language text NOT NULL,
    account_id text NOT NULL, verified_email text, starts integer NOT NULL DEFAULT 1,
    last_play timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (day, kind, language, account_id)
  )`).then(() => {}).catch(error => { ready = undefined; throw error; });
  await ready;
  return pool;
}

export function registerAudioListening(app: Express, admin: RequestHandler, sameOrigin: RequestHandler) {
  app.post("/api/audio-listening", sameOrigin, async (req, res) => {
    const input = playback.safeParse(req.body);
    if (!input.success) return res.sendStatus(400);
    const header = req.get("authorization");
    let uid = "", email: string | null = null;
    if (header) {
      if (!header.startsWith("Bearer ")) return res.sendStatus(401);
      try {
        const { auth } = await import("./firebase-admin");
        const user = await auth.verifyIdToken(header.slice(7));
        uid = user.uid;
        email = user.email_verified ? user.email ?? null : null;
      } catch { return res.sendStatus(401); }
    }
    try {
      const pool = await database();
      await pool.query(`INSERT INTO audio_listening_daily (kind, language, account_id, verified_email)
        VALUES ($1,$2,$3,$4) ON CONFLICT (day, kind, language, account_id)
        DO UPDATE SET starts=audio_listening_daily.starts+1, last_play=now(), verified_email=EXCLUDED.verified_email`,
        [input.data.kind, input.data.language, uid, email]);
      res.sendStatus(204);
    } catch { res.sendStatus(503); }
  });

  app.get("/api/admin/audio-listening", admin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const page = Number(req.query.page ?? 0);
    if (!Number.isSafeInteger(page) || page < 0 || page > 100000) return res.sendStatus(400);
    try {
      const pool = await database();
      const period = "day >= CURRENT_DATE - 29";
      const totals = await pool.query(`SELECT kind, language, sum(starts)::int AS starts,
        sum(CASE WHEN account_id='' THEN starts ELSE 0 END)::int AS guests,
        count(DISTINCT nullif(account_id,''))::int AS accounts FROM audio_listening_daily
        WHERE ${period} GROUP BY kind, language ORDER BY kind, language`);
      const accounts = await pool.query(`SELECT account_id, (array_agg(verified_email ORDER BY last_play DESC))[1] AS email,
        kind, language, sum(starts)::int AS starts, max(last_play) AS latest
        FROM audio_listening_daily WHERE ${period} AND account_id <> ''
        GROUP BY account_id, kind, language ORDER BY latest DESC, account_id, kind, language LIMIT 26 OFFSET $1`, [page * 25]);
      res.json({ totals: totals.rows, accounts: accounts.rows.slice(0,25), more: accounts.rows.length > 25 });
    } catch { res.sendStatus(503); }
  });
}
