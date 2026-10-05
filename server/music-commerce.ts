import type { Express, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { createHash } from "crypto";
import { getMusicProduct, musicProducts, heavenBundleId, fiveSongCollectionPriceCents } from "../shared/music-products";
import { getDownloadAccess } from "./download-access";

export type MusicOrder = {
  sessionId: string; uid: string; productId: string; amountCents: number;
  status: string; paymentIntentId: string | null; createdAt?: string; downloadWindowHours?: number | null; downloadExpiresAt?: string | null;
};
export type MusicCommerceServices = {
  verifyToken: (token: string) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;
  getSong: (slug: string) => Promise<any>;
  createOrder: (order: MusicOrder) => Promise<void>;
  getOrder: (id: string) => Promise<MusicOrder | undefined>;
  listOrders: (uid: string) => Promise<MusicOrder[]>;
  updateOrder: (id: string, status: string, paymentIntentId?: string, downloadExpiresAt?: string) => Promise<void>;
  revokeByPaymentIntent: (id: string) => Promise<void>;
  getArchive: () => Promise<string | null>;
  setArchive: (path: string) => Promise<void>;
  signDownload: (path: string, title: string, extension: "mp3" | "mp4" | "zip", expiresInSeconds?: number) => Promise<string>;
  recordDownloadLinks?: (req: Request, songs: any[], kind: "audio_download" | "video_download") => Promise<void>;
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
  env?: Record<string, string | undefined>;
  stripe?: Stripe;
  now?: () => number;
};

const archivePattern = /^\/objects\/uploads\/[a-f0-9-]{36}$/;
export function validBundleArchive(path: unknown): path is string {
  return typeof path === "string" && archivePattern.test(path);
}

// Video URLs may be stored as an object path or as the public R2 URL. Only
// known uploads in our own bucket can become paid download products.
function videoDownloadPath(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const key = url.replace(/^https?:\/\/[^/]+\/?/, "").replace(/^\/?objects\//, "")
    .replace(/^\/?\.private\//, "").replace(/^\/+/, "");
  const path = `/objects/${key}`;
  return validBundleArchive(path) ? path : null;
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
  const now = services.now ?? Date.now;
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
    const video = product.id.startsWith("video:");
    if (songs.some(s => !s?.isActive || (video
      ? s.videoDownloadStatus === "disabled" || !videoDownloadPath(s.videoUrl)
      : !validBundleArchive(s.audioUrl)))) throw Object.assign(new Error("This release is currently unavailable for paid download."), { status: 409 });
    // Generic single-track products take the public song title from the
    // database, never from the browser or a slug-derived placeholder.
    if (product.slugs.length === 1 && !musicProducts.some(p => p.id === product.id)) {
      return { product: { ...product, title: video ? `${songs[0].title} — Video (MP4)` : songs[0].title }, songs };
    }
    return { product, songs };
  };
  const downloadExpired = (order: MusicOrder) => !!order.downloadExpiresAt && new Date(order.downloadExpiresAt).getTime() <= now();
  const confirm = async (order: MusicOrder) => {
    if (!stripe || !credentialsReady) throw new Error("Stripe unavailable");
    const session = await stripe.checkout.sessions.retrieve(order.sessionId, { expand: ["payment_intent.latest_charge", "line_items"] });
    if (!paymentMatchesOrder(session, order)) {
      const intent = session.payment_intent as Stripe.PaymentIntent | null;
      const charge = typeof intent === "object" ? intent?.latest_charge as Stripe.Charge | null : null;
      if (charge && (charge.amount_refunded > 0 || charge.disputed)) await services.updateOrder(order.sessionId, "revoked");
      throw Object.assign(new Error("A completed, valid payment is required for this download."), { status: 403 });
    }
    // Use the successful charge time, not a browser timer or confirmation retry.
    // Legacy purchases have no window because they were sold without this policy.
    const intent = session.payment_intent as Stripe.PaymentIntent;
    let expiresAt = order.downloadExpiresAt ?? undefined;
    if (order.downloadWindowHours === 2 && !expiresAt) {
      const charge = intent.latest_charge as Stripe.Charge;
      if (!Number.isFinite(charge.created) || charge.created <= 0) throw new Error("Payment time unavailable");
      expiresAt = new Date(charge.created * 1000 + 2 * 60 * 60 * 1000).toISOString();
    }
    await services.updateOrder(order.sessionId, "paid", intent.id, expiresAt);
    // Read the stored deadline: concurrent confirmations must never extend it.
    const recorded = await services.getOrder(order.sessionId);
    if (!recorded || recorded.status !== "paid") throw Object.assign(new Error("Download access is not available for this purchase."), { status: 403 });
    return recorded;
  };
  const requireDownloadWindow = (order: MusicOrder) => {
    if (downloadExpired(order)) throw Object.assign(new Error("Your two-hour download window has ended."), { status: 410 });
    if (order.downloadWindowHours === 2 && !order.downloadExpiresAt) throw new Error("Download deadline unavailable");
    return order.downloadExpiresAt ? Math.min(900, Math.floor((new Date(order.downloadExpiresAt).getTime() - now()) / 1000)) : 900;
  };
  const signedDownload = (order: MusicOrder, path: string, title: string, extension: "mp3" | "mp4" | "zip") => {
    const seconds = requireDownloadWindow(order);
    if (seconds < 1) throw Object.assign(new Error("Your two-hour download window has ended."), { status: 410 });
    return services.signDownload(path, title, extension, seconds);
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
      res.json({ fiveSongOffer: { cents: fiveSongCollectionPriceCents, ready: credentialsReady && storageReady }, singleSongOffer: { cents: 89, ready: credentialsReady && storageReady }, currency: "USD", mode: live ? "live" : key ? "test" : "unconfigured", products });
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/checkout", async (req, res) => {
    try {
      const claims = await uidOf(req);
      // Reject client prices, quantities, currency and URLs; only a catalog ID is accepted.
      if (!req.body || Object.keys(req.body).some(k => !["productId", "email", "downloadPolicyAccepted"].includes(k)) || typeof req.body.productId !== "string") {
        return res.status(400).json({ message: "Choose a music product." });
      }
      if (!claims.email || !claims.email_verified) return res.status(403).json({ message: "Please verify your account email before buying music." });
      if (typeof req.body.email !== "string" || req.body.email.trim().toLowerCase() !== claims.email.toLowerCase()) {
        return res.status(400).json({ message: "Confirm the email of your signed-in account before checkout." });
      }
      if (!getDownloadAccess(claims).lifetimeFreeDownloads && req.body.downloadPolicyAccepted !== true) {
        return res.status(400).json({ message: "Please confirm the two-hour download policy before paying." });
      }
      const { product } = await materialFor(req.body.productId);
      if (getDownloadAccess(claims).lifetimeFreeDownloads) {
        const { songs } = await materialFor(product.id);
        if (product.id.startsWith("five:")) {
          const downloads = await Promise.all(songs.map(async s => ({ title: s.title, url: await services.signDownload(s.audioUrl, s.title, "mp3") })));
          await services.recordDownloadLinks?.(req, songs, "audio_download");
          return res.json({ downloads });
        }
        const archive = product.id === heavenBundleId ? await services.getArchive() : null;
        if (product.id === heavenBundleId && !validBundleArchive(archive)) throw new Error("Archive unavailable");
        const video = product.id.startsWith("video:");
        const path = video ? videoDownloadPath(songs[0].videoUrl) : archive ?? songs[0].audioUrl;
        if (!path) throw new Error("Video download is unavailable");
        const downloadUrl = await services.signDownload(path, video ? songs[0].title : product.title,
          video ? "mp4" : product.id === heavenBundleId ? "zip" : "mp3");
        await services.recordDownloadLinks?.(req, product.id === heavenBundleId ? songs.slice(0, 1) : songs, video ? "video_download" : "audio_download");
        return res.json({ downloadUrl });
      }
      if (!credentialsReady || !storageReady || !stripe) return res.status(503).json({ message: "Paid downloads are not available yet. You can still listen and watch for free." });
      if (product.id === heavenBundleId && !validBundleArchive(await services.getArchive())) return res.status(503).json({ message: "The bundle download is not ready yet." });
      const orders = await services.listOrders(claims.uid);
      if (orders.some(o => o.status === "paid" && !downloadExpired(o) && (o.productId === product.id ||
        (o.productId === heavenBundleId && product.slugs.length === 1)))) {
        return res.json({ purchaseUrl: "/music/purchases" });
      }
      const pending = orders.filter(o => o.productId === product.id && o.amountCents === product.cents && o.status === "pending" && o.downloadWindowHours === 2);
      // Reuse an open checkout to avoid duplicate sessions on mobile double-taps/retries.
      for (const order of pending.slice(0, 3)) {
        const previous = await stripe.checkout.sessions.retrieve(order.sessionId);
        if (previous.status === "open" && previous.url) return res.json({ checkoutUrl: previous.url });
      }
      const base = "https://365dailydevotional.com";
      const idempotencyKey = createHash("sha256").update(`${claims.uid}:${product.id}:${product.cents}:two-hour-v1:${Math.floor(now() / 1200000)}`).digest("hex");
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        client_reference_id: claims.uid,
        customer_email: claims.email,
        custom_text: { submit: { message: "Download every purchased file within 2 hours after payment. You may retry during that window. Download access disappears afterward. Sign in with the same email to return to your downloads." } },
        metadata: { app: "365-music-v1", uid: claims.uid, productId: product.id, download_window_hours: "2" },
        payment_intent_data: { metadata: { app: "365-music-v1", uid: claims.uid, productId: product.id, download_window_hours: "2" } },
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: product.cents,
          product_data: { name: product.title, description: product.id.startsWith("video:") ? "One MP4 video. One-time purchase." : product.slugs.length === 5 ? "Five selected MP3 tracks. One-time purchase." : product.slugs.length === 3 ? "Original, Instrumental, and Remix MP3s in one ZIP. One-time purchase." : "One MP3 track. One-time purchase." } } }],
        success_url: `${base}/music/purchases?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/music/purchases?cancelled=1`,
      }, { idempotencyKey: `365-music-${idempotencyKey}` });
      await services.createOrder({ sessionId: session.id, uid: claims.uid, productId: product.id,
        amountCents: product.cents, status: "pending", paymentIntentId: null, downloadWindowHours: 2 });
      res.json({ checkoutUrl: session.url });
    } catch (err) { respondError(res, err); }
  });

  app.get("/api/music-commerce/purchases", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const { uid } = await uidOf(req);
      const orders = await services.listOrders(uid);
      res.json(await Promise.all(orders.filter(order => !downloadExpired(order)).map(async order => {
        const product = getMusicProduct(order.productId);
        const title = product?.slugs.length === 1 && !musicProducts.some(p => p.id === order.productId)
          ? ((await services.getSong(product.slugs[0]))?.title ?? product.slugs[0]) + (order.productId.startsWith("video:") ? " — Video (MP4)" : "")
          : product?.title ?? "Music purchase";
        return { sessionId: order.sessionId, productId: order.productId, title, status: order.status,
          amountCents: order.amountCents, createdAt: order.createdAt, downloadExpiresAt: order.downloadExpiresAt ?? null };
      })));
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/confirm", async (req, res) => {
    try {
      const { uid } = await uidOf(req);
      const order = typeof req.body?.sessionId === "string" ? await services.getOrder(req.body.sessionId) : null;
      if (!order || order.uid !== uid) return res.status(404).json({ message: "Purchase not found for this account." });
      const paidOrder = await confirm(order);
      requireDownloadWindow(paidOrder);
      res.json({ paid: true, downloadExpiresAt: paidOrder.downloadExpiresAt ?? null });
    } catch (err) { respondError(res, err); }
  });

  app.post("/api/music-commerce/download", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const { uid } = await uidOf(req);
      const order = typeof req.body?.sessionId === "string" ? await services.getOrder(req.body.sessionId) : null;
      if (!order || order.uid !== uid) return res.status(404).json({ message: "Purchase not found for this account." });
      if (downloadExpired(order)) requireDownloadWindow(order);
      const paidOrder = await confirm(order); // Re-check refunds/disputes before issuing download URLs.
      requireDownloadWindow(paidOrder);
      const { product, songs } = await materialFor(order.productId);
      if (product.id.startsWith("five:")) {
        const downloads = await Promise.all(songs.map(async s => ({ title: s.title, url: await signedDownload(paidOrder, s.audioUrl, s.title, "mp3") })));
        await services.recordDownloadLinks?.(req, songs, "audio_download");
        return res.json({ downloads, downloadExpiresAt: paidOrder.downloadExpiresAt ?? null });
      }
      if (product.id === heavenBundleId) {
        const archive = await services.getArchive();
        if (!validBundleArchive(archive)) throw new Error("Archive unavailable");
        const downloadUrl = await signedDownload(paidOrder, archive, product.title, "zip");
        await services.recordDownloadLinks?.(req, songs.slice(0, 1), "audio_download");
        return res.json({ downloadUrl, downloadExpiresAt: paidOrder.downloadExpiresAt ?? null });
      }
      if (product.id.startsWith("video:")) {
        const path = videoDownloadPath(songs[0].videoUrl);
        if (!path) throw new Error("Video download is unavailable");
        const downloadUrl = await signedDownload(paidOrder, path, songs[0].title, "mp4");
        await services.recordDownloadLinks?.(req, songs, "video_download");
        return res.json({ downloadUrl, downloadExpiresAt: paidOrder.downloadExpiresAt ?? null });
      }
      const downloadUrl = await signedDownload(paidOrder, songs[0].audioUrl, songs[0].title, "mp3");
      await services.recordDownloadLinks?.(req, songs, "audio_download");
      res.json({ downloadUrl, downloadExpiresAt: paidOrder.downloadExpiresAt ?? null });
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
