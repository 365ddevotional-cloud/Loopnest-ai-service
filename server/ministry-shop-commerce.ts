import { registerShopAudiobooks, assetHash, type ShopOrder } from "./ministry-shop-audio";
import { audioTotal } from "../shared/shop-audiobook";
import { isAndroidReaderRequest } from "./android-reader";
import { createHash } from "node:crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import Stripe from "stripe";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getShopCatalog, getShopProduct, type ShopCatalogProduct } from "./ministry-shop-catalog";
import { registerShopUploads } from "./ministry-shop-upload";
import { db } from "./db";
import { paymentMatchesOrder } from "./music-commerce";
import { musicCountryFromRequest } from "./music-location";
import { musicRegions, readMusicPrices } from "./music-regions";
import { ministryShopPrice, shopBundleId, supportsMinistryShopStripe } from "./ministry-shop-pricing";
import { registerMinistryShopAdmin, type ShopAsset as Asset } from "./ministry-shop-admin";
import { shopAssetsMatchProduct } from "../shared/ministry-shop-asset-readiness";

const appTag = "365-ministry-shop-v1";
const base = "https://365dailydevotional.com";

const checkoutInput = z.object({
  productId: z.string(),
  purchaseKind: z.enum(["ebook","read-listen","audio"]).default("ebook"),
  bookSessionId: z.string().max(180).optional(),
  country: z.string().regex(/^[A-Z]{2}$/),
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  acceptedDownloadPolicy: z.literal(true),
}).strict();
const sessionInput = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9_]+$/) }).strict();

type Order = ShopOrder;
type VerifyToken = (token: string) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;

function sendError(res: Response, error: unknown) {
  const e = error as { status?: number; message?: string };
  const status = e?.status && e.status >= 400 && e.status < 500 ? e.status : 503;
  return res.status(status).json({ message: status < 500 ? e.message : "Shop checkout or downloads are temporarily unavailable." });
}

