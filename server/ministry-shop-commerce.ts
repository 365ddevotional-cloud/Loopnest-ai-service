import { isAndroidReaderRequest } from "./android-reader";
import { createHash } from "node:crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import Stripe from "stripe";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { z } from "zod";
import catalog from "../client/src/data/ministry-shop-catalog.json";
import { db } from "./db";
import { paymentMatchesOrder } from "./music-commerce";
import { musicCountryFromRequest } from "./music-location";
import { musicRegions, readMusicPrices } from "./music-regions";
import { ministryShopPrice, shopBundleId, supportsMinistryShopStripe } from "./ministry-shop-pricing";
import { registerMinistryShopAdmin, type ShopAsset as Asset } from "./ministry-shop-admin";

const appTag = "365-ministry-shop-v1";
const base = "https://365dailydevotional.com";
const byId = new Map(catalog.map(item => [item.id, item]));
const checkoutInput = z.object({
  productId: z.string(),
  country: z.string().regex(/^[A-Z]{2}$/),
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  acceptedDownloadPolicy: z.literal(true),
}).strict();
const sessionInput = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9_]+$/) }).strict();

type Order = {
  session_id: string; firebase_uid: string; product_id: string; amount: number; currency: string;
  status: string; payment_intent_id: string | null; assets: Asset[]; download_expires_at: Date | null;
};
type VerifyToken = (token: string) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;

function sendError(res: Response, error: unknown) {
  const e = error as { status?: number; message?: string };
  const status = e?.status && e.status >= 400 && e.status < 500 ? e.status : 503;
  return res.status(status).json({ message: status < 500 ? e.message : "Shop checkout or downloads are temporarily unavailable." });
}

