import type { Express, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { createHash } from "crypto";
import { getMusicProduct, musicProducts, heavenBundleId } from "../shared/music-products";
import { getDownloadAccess } from "./download-access";

export type MusicOrder = {
  sessionId: string; uid: string; productId: string; amountCents: number;
  status: string; paymentIntentId: string | null; createdAt?: string;
};
export type MusicCommerceServices = {
  verifyToken: (token: string) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;
  getSong: (slug: string) => Promise<any>;
  createOrder: (order: MusicOrder) => Promise<void>;
  getOrder: (id: string) => Promise<MusicOrder | undefined>;
  listOrders: (uid: string) => Promise<MusicOrder[]>;
  updateOrder: (id: string, status: string, paymentIntentId?: string) => Promise<void>;
  revokeByPaymentIntent: (id: string) => Promise<void>;
  getArchive: () => Promise<string | null>;
  setArchive: (path: string) => Promise<void>;
  signDownload: (path: string, title: string, extension: "mp3" | "zip") => Promise<string>;
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
  env?: Record<string, string | undefined>;
  stripe?: Stripe;
};

const archivePattern = /^\/objects\/uploads\/[a-f0-9-]{36}$/;
export function validBundleArchive(path: unknown): path is string {
  return typeof path === "string" && archivePattern.test(path);
}

export function paymentMatchesOrder(session: any, order: MusicOrder): boolean {
  const intent = session.payment_intent;
  const charge = typeof intent === "object" && intent?.latest_charge;
  return order.status !== "revoked" && order.status !== "expired" &&
    session.id === order.sessionId && session.mode === "payment" &&
    session.status === "complete" && session.payment_status === "paid" &&
    session.currency === "usd" && session.amount_total === order.amountCents &&
    session.client_reference_id === order.uid &&
    session.metadata?.app === "365-music-v1" &&
    session.metadata?.productId === order.productId &&
    session.metadata?.uid === order.uid &&
    intent?.status === "succeeded" && charge?.paid === true &&
    charge.amount_refunded === 0 && charge.disputed === false;
}

export function registerMusicCommerceRoutes(app: Express, services: MusicCommerceServices) {
  const env = services.env ?? process.env;
  const key = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_MUSIC_WEBHOOK_SECRET;
  const live = !!key && /^(sk|rk)_live_/.test(key);
  const credentialsReady = !!key && !!webhookSecret &&
    (live || env.NODE_ENV !== "production");
  const storageReady = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].every(n => !!env[n]);
  const stripe = services.stripe ?? (key ? new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 }) : null);
  const uidOf = async (req: Request) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw Object.assign(new Error("Please sign in to buy or access your downloads."), { status: 401 });
    try { return await services.verifyToken(header.slice(7)); }
    catch { throw Object.assign(new Error("Please sign in again."), { status: 401 }); }
  };
  const respondError = (res: Response, err: any) => {
    const status = err?.status ?? 503;
    res.status(status).json({ message: status < 500 ? err.message : "Checkout or download verification is temporarily unavailable. Please try again." });
  };
  const materialFor = async (productId: string) => {
    const product = getMusicProduct(productId);
    if (!product) throw Object.assign(new Error("Unknown music product."), { status: 400 });
    const songs = await Promise.all(product.slugs.map(services.getSong));
    if (songs.some(s => !s?.isActive || !s.audioUrl)) throw Object.assign(new Error("This release is currently unavailable."), { status: 409 });
    return { product, songs };
  };
  const confirm = async (order: MusicOrder) => {
    if (!stripe || !credentialsReady) throw new Error("Stripe unavailable");
    const session = await stripe.checkout.sessions.retrieve(order.sessionId, { expand: ["payment_intent.latest_charge", "line_items"] });
    if (!paymentMatchesOrder(session, order)) {
      const intent = session.payment_intent as Stripe.PaymentIntent | null;
      const charge = typeof intent === "object" ? intent?.latest_charge as Stripe.Charge | null : null;
      if (charge && (charge.amount_refunded > 0 || charge.disputed)) await services.updateOrder(order.sessionId, "revoked");
      throw Object.assign(new Error("A completed, valid payment is required for this download."), { status: 403 });
    }
    await services.updateOrder(order.sessionId, "paid", (session.payment_intent as Stripe.PaymentIntent).id);
    return session;
  };

  app.get("/api/music-commerce/catalog", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const archive = await services.getArchive();
      const products = await Promise.all(musicProducts.map(async product => {
        const songs = await Promise.all(product.slugs.map(services.getSong));
        const filesReady = songs.every(s => s?.isActive && s.audioUrl) &&
          (product.id !== heavenBundleId || validBundleArchive(archive));
        return { ...product, ready: credentialsReady && storageReady && filesReady };
      }));
      res.json({ currency: "USD", mode: live ? "live" : key ? "test" : "unconfigured", products });
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/checkout", async (req, res) => {
    try {
      const claims = await uidOf(req);
      // Reject client prices, quantities, currency and URLs; only a catalog ID is accepted.
      if (!req.body || Object.keys(req.body).some(k => k !== "productId") || typeof req.body.productId !== "string") {
        return res.status(400).json({ message: "Choose a music product." });
      }
      const { product } = await materialFor(req.body.productId);
      if (getDownloadAccess(claims).lifetimeFreeDownloads) {
        const { songs } = await materialFor(product.id);
        const archive = product.id === heavenBundleId ? await services.getArchive() : null;
        if (product.id === heavenBundleId && !validBundleArchive(archive)) throw new Error("Archive unavailable");
        return res.json({ downloadUrl: await services.signDownload(archive ?? songs[0].audioUrl, product.title,
          product.id === heavenBundleId ? "zip" : "mp3") });
      }
      if (!credentialsReady || !storageReady || !stripe) return res.status(503).json({ message: "Paid downloads are not available yet. You can still listen and watch for free." });
      if (product.id === heavenBundleId && !validBundleArchive(await services.getArchive())) return res.status(503).json({ message: "The bundle download is not ready yet." });
      const orders = await services.listOrders(claims.uid);
      if (orders.some(o => o.status === "paid" && (o.productId === product.id ||
        (o.productId === heavenBundleId && product.id !== heavenBundleId)))) {
        return res.json({ purchaseUrl: "/music/purchases" });
      }
      const pending = orders.filter(o => o.productId === product.id && o.status === "pending");
      // Reuse an open checkout to avoid duplicate sessions on mobile double-taps/retries.
      for (const order of pending.slice(0, 3)) {
        const previous = await stripe.checkout.sessions.retrieve(order.sessionId);
        if (previous.status === "open" && previous.url) return res.json({ checkoutUrl: previous.url });
      }
      const base = "https://365dailydevotional.com";
      const idempotencyKey = createHash("sha256").update(`${claims.uid}:${product.id}:${Math.floor(Date.now() / 1200000)}`).digest("hex");
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        client_reference_id: claims.uid,
        ...(claims.email_verified && claims.email ? { customer_email: claims.email } : {}),
        metadata: { app: "365-music-v1", uid: claims.uid, productId: product.id },
        payment_intent_data: { metadata: { app: "365-music-v1", uid: claims.uid, productId: product.id } },
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: product.cents,
          product_data: { name: product.title, description: product.slugs.length === 3 ? "Original, Instrumental, and Remix MP3s in one ZIP. One-time purchase." : "One MP3 track. One-time purchase." } } }],
        success_url: `${base}/music/purchases?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/music/purchases?cancelled=1`,
      }, { idempotencyKey: `365-music-${idempotencyKey}` });
      await services.createOrder({ sessionId: session.id, uid: claims.uid, productId: product.id,
        amountCents: product.cents, status: "pending", paymentIntentId: null });
      res.json({ checkoutUrl: session.url });
    } catch (err) { respondError(res, err); }
  });

  app.get("/api/music-commerce/purchases", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const { uid } = await uidOf(req);
      const orders = await services.listOrders(uid);
      res.json(orders.map(order => ({ sessionId: order.sessionId, productId: order.productId,
        title: getMusicProduct(order.productId)?.title ?? "Music purchase", status: order.status,
        amountCents: order.amountCents, createdAt: order.createdAt })));
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/confirm", async (req, res) => {
    try {
      const { uid } = await uidOf(req);
      const order = typeof req.body?.sessionId === "string" ? await services.getOrder(req.body.sessionId) : null;
      if (!order || order.uid !== uid) return res.status(404).json({ message: "Purchase not found for this account." });
      await confirm(order);
      res.json({ paid: true });
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/download", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const { uid } = await uidOf(req);
      const order = typeof req.body?.sessionId === "string" ? await services.getOrder(req.body.sessionId) : null;
      if (!order || order.uid !== uid) return res.status(404).json({ message: "Purchase not found for this account." });
      await confirm(order); // Re-check refunds/disputes before issuing every temporary download URL.
      const { product, songs } = await materialFor(order.productId);
      if (product.id === heavenBundleId) {
        const archive = await services.getArchive();
        if (!validBundleArchive(archive)) throw new Error("Archive unavailable");
        return res.json({ downloadUrl: await services.signDownload(archive, product.title, "zip") });
      }
      res.json({ downloadUrl: await services.signDownload(songs[0].audioUrl, songs[0].title, "mp3") });
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/webhook", async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).json({ message: "Webhook is not configured." });
    let event: Stripe.Event;
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!Buffer.isBuffer(rawBody) || typeof req.headers["stripe-signature"] !== "string") throw new Error("Missing signature");
      event = stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], webhookSecret);
    } catch { return res.status(400).json({ message: "Invalid webhook signature." }); }
    try {
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await services.getOrder(session.id);
        if (session.metadata?.app === "365-music-v1") {
          if (!order) return res.status(503).json({ message: "Order is not yet recorded; retry delivery." });
          if (order.status !== "revoked" && session.payment_status === "paid") await confirm(order);
        }
      } else if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await services.getOrder(session.id);
        if (order?.status === "pending") await services.updateOrder(session.id, "expired");
      } else if (["charge.refunded", "charge.dispute.created"].includes(event.type)) {
        const object = event.data.object as Stripe.Charge | Stripe.Dispute;
        const intent = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
        if (intent) await services.revokeByPaymentIntent(intent);
      }
      res.json({ received: true });
    } catch (err) { respondError(res, err); }
  });

  app.get("/api/admin/music-commerce", services.requireAdmin, async (_req, res) => {
    try { res.json({ secretKeySet: !!key, liveKey: live, webhookSecretSet: !!webhookSecret,
      storageReady, archivePath: await services.getArchive(), webhookUrl: "https://365dailydevotional.com/api/music-commerce/webhook" }); }
    catch (err) { respondError(res, err); }
  });
  app.put("/api/admin/music-commerce/archive", services.requireAdmin, async (req, res) => {
    if (!validBundleArchive(req.body?.objectPath)) return res.status(400).json({ message: "Upload a ZIP archive first." });
    try { await services.setArchive(req.body.objectPath); res.json({ saved: true }); }
    catch (err) { respondError(res, err); }
  });
}
