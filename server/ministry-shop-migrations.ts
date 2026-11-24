import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";

export const ministryShopMigrationFiles = [
  "20261118_ministry_shop_products.sql",
  "20261108_ministry_shop.sql",
  "20261108_ministry_shop_orders.sql",
  "20261118_ministry_shop_audio.sql",
  "20261124_spirittone_gold.sql",
  "20261108_ministry_shop_sales_controls.sql",
  "20261113_spirit_tone_producer_credit_fix.sql",
  "20261113_spirittone_confirmed_song_credits.sql",
];

export async function ensureMinistryShopTables() {
  const directory = process.env.NODE_ENV === "production" ? "dist/shop-migrations" : "migrations";
  const scripts = await Promise.all(ministryShopMigrationFiles.map(file => readFile(path.join(directory, file), "utf8")));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '2s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SELECT pg_advisory_xact_lock(365, 23)");
    for (const script of scripts) await client.query(script);
    // These are private extraction drafts from the approved customer PDFs.
    // They never become a public reader or paid audio offer without a review.
    const draftDirectory = process.env.NODE_ENV === "production" ? "dist/shop-migrations/readers" : "server/shop-reader-drafts";
    const names = (await readdir(draftDirectory)).filter(name=>/^[a-z0-9-]+\.json$/.test(name));
    const drafts = await Promise.all(names.map(async name=>JSON.parse(await readFile(path.join(draftDirectory,name),"utf8"))));
    await client.query(`INSERT INTO ministry_shop_reader_editions(id, product_id, asset_sha256, title, paragraphs)
      SELECT d.id, d."productId", d."assetSha256", COALESCE(p.payload->>'title',d.title), d.paragraphs
      FROM jsonb_to_recordset($1::jsonb) AS d(id text, "productId" text, "assetSha256" text, title text, paragraphs jsonb)
      LEFT JOIN ministry_shop_managed_products p ON p.id=d."productId"
      WHERE EXISTS(SELECT 1 FROM ministry_shop_assets a WHERE a.product_id=d."productId"
        AND a.content_type='application/pdf' AND a.object_key='ministry-shop/' || d."productId" || '/' || d."assetSha256")
      ON CONFLICT(id) DO NOTHING`, [JSON.stringify(drafts)]);
    // Prepare one private shop draft per existing recording. Keep the release and sales controls independent.
    await client.query(`INSERT INTO ministry_shop_managed_products(id,payload,published)
      SELECT release.id,jsonb_build_object('id',release.id,'kind','Music','title',s.title,
        'sourcePrice','$1.49','useBasePrice',false,'requiredFileCount',1,'packageFormat','zip',
        'spiritToneSongId',s.id,'spiritToneSlug',s.slug,'description',s.short_description,
        'lyrics',s.lyrics,'author','SpiritTone Records','releaseYear',s.release_year),false
      FROM (VALUES ('str02fec75c','celebrate-emmanuel-02fec75c'),
             ('strfb6b9417','glory-hallelujah-born-this-day-fb6b9417'),
             ('str8b10f8f5','navidad-don-land-8b10f8f5'),
             ('stra124aabe','bethlehem-sound-a124aabe')) AS release(id,slug)
      JOIN songs s ON s.slug=release.slug
      ON CONFLICT(id) DO NOTHING`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
