import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_type TEXT`);
  console.log("Migration complete: song_type column added to songs table");
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