function issue(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

function canSell(id: string, assets: Asset[]) {
  const item = byId.get(id);
  if (!item || item.kind === "Membership" || !assets.length) return false;
  if (item.requiredFileCount && assets.length !== item.requiredFileCount) return false;
  // New SpiritTone releases opt into a complete ZIP package. Legacy MP3
  // purchases retain their original format and entitlements unchanged.
  const packagedRelease = item.kind === "Music" && "packageFormat" in item && item.packageFormat === "zip";
  const type = item.kind === "Book" ? "application/pdf" : id === shopBundleId || packagedRelease ? "application/zip" : "audio/mpeg";
  if (packagedRelease && assets.length !== 1) return false;
  return assets.every(asset => asset.content_type === type &&
    new RegExp(`^ministry-shop/${id}/[a-f0-9]{64}import { isAndroidReaderRequest } from "./android-reader";
import { createHash } from "node:crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import Stripe from "stripe";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { z } from "zod";
import catalog from "../client/src/data/ministry-shop-catalog.json";
import { db } from "./db";
import { paymentMatchesOrder } from "./music-commerce";
import { musicCountryFromRequest } from "./music-location";
import { musicRegions, readMusicPrices } from "./music-regions";
import { ministryShopPrice, shopBundleId, supportsMinistryShopStripe } from "./ministry-shop-pricing";
import { registerMinistryShopAdmin, type ShopAsset as Asset } from "./ministry-shop-admin";

const appTag = "365-ministry-shop-v1";
const base = "https://365dailydevotional.com";
const byId = new Map(catalog.map(item => [item.id, item]));
const checkoutInput = z.object({
  productId: z.string(),
  country: z.string().regex(/^[A-Z]{2}$/),
  amount: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  acceptedDownloadPolicy: z.literal(true),
}).strict();
const sessionInput = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9_]+$/) }).strict();

type Order = {
  session_id: string; firebase_uid: string; product_id: string; amount: number; currency: string;
  status: string; payment_intent_id: string | null; assets: Asset[]; download_expires_at: Date | null;
};
type VerifyToken = (token: string) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;

function sendError(res: Response, error: unknown) {
  const e = error as { status?: number; message?: string };
  const status = e?.status && e.status >= 400 && e.status < 500 ? e.status : 503;
  return res.status(status).json({ message: status < 500 ? e.message : "Shop checkout or downloads are temporarily unavailable." });
}

function issue(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

function canSell(id: string, assets: Asset[]) {
  const item = byId.get(id);
  if (!item || item.kind === "Membership" || !assets.length) return false;
  if (item.requiredFileCount && assets.length !== item.requiredFileCount) return false;
).test(asset.object_key));
}

export function registerMinistryShopCommerce(app: Express, verifyToken: VerifyToken, requireAdmin: RequestHandler) {
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
  const stripe = key ? new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 }) : null;
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
    if (!paymentMatchesOrder(session, {
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

  app.get("/api/ministry-shop/prices", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const country = typeof req.query.country === "string" ? req.query.country : musicCountryFromRequest(req);
      if (!country || !/^[A-Z]{2}$/.test(country) || !musicRegions[country]) return res.json({ products: {} });
      const local = prices();
      if (!local[country]) return res.json({ products: {} });
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
        for (const [id, files] of groups) if (canSell(id, files)) purchasable.add(id);
      }
      res.json({ country, products: Object.fromEntries(catalog.flatMap(item => {
        const price = ministryShopPrice(item, country, local);
        return price ? [[item.id, { ...price, ready: price.stripeSupported && purchasable.has(item.id) }]] : [];
      })) });
    } catch (error) { sendError(res, error); }
  });

  app.post("/api/ministry-shop/checkout", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      if (isAndroidReaderRequest(req)) issue(403, "Purchasing is unavailable in this app.");
      const parsed = checkoutInput.safeParse(req.body);
      if (!parsed.success) issue(400, "Review the local price and accept the download policy.");
      if (!enabled || !stripe || !r2 || !bucket) issue(503, "Shop checkout is not open yet.");
      const { productId, country, amount, currency } = parsed.data;
      const detected = musicCountryFromRequest(req);
      if (detected && detected !== country) issue(409, "Your network location differs from your displayed country. Refresh before paying.");
      const item = byId.get(productId);
      const price = item && ministryShopPrice(item, country, prices());
      if (!item || !price?.stripeSupported || !countries.has(country)) issue(409, "Stripe checkout is unavailable for this product and currency.");
      if (price.usdFallback && !detected) issue(409, "We couldn't confirm your country for this price. Refresh before paying.");
      if (price.amount !== amount || price.currency !== currency) issue(409, "The local price changed. Refresh before paying.");
      const user = await viewer(req);
      if (!user.email || !user.email_verified) issue(403, "Verify your account email before checking out.");
      const sales = await db.execute<{ paused: boolean }>(sql`SELECT paused FROM ministry_shop_sales_controls
        WHERE product_id=${productId}`);
      if (sales.rows[0]?.paused) issue(409, "New sales for this product are paused.");

      const { rows: assets } = await db.execute<Asset>(sql`SELECT object_key, file_name, content_type, size_bytes
        FROM ministry_shop_assets WHERE product_id=${productId} ORDER BY object_key`);
      if (!canSell(productId, assets)) issue(409, "The original download for this product is not ready.");
      await verifyStoredAssets(assets);
      const { rows: existingOrders } = await db.execute<Pick<Order, "session_id" | "status">>(sql`
        SELECT session_id, status FROM ministry_shop_orders
        WHERE firebase_uid=${user.uid} AND product_id=${productId} AND amount=${amount} AND currency=${currency}
        AND (status='pending' OR (status='paid' AND download_expires_at > now()))
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

      const metadata = { app: appTag, productId, uid: user.uid, country };
      const fingerprint = createHash("sha256")
        .update(JSON.stringify([user.uid, productId, country, amount, currency, assets, Math.floor(Date.now() / 1200000)]))
        .digest("hex");
      const session = await stripe.checkout.sessions.create({
        mode: "payment", adaptive_pricing: { enabled: false }, client_reference_id: user.uid,
        customer_email: user.email, metadata, payment_intent_data: { metadata },
        custom_text: { submit: { message: "Download within two hours of payment using this same account." } },
        line_items: [{ quantity: 1, price_data: { currency: currency.toLowerCase(), unit_amount: amount, product_data: { name: item.title } } }],
        success_url: `${base}/shop/purchases?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/shop/${productId}`,
      }, { idempotencyKey: `365-shop-${fingerprint}` });
      if (session.status !== "open" || !session.url) issue(409, "Checkout is already complete or expired. Check your shop purchases.");
      await db.execute(sql`INSERT INTO ministry_shop_orders
        (session_id, firebase_uid, product_id, amount, currency, assets)
        VALUES (${session.id}, ${user.uid}, ${productId}, ${amount}, ${currency}, ${JSON.stringify(assets)}::jsonb)
        ON CONFLICT (session_id) DO NOTHING`);
      res.json({ checkoutUrl: session.url });
    } catch (error) { sendError(res, error); }
  });

  app.get("/api/ministry-shop/purchases", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const user = await viewer(req);
      const { rows } = await db.execute<Order>(sql`SELECT session_id, product_id, status, download_expires_at
        FROM ministry_shop_orders WHERE firebase_uid=${user.uid} AND status IN ('paid','pending')
        ORDER BY created_at DESC LIMIT 100`);
      res.json(rows.map(row => ({
        sessionId: row.session_id,
        title: byId.get(row.product_id)?.title ?? "Shop purchase",
        status: row.status,
        downloadExpiresAt: row.download_expires_at,
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
      if (order.download_expires_at && new Date(order.download_expires_at).getTime() <= Date.now()) {
        issue(410, "Your two-hour download window has ended.");
      }
      if (!r2 || !bucket || !canSell(order.product_id, order.assets)) issue(503, "The original download is unavailable.");
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
