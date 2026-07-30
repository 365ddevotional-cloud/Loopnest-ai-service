import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "song_collections" (
      "id" serial PRIMARY KEY,
      "title" text NOT NULL,
      "description" text,
      "cover_image_url" text,
      "release_date" text,
      "is_published" boolean NOT NULL DEFAULT true,
      "display_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);
  console.log("song_collections OK");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "song_collection_items" (
      "id" serial PRIMARY KEY,
      "collection_id" integer NOT NULL REFERENCES "song_collections"("id") ON DELETE CASCADE,
      "song_id" integer NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "display_order" integer NOT NULL DEFAULT 0,
      CONSTRAINT "unique_collection_song" UNIQUE ("collection_id", "song_id")
    )
  `);
  console.log("song_collection_items OK");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "song_engagement_events" (
      "id" serial PRIMARY KEY,
      "song_id" integer NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "event_type" text NOT NULL,
      "user_id" text,
      "session_id" text,
      "created_at" timestamp DEFAULT now()
    )
  `);
  console.log("song_engagement_events OK");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "see_song_type_idx"
    ON "song_engagement_events"("song_id", "event_type")
  `);
  console.log("index OK");
}

run().then(() => { console.log("Migration complete"); pool.end(); })
      .catch(e => { console.error("Migration error:", e.message); pool.end(); process.exit(1); });
