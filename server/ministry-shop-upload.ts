import multilingual from "../shared/multilingual-releases.json";
import { verifiedReleaseById } from "../shared/christmas-2026-releases";
import type { Express, RequestHandler } from "express";
import { Transform } from "node:stream";
import { randomUUID, createHash } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { shopBundleId } from "./ministry-shop-pricing";
import { getShopCatalog, getShopProduct, type ShopCatalogProduct } from "./ministry-shop-catalog";

function downloadType(item: {id: string; kind: string; packageFormat?: string}) {
  if (item.kind === "Music" && item.packageFormat === "zip" && verifiedReleaseById(item.id)) return "application/zip";
  return item.kind === "Book" ? "application/pdf" : "audio/mpeg";
}
const productInput = z.object({
  id: z.string().regex(/^[a-zA-Z0-9]{3,80}$/).optional(),
  title: z.string().trim().min(3).max(180),
  kind: z.enum(["Book", "Music"]),
  description: z.string().trim().min(20).max(12000),
  author: z.string().trim().min(2).max(160),
  priceCents: z.number().int().min(50).max(99999),
  lyrics: z.string().max(30000).default(""),
  previewTitle: z.string().trim().max(180).optional(),
  previewText: z.string().trim().max(30000).optional(),
  previewEnding: z.string().trim().max(500).optional(),
}).strict();
const uploadInput = z.object({
  slot: z.enum(["download", "cover"]), name: z.string().min(1).max(180),
  bytes: z.number().int().positive().max(250 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.enum(["application/pdf", "application/zip", "audio/mpeg", "image/jpeg", "image/png", "image/webp"]),
}).strict();
type Upload = {
  created_at: string; id: string; product_id: string; slot: string; object_key: string;
  sha256: string; file_name: string; content_type: string; size_bytes: string; completed: boolean;
};
function storage() {
  const env = process.env;
  const accessKeyId = env.SHOP_R2_ACCESS_KEY_ID ?? env.SHOP_IMPORT_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.SHOP_R2_SECRET_ACCESS_KEY ?? env.SHOP_IMPORT_R2_SECRET_ACCESS_KEY;
  if (!env.SHOP_R2_PRIVATE_BUCKET || env.SHOP_R2_PRIVATE_BUCKET === env.R2_BUCKET_NAME ||
      !env.R2_ACCOUNT_ID || !accessKeyId || !secretAccessKey) {
    throw new Error("Private shop storage is not configured.");
  }
  return { bucket: env.SHOP_R2_PRIVATE_BUCKET, client: new S3Client({
    region: "auto", endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
  }) };
}
function route(handler: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(error => {
    console.error("[Shop product upload]", {
      operation: req.method + " " + req.route?.path,
      error: error?.name, code: error?.code, status: error?.$metadata?.httpStatusCode,
      message: error?.name === "Error" ? error.message : undefined,
    });
    res.status(error instanceof z.ZodError ? 400 : 503).json({
      message: error instanceof z.ZodError ? "Review the product fields and file type."
        : [401,403].includes(error?.$metadata?.httpStatusCode)
          ? "The storage account rejected this upload. Your draft is saved. The shop storage connection needs permission to write customer files."
          : "The shop operation could not finish. Your draft is retained. Try again.",
    });
  });
}
export function registerShopUploads(app: Express, requireAdmin: RequestHandler) {
  app.get("/api/ministry-shop/catalog", route(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json((await getShopCatalog()).map(({ coverKey, ...item }) => item));
  }));
  app.get("/api/admin/ministry-shop/products", requireAdmin, route(async (_req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.json(await getShopCatalog(true));
  }));
  app.put("/api/admin/ministry-shop/products", requireAdmin, route(async (req, res) => {
    const input = productInput.parse(req.body);
    const id = input.id ?? randomUUID().replaceAll("-", "");
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(365,24)`);
      const all = await getShopCatalog(true);
      const previous = all.find(item => item.id === id);
      const normalize = (title: string) => title.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}]+/gu, " ").trim();
      if (all.some(item => item.id !== id && normalize(item.title) === normalize(input.title))) {
        res.status(409).json({ message: "A product with this title already exists. Select it to update its files." }); return;
      }
      if (previous && (previous.id === shopBundleId || previous.kind !== input.kind || (previous.requiredFileCount ?? 1) !== 1 ||
          (previous.packageFormat === "zip" && !verifiedReleaseById(id)) || previous.replacedBy)) {
        res.status(409).json({ message: "This uploader supports individual PDF books and MP3 recordings. Choose a single-file product." });
        return;
      }
      const payload = {
        ...previous, ...input, id, sourcePrice: `$${(input.priceCents / 100).toFixed(2)}`,
        requiredFileCount: 1, useBasePrice: verifiedReleaseById(id) ? false : true,
      };
      await tx.execute(sql`INSERT INTO ministry_shop_managed_products (id,payload,published)
        VALUES (${id},${JSON.stringify(payload)}::jsonb,${previous?.published === true})
        ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`);
      res.json({ id });
    });
  }));
  app.post("/api/admin/ministry-shop/products/:id/upload", requireAdmin, route(async (req, res) => {
    const product = await getShopProduct(req.params.id, true);
    if (!product) { res.status(404).json({ message: "Save the product first." }); return; }
    const input = uploadInput.parse(req.body);
    const expected = downloadType(product);
    if (input.slot === "download" && expected === "application/zip" && input.sha256 !== verifiedReleaseById(product.id)?.zipHash) {
      res.status(400).json({ message: "Choose the verified release ZIP for this recording." }); return;
    }
    if ((input.slot === "download" && input.contentType !== expected) ||
        (input.slot === "cover" && (!input.contentType.startsWith("image/") || input.bytes > 10 * 1024 * 1024))) {
      res.status(400).json({ message: "Choose a PDF for a book, MP3 for music, or a JPEG, PNG or WebP cover up to 10 MB." }); return;
    }
    const id = randomUUID();
    const key = input.slot === "download" ? `ministry-shop/${product.id}/${input.sha256}`
      : `ministry-shop-art/${product.id}/${input.sha256}`;
    const { client, bucket } = storage();
    try {
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
        Bucket: bucket, Key: key, ContentType: input.contentType,
        Metadata: { sha256: input.sha256 }, IfNoneMatch: "*",
      }), { expiresIn: 900 });
      await db.execute(sql`INSERT INTO ministry_shop_uploads
        (id,product_id,slot,object_key,sha256,file_name,content_type,size_bytes)
        VALUES (${id},${product.id},${input.slot},${key},${input.sha256},${input.name},${input.contentType},${input.bytes})
        RETURNING id`);
      const { rows } = await db.execute<Upload>(sql`SELECT * FROM ministry_shop_uploads WHERE id=${id}`);
      res.json({ uploadUrl, uploadId: rows[0].id, headers: { "Content-Type": input.contentType, "x-amz-meta-sha256": input.sha256, "If-None-Match": "*" } });
    } finally { client.destroy(); }
  }));
  app.put("/api/admin/ministry-shop/products/:id/uploads/:uploadId/transfer", requireAdmin, route(async (req, res) => {
    const id = z.string().uuid().parse(req.params.uploadId);
    const { rows } = await db.execute<Upload>(sql`SELECT * FROM ministry_shop_uploads
      WHERE id=${id} AND product_id=${req.params.id}`);
    const upload = rows[0];
    if (!upload || upload.completed || Date.now() > new Date(upload.created_at).getTime() + 900000) {
      res.status(409).json({ message: "Request a fresh upload from the saved product." }); return;
    }
    if (Number(req.get("Content-Length")) !== Number(upload.size_bytes) || req.get("Content-Type") !== upload.content_type) {
      res.status(400).json({ message: "The upload size or type changed." }); return;
    }
    const { client, bucket } = storage();
    let received = 0;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        callback(received > Number(upload.size_bytes) ? new Error("File too large.") : null, chunk);
      },
    });
    req.once("aborted", () => limit.destroy(new Error("Upload interrupted.")));
    req.pipe(limit);
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: upload.object_key, Body: limit, ContentLength: Number(upload.size_bytes),
        ContentType: upload.content_type, Metadata: { sha256: upload.sha256 }, IfNoneMatch: "*",
      }));
      res.json({ uploaded: true });
    } catch (error) {
      if ((error as {$metadata?: {httpStatusCode?: number}}).$metadata?.httpStatusCode === 412) {
        res.sendStatus(412); return;
      }
      throw error;
    } finally { client.destroy(); }
  }));
  app.post("/api/admin/ministry-shop/products/:id/uploads/:uploadId/complete", requireAdmin, route(async (req, res) => {
    const parsed = z.string().uuid().parse(req.params.uploadId);
    const { rows } = await db.execute<Upload>(sql`SELECT * FROM ministry_shop_uploads
      WHERE id=${parsed} AND product_id=${req.params.id}`);
    const upload = rows[0];
    if (!upload) { res.status(404).json({ message: "Upload not found." }); return; }
    const { client, bucket } = storage();
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: upload.object_key }));
      if (head.ContentLength !== Number(upload.size_bytes) || head.Metadata?.sha256 !== upload.sha256 ||
          head.ContentType !== upload.content_type) throw new Error("Uploaded file metadata differs.");
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: upload.object_key }));
      if (!object.Body) throw new Error("File missing.");
      const hash = createHash("sha256");
      let bytes = 0;
      let signature = Buffer.alloc(0);
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
        bytes += chunk.length;
        if (bytes > Number(upload.size_bytes)) throw new Error("File too large.");
        hash.update(chunk);
        if (signature.length < 16) signature = Buffer.concat([signature, Buffer.from(chunk)]).subarray(0,16);
      }
      const validSignature = upload.content_type === "application/pdf" ? signature.subarray(0,5).toString() === "%PDF-"
        : upload.content_type === "application/zip" ? signature.readUInt32LE(0) === 0x04034b50
        : upload.content_type === "audio/mpeg" ? signature.subarray(0,3).toString() === "ID3" || (signature[0] === 255 && (signature[1] & 224) === 224)
        : upload.content_type === "image/jpeg" ? signature[0] === 255 && signature[1] === 216
        : upload.content_type === "image/png" ? signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : signature.subarray(0,4).toString() === "RIFF" && signature.subarray(8,12).toString() === "WEBP";
      if (!validSignature || bytes !== Number(upload.size_bytes) || hash.digest("hex") !== upload.sha256) throw new Error("File verification failed.");
      const release = multilingual.find(item => item.id === upload.product_id);
      if (release && upload.slot === "download") {
        if (release.zipHash !== upload.sha256) throw new Error("Release package mismatch");
        for (const part of [release.master, release.preview]) {
          const source = await client.send(new GetObjectCommand({ Bucket: bucket, Key: upload.object_key,
            Range: `bytes=${part.offset}-${part.offset + part.size - 1}` }));
          const body = Buffer.from(await source.Body!.transformToByteArray());
          if (body.length !== part.size || createHash("sha256").update(body).digest("hex") !== part.sha256)
            throw new Error("Audio did not match the release");
          await client.send(new PutObjectCommand({ Bucket: bucket, Key: `music-releases/${part.sha256}.mp3`,
            Body: body, ContentType: "audio/mpeg", Metadata: {sha256: part.sha256} }));
        }
      }
      await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${upload.product_id}))`);
        const state = await tx.execute<{ completed: boolean }>(sql`SELECT completed FROM ministry_shop_uploads WHERE id=${upload.id} FOR UPDATE`);
        if (state.rows[0]?.completed) return;
        const { rows: products } = await tx.execute<{ payload: ShopCatalogProduct }>(sql`
          SELECT payload FROM ministry_shop_managed_products WHERE id=${upload.product_id} FOR UPDATE`);
        if (!products.length) throw new Error("Save the product before attaching files.");
        if (upload.slot === "download") {
          const expected = downloadType(products[0].payload);
          if (upload.content_type !== expected) throw new Error("Product type changed.");
          await tx.execute(sql`DELETE FROM ministry_shop_assets WHERE product_id=${upload.product_id}`);
          await tx.execute(sql`INSERT INTO ministry_shop_assets
            (product_id,sha256,object_key,file_name,content_type,size_bytes)
            VALUES (${upload.product_id},${upload.sha256},${upload.object_key},${upload.file_name},${upload.content_type},${upload.size_bytes})`);
          // Past orders keep immutable asset snapshots. Retain all stored old objects.
          await tx.execute(sql`INSERT INTO ministry_shop_sales_controls (product_id,paused) VALUES (${upload.product_id},true)
            ON CONFLICT (product_id) DO UPDATE SET paused=true`);
        } else {
          await tx.execute(sql`UPDATE ministry_shop_managed_products
            SET payload=jsonb_set(payload,'{coverKey}',to_jsonb(${upload.object_key}::text)),updated_at=now()
            WHERE id=${upload.product_id}`);
        }
        await tx.execute(sql`UPDATE ministry_shop_uploads SET completed=true WHERE id=${upload.id}`);
      });
      res.json({ verified: true });
    } finally { client.destroy(); }
  }));
  app.post("/api/admin/ministry-shop/products/:id/publish", requireAdmin, route(async (req, res) => {
    z.object({ rightsConfirmed: z.literal(true), contentReviewed: z.literal(true) }).strict().parse(req.body);
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${req.params.id}))`);
      const { rows } = await tx.execute<{ payload: ShopCatalogProduct }>(sql`SELECT payload
        FROM ministry_shop_managed_products WHERE id=${req.params.id} FOR UPDATE`);
      const item = rows[0]?.payload;
      const assets = await tx.execute<{ content_type: string }>(sql`SELECT content_type FROM ministry_shop_assets WHERE product_id=${req.params.id}`);
      if (!item?.coverKey || assets.rows.length !== 1 ||
          assets.rows[0].content_type !== downloadType(item)) {
        res.status(409).json({ message: "Upload and verify a cover and a download before publishing." }); return;
      }
      const release = multilingual.find(recording => recording.id === req.params.id);
      if (release) {
        const audioPath = `/objects/uploads/${release.uuid}`;
        const titleMatch = await tx.execute(sql`SELECT id FROM songs WHERE lower(title)=lower(${release.title}) AND slug<>${release.slug} LIMIT 1`);
        if (titleMatch.rows.length) throw new Error("Another recording already uses this title");
        await tx.execute(sql`INSERT INTO songs (title,slug,release_year,scripture_reference,language,lyrics,
          short_description,label_name,producer,composer,lyricist,sampler,is_active,audio_url,cover_image_url,download_status,song_type)
          VALUES (${release.title},${release.slug},2025,${release.scripture},${release.language},${release.lyrics},
          ${release.description},'SpiritTone Records','Moses Afolabi','Moses Afolabi','365 Daily Devotional','Avia Afolabi',
          true,${audioPath},${"/api/ministry-shop/art/"+release.id},'disabled','Praise & worship') ON CONFLICT (slug) DO NOTHING`);
        const song = await tx.execute<{ id:number }>(sql`SELECT id FROM songs WHERE slug=${release.slug} AND audio_url=${audioPath} AND is_active`);
        if (song.rows.length !== 1) throw new Error("Recording conflict");
        await tx.execute(sql`UPDATE ministry_shop_managed_products SET payload=jsonb_set(payload,'{spiritToneSongId}',to_jsonb(${song.rows[0].id}::integer)) WHERE id=${release.id}`);
      }
      await tx.execute(sql`UPDATE ministry_shop_managed_products SET published=true,updated_at=now() WHERE id=${req.params.id}`);
      await tx.execute(sql`INSERT INTO ministry_shop_sales_controls (product_id,paused) VALUES (${req.params.id},false)
        ON CONFLICT (product_id) DO UPDATE SET paused=false`);
      res.json({ published: true, url: `/shop/${req.params.id}` });
    });
  }));
  app.get("/api/ministry-shop/preview/:id", route(async (req, res) => {
    const release = multilingual.find(item => item.id === req.params.id);
    if (!release || !await getShopProduct(release.id)) { res.sendStatus(404); return; }
    const {client,bucket}=storage();
    try {
      const url=await getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:`music-releases/${release.preview.sha256}.mp3`}),{expiresIn:900});
      res.setHeader("Cache-Control","private, no-store");
      res.redirect(302,url);
    } finally {client.destroy();}
  }));
  app.get("/api/ministry-shop/art/:id", route(async (req, res) => {
    const item = await getShopProduct(req.params.id);
    if (!item?.coverKey) { res.sendStatus(404); return; }
    const { client, bucket } = storage();
    try {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.coverKey }));
      res.set("Content-Type", object.ContentType ?? "application/octet-stream");
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Cache-Control", "public, max-age=60");
      res.send(Buffer.from(await object.Body!.transformToByteArray()));
    } finally { client.destroy(); }
  }));
}

