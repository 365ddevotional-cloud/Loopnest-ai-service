import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import { z } from "zod";
import catalog from "../client/src/data/ministry-shop-catalog.json";

const entry = z.object({
  id: z.string().regex(/^[A-Za-z0-9]+$/),
  status: z.literal("recovered"),
  file: z.string(),
  bytes: z.number().int().positive(),
  mime: z.string().regex(/^(application|image|audio|video)\/[a-z0-9.+-]+$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const indexSchema = z.object({ products: z.array(z.object({ status: z.string() }).passthrough()) });
const digitalProductIds = new Set(catalog.filter(item => item.kind !== "Membership").map(item => item.id));

async function hashFile(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function main() {
  const [directory, flag, ...extra] = process.argv.slice(2);
  const replaceBooks = flag === "--replace-book-pdfs";
  if (!directory || extra.length || (flag && flag !== "--upload" && !replaceBooks)) {
    throw new Error("Usage: node --import tsx script/import-ministry-shop-assets.ts EXTRACTED_DIRECTORY [--upload | --replace-book-pdfs]");
  }

  const root = await realpath(directory);
  const index = indexSchema.parse(JSON.parse(await readFile(path.join(root, "catalog-index.json"), "utf8")));
  const records = index.products.filter(item => item.status === "recovered").map(item => entry.parse(item));
  if (!records.length) throw new Error("The catalog index has no recovered files.");

  const used = new Set<string>();
  const files = [];
  for (const item of records) {
    const [id, name, ...nested] = item.file.split("/");
    const identity = `${item.id}:${item.sha256}`;
    if (!digitalProductIds.has(item.id) || id !== item.id || !name || nested.length ||
        name === "." || name === ".." || name.includes("\\") || used.has(identity)) {
      throw new Error(`Invalid or duplicate catalog entry: ${item.id}`);
    }
    used.add(identity);

    const file = await realpath(path.join(root, id, name));
    const relative = path.relative(root, file);
    if (relative !== path.join(id, name)) throw new Error(`Unsafe file location: ${item.id}`);
    const info = await stat(file);
    if (!info.isFile() || info.size !== item.bytes || await hashFile(file) !== item.sha256) {
      throw new Error(`File verification failed: ${item.id}`);
    }

    files.push({ ...item, file, name, key: `ministry-shop/${item.id}/${item.sha256}` });
  }

  if (replaceBooks) {
    const singlePdfBooks = new Set(catalog.filter(item => item.kind === "Book" && item.requiredFileCount === 1).map(item => item.id));
    if (new Set(files.map(item => item.id)).size !== files.length ||
        files.some(item => !singlePdfBooks.has(item.id) || item.mime !== "application/pdf")) {
      throw new Error("Replacement requires exactly one PDF per existing single-file book.");
    }
  }

  if (!flag) {
    console.log(`Verified ${files.length} original files. Dry run made no storage or database changes.`);
    return;
  }

  const { SHOP_R2_PRIVATE_BUCKET, SHOP_R2_ACCESS_KEY_ID, SHOP_R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME } = process.env;
  if (!SHOP_R2_PRIVATE_BUCKET || !SHOP_R2_ACCESS_KEY_ID || !SHOP_R2_SECRET_ACCESS_KEY ||
      !R2_ACCOUNT_ID || !R2_BUCKET_NAME || SHOP_R2_PRIVATE_BUCKET === R2_BUCKET_NAME) {
    throw new Error("A separate, verified private shop bucket and scoped write credentials are required.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: SHOP_R2_ACCESS_KEY_ID, secretAccessKey: SHOP_R2_SECRET_ACCESS_KEY },
  });
  const { db, pool } = await import("../server/db");
  try {
    // Fail before sending any bytes if the target database has not been prepared.
    await db.execute(sql`SELECT 1 FROM ministry_shop_assets LIMIT 1`);
    for (const item of files) {
      const object = { Bucket: SHOP_R2_PRIVATE_BUCKET, Key: item.key };
      let existing;
      try {
        existing = await client.send(new HeadObjectCommand(object));
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
      }
      if (!existing) {
        await client.send(new PutObjectCommand({
          ...object,
          Body: createReadStream(item.file),
          ContentLength: item.bytes,
          ContentType: item.mime,
          Metadata: { sha256: item.sha256 },
          IfNoneMatch: "*",
        }));
        existing = await client.send(new HeadObjectCommand(object));
      }
      if (existing.ContentLength !== item.bytes || existing.Metadata?.sha256 !== item.sha256) {
        throw new Error(`Stored file verification failed: ${item.id}`);
      }
      if (replaceBooks) continue;
      await db.execute(sql`
        INSERT INTO ministry_shop_assets (product_id, sha256, object_key, file_name, content_type, size_bytes)
        VALUES (${item.id}, ${item.sha256}, ${item.key}, ${item.name}, ${item.mime}, ${item.bytes})
        ON CONFLICT (product_id, sha256) DO NOTHING
      `);
    }
    if (replaceBooks) {
      await db.transaction(async tx => {
        // Serialize registry writes during the switch. Existing orders keep their asset snapshots.
        await tx.execute(sql`LOCK TABLE ministry_shop_assets IN SHARE ROW EXCLUSIVE MODE`);
        for (const item of files) {
          const { rows } = await tx.execute<{ sha256: string; content_type: string }>(sql`
            SELECT sha256, content_type FROM ministry_shop_assets WHERE product_id = ${item.id}
          `);
          if (rows.length !== 1 || rows[0].content_type !== "application/pdf") {
            throw new Error(`Expected one existing registered PDF: ${item.id}`);
          }
          if (rows[0].sha256 === item.sha256) continue;
          await tx.execute(sql`
            UPDATE ministry_shop_assets SET sha256 = ${item.sha256}, object_key = ${item.key},
              file_name = ${item.name}, content_type = ${item.mime}, size_bytes = ${item.bytes}
            WHERE product_id = ${item.id} AND sha256 = ${rows[0].sha256}
          `);
        }
      });
      console.log(`Replaced current PDFs for ${files.length} books. Historical objects and orders were retained.`);
      return;
    }
    console.log(`Imported ${files.length} verified originals as private shop assets.`);
  } finally {
    await pool.end();
    client.destroy();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Ministry Shop import failed.");
  process.exitCode = 1;
});
