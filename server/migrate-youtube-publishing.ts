import { pool } from "./db";

export async function runYoutubePublishingMigration() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS youtube_connection (
        id SERIAL PRIMARY KEY,
        channel_id TEXT,
        channel_name TEXT,
        channel_thumbnail_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        scope TEXT,
        connected_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS youtube_song_uploads (
        id SERIAL PRIMARY KEY,
        song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        youtube_video_id TEXT,
        youtube_video_url TEXT,
        youtube_title TEXT,
        privacy_status TEXT DEFAULT 'private',
        processing_status TEXT DEFAULT 'pending',
        uploaded_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[migrate] youtube_connection + youtube_song_uploads tables ready");
  } finally {
    client.release();
  }
}
