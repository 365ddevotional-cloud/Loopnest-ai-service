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
    `);
    console.log("[migrate] song_upload_defaults table ready");
  } finally {
    client.release();
  }
}