function issue(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

async function canSell(id: string, assets: Asset[], product?: ShopCatalogProduct) {
  return shopAssetsMatchProduct(product ?? await getShopProduct(id, true), assets, shopBundleId);
}

export function registerMinistryShopCommerce(app: Express, verifyToken: VerifyToken, requireAdmin: RequestHandler, services: {stripe?: Stripe} = {}) {
  registerShopUploads(app, requireAdmin);
  const env = process.env;
  const bucket = env.SHOP_R2_PRIVATE_BUCKET;
  const r2 = env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME && bucket && bucket !== env.R2_BUCKET_NAME &&
    env.SHOP_R2_ACCESS_KEY_ID && env.SHOP_R2_SECRET_ACCESS_KEY
    ? new S3Client({
      region: "auto", endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.SHOP_R2_ACCESS_KEY_ID, secretAccessKey: env.SHOP_R2_SECRET_ACCESS_KEY },
    }) : null;
  const key = env.STRIPE_SECRET_KEY;
  const secret = env.STRIPE_SHOP_WEBHOOK_SECRET;
  const stripe = services.stripe ?? (key ? new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 }) : null);
  const countries = new Set((env.SHOP_STRIPE_COUNTRIES ?? "").split(",").map(value => value.trim()));
  const enabled = env.SHOP_CHECKOUT_ENABLED === "true" && !!secret && !!stripe && !!r2 &&
    (env.NODE_ENV !== "production" || /^(sk|rk)_live_/.test(key ?? ""));
  const prices = () => readMusicPrices(env.MUSIC_REGIONAL_PRICES_JSON);
  registerMinistryShopAdmin(app, requireAdmin, {
    checkoutConfigured: enabled,
    storageConfigured: !!r2,
    stripeConfigured: !!stripe,
    webhookConfigured: !!secret,
    countries: [...countries].filter(supportsMinistryShopStripe),
  }, canSell);

  async function viewer(req: Request) {
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer ")) issue(401, "Sign in to buy or access your downloads.");
    try { return await verifyToken(header.slice(7)); }
    catch { return issue(401, "Please sign in again."); }
  }

  async function verifyStoredAssets(assets: Asset[]) {
    if (!r2 || !bucket) issue(503, "Shop storage is unavailable.");
    await Promise.all(assets.map(async asset => {
      const object = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: asset.object_key }));
      if (object.ContentLength !== Number(asset.size_bytes) ||
          object.Metadata?.sha256 !== asset.object_key.split("/").pop()) throw new Error("Stored file differs from catalog.");
    }));
  }

  async function orderFor(sessionId: string) {
    const result = await db.execute<Order>(sql`SELECT * FROM ministry_shop_orders WHERE session_id = ${sessionId}`);
    return result.rows[0];
  }

  async function revoke(intentId: string) {
    await db.execute(sql`UPDATE ministry_shop_orders SET status='revoked' WHERE payment_intent_id=${intentId}`);
  }

  async function confirm(order: Order) {
    if (!stripe) issue(503, "Stripe unavailable.");
    const session = await stripe.checkout.sessions.retrieve(order.session_id, { expand: ["payment_intent.latest_charge"] });
    const intent = session.payment_intent as Stripe.PaymentIntent | null;
    const charge = intent?.latest_charge as Stripe.Charge | null;
    if (intent?.id && charge && (charge.amount_refunded > 0 || charge.disputed)) await revoke(intent.id);
    const audioMetadataMatches = order.purchase_kind === "ebook" || (
      session.metadata?.purchaseKind === order.purchase_kind && session.metadata?.editionId === order.reader_edition_id &&
      (order.purchase_kind !== "audio" || session.metadata?.bookSessionId === order.book_session_id));
    if (!audioMetadataMatches || !paymentMatchesOrder(session, {
      sessionId: order.session_id, uid: order.firebase_uid, productId: order.product_id,
      amountCents: order.amount, currency: order.currency, status: order.status, paymentIntentId: order.payment_intent_id,
    }, appTag) || !intent || !charge || !Number.isSafeInteger(charge.created) || charge.created <= 0) {
      issue(403, "A completed payment is required for this download.");
    }

    const expiry = new Date((charge.created + 7200) * 1000).toISOString();
    await db.execute(sql`UPDATE ministry_shop_orders SET status='paid', payment_intent_id=${intent.id},
      download_expires_at=COALESCE(download_expires_at,${expiry}::timestamptz)
      WHERE session_id=${order.session_id} AND status IN ('pending','paid')`);
    const latest = await orderFor(order.session_id);
    if (latest?.status !== "paid" || !latest.download_expires_at) issue(403, "Download access is unavailable.");
    return latest;
  }

  const audiobooks = registerShopAudiobooks(app, {viewer,confirm,r2,bucket,requireAdmin});

  app.get("/api/ministry-shop/prices", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const country = typeof req.query.country === "string" ? req.query.country : musicCountryFromRequest(req);
      if (!country || !/^[A-Z]{2}$/.test(country) || !musicRegions[country]) return res.json({ products: {} });
      const local = prices();
      if (!local[country]) return res.json({ products: {} });
      const catalog = await getShopCatalog();
      const byId = new Map(catalog.map(item => [item.id,item]));
      const purchasable = new Set<string>();
      if (enabled && countries.has(country)) {
        const { rows } = await db.execute<Asset & {product_id: string}>(sql`SELECT assets.* FROM ministry_shop_assets assets
          WHERE NOT EXISTS (SELECT 1 FROM ministry_shop_sales_controls control
            WHERE control.product_id = assets.product_id AND control.paused)`);
        const groups = new Map<string, Asset[]>();
        for (const asset of rows) {
          const group = groups.get(asset.product_id) ?? [];
          group.push(asset);
          groups.set(asset.product_id, group);
        }
        for (const [id, files] of groups) if (byId.has(id) && await canSell(id, files, byId.get(id))) purchasable.add(id);
      }
      res.json({ country, products: Object.fromEntries((await Promise.all(catalog.map(async item => {
        const price = ministryShopPrice(item, country, local);
        const edition = item.kind === "Book" && audiobooks.configured() ? await audiobooks.currentEdition(item.id) : undefined;
        const audioReady = !!price && price.currency === "USD" && audiobooks.ready(edition);
        return price ? [[item.id, { ...price, ready: price.stripeSupported && purchasable.has(item.id),
          ...(audioReady ? {audioEditionId:edition!.id,audioAmount:299,readListenAmount:price.amount+299} : {}) }]] : [];
      }))).flat()) });
    } catch (error) { sendError(res, error); }
  });

  app.post("/api/ministry-shop/checkout", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      if (isAndroidReaderRequest(req)) issue(403, "Purchasing is unavailable in this app.");
      const parsed = checkoutInput.safeParse(req.body);
      if (!parsed.success) issue(400, "Review the local price and accept the download policy.");
      if (!enabled || !stripe || !r2 || !bucket) issue(503, "Shop checkout is not open yet.");
      const { productId, country, amount, currency, purchaseKind, bookSessionId } = parsed.data;
      const detected = musicCountryFromRequest(req);
      if (detected && detected !== country) issue(409, "Your network location differs from your displayed country. Refresh before paying.");
      const item = await getShopProduct(productId);
      const price = item && ministryShopPrice(item, country, prices());
      if (!item || !price?.stripeSupported || !countries.has(country)) issue(409, "Stripe checkout is unavailable for this product and currency.");
      if (price.usdFallback && !detected) issue(409, "We couldn't confirm your country for this price. Refresh before paying.");
      const expectedAmount = purchaseKind === "ebook" ? price.amount : audioTotal(price.amount,purchaseKind,price.currency);
      if (expectedAmount !== amount || price.currency !== currency) issue(409, "The local price changed. Refresh before paying.");
      const user = await viewer(req);
      if (!user.email || !user.email_verified) issue(403, "Verify your account email before checking out.");
      const sales = await db.execute<{ paused: boolean }>(sql`SELECT paused FROM ministry_shop_sales_controls
        WHERE product_id=${productId}`);
      if (sales.rows[0]?.paused) issue(409, "New sales for this product are paused.");

      const { rows: assets } = await db.execute<Asset>(sql`SELECT object_key, file_name, content_type, size_bytes
        FROM ministry_shop_assets WHERE product_id=${productId} ORDER BY object_key`);
      if (!await canSell(productId, assets)) issue(409, "The original download for this product is not ready.");
      await verifyStoredAssets(assets);
      const edition = purchaseKind !== "ebook" ? await audiobooks.currentEdition(productId) : undefined;
      if (purchaseKind !== "ebook" && (!audiobooks.ready(edition) || !edition || assetHash({assets}) !== edition.asset_sha256)) issue(409,"This audiobook is not ready for sale.");
      const sourceBook = purchaseKind === "audio" && edition ? await audiobooks.bookOrder(user.uid,productId,edition,bookSessionId) : undefined;
      if (edition) await audiobooks.reserve(edition);
      const { rows: existingOrders } = await db.execute<Pick<Order, "session_id" | "status">>(sql`
        SELECT session_id, status FROM ministry_shop_orders
        WHERE firebase_uid=${user.uid} AND product_id=${productId} AND amount=${amount} AND currency=${currency}
        AND purchase_kind=${purchaseKind}
        AND (reader_edition_id IS NOT DISTINCT FROM ${edition?.id ?? null})
        AND (status='pending' OR (status='paid' AND (purchase_kind != 'ebook' OR download_expires_at > now())))
        ORDER BY created_at DESC LIMIT 5
      `);
      for (const order of existingOrders) {
        if (order.status === "paid") return res.json({ purchaseUrl: "/shop/purchases" });
        const prior = await stripe.checkout.sessions.retrieve(order.session_id);
        if (prior.status === "open" && prior.url && prior.amount_total === amount && prior.currency === currency.toLowerCase()) {
          return res.json({ checkoutUrl: prior.url });
        }
        if (prior.status === "complete") return res.json({ purchaseUrl: "/shop/purchases" });
      }

      const metadata = { app: appTag, productId, uid: user.uid, country, purchaseKind,
        ...(edition ? {editionId:edition.id} : {}), ...(sourceBook ? {bookSessionId:sourceBook.session_id} : {}) };
      const fingerprint = createHash("sha256")
        .update(JSON.stringify([user.uid, productId, country, amount, currency, assets, purchaseKind, edition?.id, sourceBook?.session_id, Math.floor(Date.now() / 1200000)]))
        .digest("hex");
      const session = await stripe.checkout.sessions.create({
        mode: "payment", adaptive_pricing: { enabled: false }, client_reference_id: user.uid,
        customer_email: user.email, metadata, payment_intent_data: { metadata },
        custom_text: { submit: { message: purchaseKind === "audio" ? "Audiobook access is saved to this account. Digitally narrated in English (US male voice)." : `Download within two hours of payment using this same account.${purchaseKind === "read-listen" ? " Audiobook access stays in your account. Digitally narrated in English (US male voice)." : ""}` } },
        line_items: [{ quantity: 1, price_data: { currency: currency.toLowerCase(), unit_amount: amount, product_data: { name: item.title + (purchaseKind === "audio" ? " — Audiobook upgrade" : purchaseKind === "read-listen" ? " — Read + Listen" : "") } } }],
        success_url: `${base}/shop/purchases?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/shop/${productId}`,
      }, { idempotencyKey: `365-shop-${fingerprint}` });
      if (session.status !== "open" || !session.url) issue(409, "Checkout is already complete or expired. Check your shop purchases.");
      await db.execute(sql`INSERT INTO ministry_shop_orders
        (session_id, firebase_uid, product_id, amount, currency, assets, purchase_kind, reader_edition_id, book_session_id)
        VALUES (${session.id}, ${user.uid}, ${productId}, ${amount}, ${currency}, ${JSON.stringify(assets)}::jsonb, ${purchaseKind}, ${edition?.id ?? null}, ${sourceBook?.session_id ?? null})
        ON CONFLICT (session_id) DO NOTHING`);
      res.json({ checkoutUrl: session.url });
    } catch (error) { sendError(res, error); }
  });

  app.get("/api/ministry-shop/purchases", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const user = await viewer(req);
      const { rows } = await db.execute<Order>(sql`SELECT *
        FROM ministry_shop_orders WHERE firebase_uid=${user.uid} AND status IN ('paid','pending')
        ORDER BY created_at DESC LIMIT 100`);
      const byId = new Map((await getShopCatalog(true)).map(item => [item.id, item]));
      res.json(await Promise.all(rows.map(async row => {
        const edition = row.reader_edition_id ? await audiobooks.editionById(row.reader_edition_id) : undefined;
        const current = edition ?? (byId.get(row.product_id)?.kind === "Book" ? await audiobooks.editionForAssets(row.product_id,row.assets) : undefined);
        const readerEditionId = current?.reviewed && assetHash(row) === current.asset_sha256 ? current.id : undefined;
        return {
          sessionId: row.session_id, productId:row.product_id,
          title: byId.get(row.product_id)?.title ?? "Shop purchase", status: row.status,
          downloadExpiresAt: row.download_expires_at, purchaseKind:row.purchase_kind,
          readerEditionId,
        };
      })));
    } catch (error) { sendError(res, error); }
  });

  app.post("/api/ministry-shop/download", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const user = await viewer(req);
      const parsed = sessionInput.safeParse(req.body);
      if (!parsed.success) issue(400, "Invalid purchase reference.");
      const order = await orderFor(parsed.data.sessionId);
      if (!order || order.firebase_uid !== user.uid) issue(404, "Purchase not found.");
      if (order.purchase_kind === "audio") issue(409,"Open this audiobook in your book reader.");
      if (order.download_expires_at && new Date(order.download_expires_at).getTime() <= Date.now()) {
        issue(410, "Your two-hour download window has ended.");
      }
      if (!r2 || !bucket || !await canSell(order.product_id, order.assets)) issue(503, "The original download is unavailable.");
      const paid = await confirm(order);
      await verifyStoredAssets(paid.assets);
      const seconds = Math.min(900, Math.floor((new Date(paid.download_expires_at!).getTime() - Date.now()) / 1000));
      if (seconds < 1) issue(410, "Your two-hour download window has ended.");
      const files = await Promise.all(paid.assets.map(async asset => ({
        name: asset.file_name,
        url: await getSignedUrl(r2, new GetObjectCommand({
          Bucket: bucket, Key: asset.object_key,
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(asset.file_name).replace(/['()*]/g, char => "%" + char.charCodeAt(0).toString(16))}`,
          ResponseContentType: "application/octet-stream",
        }), { expiresIn: seconds }),
      })));
      res.json({ files });
    } catch (error) { sendError(res, error); }
  });

  app.post("/api/ministry-shop/webhook", async (req, res) => {
    if (!stripe || !secret) return res.sendStatus(503);
    let event: Stripe.Event;
    try {
      const signature = req.get("stripe-signature");
      if (!signature || !Buffer.isBuffer(req.rawBody)) return res.sendStatus(400);
      event = stripe.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch { return res.sendStatus(400); }
    try {
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.app === appTag) {
          const order = await orderFor(session.id);
          if (!order) return res.sendStatus(503);
          if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
            await db.execute(sql`UPDATE ministry_shop_orders SET status='expired' WHERE session_id=${order.session_id} AND status='pending'`);
          } else if (session.payment_status === "paid" && order.status !== "revoked" && order.status !== "expired") {
            try { await confirm(order); }
            catch (error) { if ((error as { status?: number }).status !== 403) throw error; }
          }
        }
      } else if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
        const charge = event.data.object as Stripe.Charge | Stripe.Dispute;
        const id = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (id) await revoke(id);
      }
      res.sendStatus(204);
    } catch { res.sendStatus(503); }
  });
}
