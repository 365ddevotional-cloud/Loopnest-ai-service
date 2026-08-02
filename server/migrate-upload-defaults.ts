import { pool } from "./db";

export async function runUploadDefaultsMigration() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS song_upload_defaults (
        id SERIAL PRIMARY KEY,
        label_name TEXT,
        artist TEXT,
        featured_artist TEXT,
        producer TEXT,
        composer TEXT,
        lyricist TEXT,
        choir TEXT,
        instrumentalist TEXT,
        genre TEXT,
        language TEXT,
        song_type TEXT,
        release_year INTEGER,
        copyright_notice TEXT,
        label_logo_url TEXT,
        scripture_reference TEXT,
        short_description TEXT,
        description TEXT,
        download_status TEXT,
        video_download_status TEXT,
        is_active BOOLEAN,
        youtube_channel_url TEXT,
        youtube_description_footer TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_privacy TEXT DEFAULT 'private';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_made_for_kids BOOLEAN DEFAULT false;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_synthetic_content BOOLEAN DEFAULT false;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_category_id TEXT DEFAULT '10';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_language TEXT DEFAULT 'en';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_license TEXT DEFAULT 'youtube';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_allow_embedding BOOLEAN DEFAULT true;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_public_stats BOOLEAN DEFAULT true;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_notify_subscribers BOOLEAN DEFAULT true;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_default_tags TEXT;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_description_footer TEXT;
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_thumbnail_choice TEXT DEFAULT 'song_cover';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_scheduling_timezone TEXT DEFAULT 'America/Chicago';
      ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS yt_scheduling_behavior TEXT DEFAULT 'immediate';
    `);
    console.log("[migrate] song_upload_defaults table ready");
  } finally {
    client.release();
  }
}
