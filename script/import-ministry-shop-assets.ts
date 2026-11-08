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
  if (!directory || extra.length || (flag && flag !== "--upload")) {
    throw new Error("Usage: node --import tsx script/import-ministry-shop-assets.ts EXTRACTED_DIRECTORY [--upload]");
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
      await db.execute(sql`
        INSERT INTO ministry_shop_assets (product_id, sha256, object_key, file_name, content_type, size_bytes)
        VALUES (${item.id}, ${item.sha256}, ${item.key}, ${item.name}, ${item.mime}, ${item.bytes})
        ON CONFLICT (product_id, sha256) DO NOTHING
      `);
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
