import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import Stripe from "stripe";
import { registerMusicCommerceRoutes, paymentMatchesOrder, type MusicOrder } from "./music-commerce";

const secret = "whsec_local_fixture_only";
const archive = "/objects/uploads/11111111-1111-1111-1111-111111111111";
function fixture(overrides: Record<string, any> = {}) {
  let time = Date.now();
  const orders = new Map<string, MusicOrder>();
  const sessions = new Map<string, any>();
  const created: any[] = [];
  const signed: any[] = [];
  const sdk = new Stripe("sk_test_fixture_only");
  const stripe = { webhooks: sdk.webhooks, checkout: { sessions: {
    create: async (data: any) => {
      created.push(data);
      const session = { id: `cs_test_${created.length}`, url: "https://checkout.stripe.com/c/pay/test-fixture", status: "open", ...data,
        amount_total: data.line_items[0].price_data.unit_amount, currency: "usd", payment_status: "unpaid" };
      sessions.set(session.id, session); return session;
    },
    retrieve: async (id: string) => { if (!sessions.has(id)) throw new Error("Stripe unavailable"); return sessions.get(id); },
  } } };
  const services = {
    env: { STRIPE_SECRET_KEY: "sk_live_fixture_only", STRIPE_MUSIC_WEBHOOK_SECRET: secret,
      NODE_ENV: "production", R2_ACCOUNT_ID: "fixture", R2_ACCESS_KEY_ID: "fixture", R2_SECRET_ACCESS_KEY: "fixture", R2_BUCKET_NAME: "fixture" },
    stripe: stripe as unknown as Stripe,
    now: () => time,
    verifyToken: async (token: string) => {
      if (token === "bad") throw new Error("Invalid token");
      return { uid: token, email: token === "owner" ? "365ddevotional@gmail.com" : "fixture@example.test", email_verified: token !== "unverified" };
    },
    getSong: async (slug: string) => ({ slug, title: slug, isActive: true, audioUrl: archive }),
    createOrder: async (order: MusicOrder) => { if (!orders.has(order.sessionId)) orders.set(order.sessionId, order); },
    getOrder: async (id: string) => orders.get(id),
    listOrders: async (uid: string) => Array.from(orders.values()).filter(o => o.uid === uid),
    updateOrder: async (id: string, status: string, intent?: string, expiresAt?: string) => {
      const order = orders.get(id); if (order && order.status !== "revoked") { order.status = status; if (intent) order.paymentIntentId = intent; if (expiresAt && !order.downloadExpiresAt) order.downloadExpiresAt = expiresAt; }
    },
    revokeByPaymentIntent: async (id: string) => { for (const o of orders.values()) if (o.paymentIntentId === id) o.status = "revoked"; },
    getArchive: async () => archive,
    setArchive: async () => {},
    signDownload: async (...args: any[]) => { signed.push(args); return "https://storage.example.test/signed-download"; },
    requireAdmin: (_req: any, res: any) => res.status(401).end(),
    ...overrides,
  };
  const app = express();
  app.use(express.json({ verify: (req: any, _res, body) => { req.rawBody = body; } }));
  registerMusicCommerceRoutes(app, services);
  const checkout = (productId = "heaven-reigns-original", uid = "buyer") => request(app).post("/api/music-commerce/checkout").set("Authorization", `Bearer ${uid}`).send({ productId, email: uid === "owner" ? "365ddevotional@gmail.com" : "fixture@example.test", downloadPolicyAccepted: true });
  const pay = (id = "cs_test_1") => {
    const session = sessions.get(id); session.status = "complete"; session.payment_status = "paid";
    session.payment_intent = { id: "pi_fixture", status: "succeeded", latest_charge: { created: Math.floor(time / 1000), paid: true, amount_refunded: 0, disputed: false } };
  };
  const post = (path: string, body: object, uid = "buyer") => request(app).post(`/api/music-commerce/${path}`).set("Authorization", `Bearer ${uid}`).send(body);
  const webhook = (event: any, valid = true) => {
    const payload = JSON.stringify(event);
    const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: valid ? secret : "wrong_secret" });
    return request(app).post("/api/music-commerce/webhook").set("Content-Type", "application/json").set("stripe-signature", signature).send(payload);
  };
  return { app, orders, sessions, created, signed, checkout, post, pay, webhook, now: () => time, advance: (ms: number) => { time += ms; } };
}

test("server prices are 89 cents per track and 189 cents for all three; retries reuse checkout", async () => {
  const f = fixture();
  assert.equal((await f.checkout()).status, 200);
  assert.equal(f.created[0].line_items[0].price_data.unit_amount, 89);
  assert.equal((await f.checkout()).status, 200); assert.equal(f.created.length, 1);
  assert.equal((await f.checkout("heaven-reigns-bundle")).status, 200);
  assert.equal(f.created[1].line_items[0].price_data.unit_amount, 189);
  assert.equal(f.created[1].line_items[0].quantity, 1);
  assert.equal(f.created[1].success_url, "https://365dailydevotional.com/music/purchases?session_id={CHECKOUT_SESSION_ID}");
});

test("God Got Me and other catalog singles require their own verified payment", async () => {
  const f = fixture({ getSong: async (slug: string) => ({
    slug, title: slug === "god-got-me" ? "God Got Me" : "Another Song",
    isActive: true, audioUrl: archive,
  }) });
  const result = await f.checkout("single:god-got-me");
  assert.equal(result.status, 200);
  assert.equal(f.created[0].line_items[0].price_data.unit_amount, 89);
  assert.equal(f.created[0].line_items[0].price_data.product_data.name, "God Got Me");
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 403);
  f.pay();
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 200);
  assert.equal(f.signed[0][1], "God Got Me");
  assert.equal((await f.checkout("single:another-song")).status, 200);
  assert.equal(f.created.length, 2);
});

test("a non-R2 song cannot be charged for a file the checkout cannot deliver", async () => {
  const f = fixture({ getSong: async (slug: string) => ({
    slug, title: "External media", isActive: true, audioUrl: "https://example.test/song.mp3",
  }) });
  assert.equal((await f.checkout("single:external-media")).status, 409);
  assert.equal(f.created.length, 0);
});
test("rejects client prices, unknown products, missing and forged authentication", async () => {
  const f = fixture();
  assert.equal((await request(f.app).post("/api/music-commerce/checkout").send({ productId: "heaven-reigns-bundle" })).status, 401);
  assert.equal((await f.checkout("heaven-reigns-bundle", "bad")).status, 401);
  assert.equal((await f.checkout("fake-product")).status, 400);
  assert.equal((await f.post("checkout", { productId: "heaven-reigns-bundle", amount: 1 })).status, 400);
  assert.equal(f.created.length, 0);
});
test("production requires a live key and webhook secret; missing archive blocks bundle", async () => {
  for (const env of [{ NODE_ENV: "production" }, { NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_MUSIC_WEBHOOK_SECRET: secret }]) {
    const f = fixture({ env }); assert.equal((await f.checkout()).status, 503); assert.equal(f.created.length, 0);
  }
  const f = fixture({ getArchive: async () => null });
  assert.equal((await f.checkout("heaven-reigns-bundle")).status, 503);
  const r = await request(f.app).get("/api/music-commerce/catalog");
  assert.equal(r.body.products.find((p: any) => p.id === "heaven-reigns-bundle").ready, false);
});
test("unpaid or another account cannot confirm or obtain download URLs", async () => {
  const f = fixture(); await f.checkout();
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 403);
  assert.equal((await f.post("confirm", { sessionId: "cs_test_1" }, "other-buyer")).status, 404);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" }, "other-buyer")).status, 404);
  assert.equal(f.signed.length, 0);
});
test("verified purchase yields MP3; bundle yields one ZIP; repeat confirmations are safe", async () => {
  const f = fixture(); await f.checkout(); f.pay();
  for (let i = 0; i < 2; i++) assert.equal((await f.post("confirm", { sessionId: "cs_test_1" })).status, 200);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 200);
  assert.equal(f.signed[0][2], "mp3");
  await f.checkout("heaven-reigns-bundle"); f.pay("cs_test_2");
  assert.equal((await f.post("download", { sessionId: "cs_test_2" })).status, 200);
  assert.equal(f.signed[1][2], "zip"); assert.equal(f.orders.size, 2);
});
test("wrong amount, currency, metadata, unpaid charge, refund and dispute are rejected", async () => {
  const f = fixture(); await f.checkout(); f.pay();
  const original = f.sessions.get("cs_test_1"); const order = f.orders.get("cs_test_1")!;
  for (const session of [ { ...original, amount_total: 1 }, { ...original, currency: "eur" }, { ...original, metadata: { ...original.metadata, uid: "other" } },
    { ...original, payment_intent: { ...original.payment_intent, latest_charge: { paid: false, amount_refunded: 0, disputed: false } } } ]) {
    assert.equal(paymentMatchesOrder(session, order), false);
  }
  original.payment_intent.latest_charge.amount_refunded = 50;
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 403);
  assert.equal(order.status, "revoked"); assert.equal(f.signed.length, 0);
  original.payment_intent.latest_charge.amount_refunded = 0;
  assert.equal((await f.post("confirm", { sessionId: "cs_test_1" })).status, 403);
});
test("Stripe signatures required; valid and duplicate webhook deliveries fulfill once", async () => {
  const f = fixture(); await f.checkout(); f.pay();
  const event = { id: "evt_fixture", type: "checkout.session.completed", data: { object: f.sessions.get("cs_test_1") } };
  assert.equal((await f.webhook(event, false)).status, 400);
  assert.equal(f.orders.get("cs_test_1")!.status, "pending");
  for (let i = 0; i < 2; i++) assert.equal((await f.webhook(event)).status, 200);
  assert.equal(f.orders.get("cs_test_1")!.status, "paid");
  assert.equal((await f.webhook({ id: "evt_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_fixture" } } })).status, 200);
  assert.equal(f.orders.get("cs_test_1")!.status, "revoked");
  assert.equal((await f.webhook(event)).status, 200); assert.equal(f.orders.get("cs_test_1")!.status, "revoked");
});
test("verified lifetime-free owner bypasses checkout; admin session cannot grant purchase access", async () => {
  const f = fixture(); assert.equal((await f.checkout("heaven-reigns-bundle", "owner")).status, 200);
  assert.equal(f.created.length, 0); assert.equal(f.signed[0][2], "zip");
  const response = await request(f.app).get("/api/music-commerce/purchases").set("Cookie", "isAdmin=true");
  assert.equal(response.status, 401);
});
test("a paid bundle returns buyers to their purchases without charging for a track again", async () => {
  const f = fixture(); await f.checkout("heaven-reigns-bundle"); f.pay();
  await f.post("confirm", { sessionId: "cs_test_1" });
  const response = await f.checkout("heaven-reigns-original");
  assert.equal(response.status, 200); assert.equal(response.body.purchaseUrl, "/music/purchases");
  assert.equal(f.created.length, 1);
});


test("any five distinct tracks cost 299 cents and fulfill all five; duplicates and unavailable files reject", async () => {
  const f = fixture(); const id = "five:a,b,heaven-reigns-original,heaven-reigns-remix,z";
  assert.equal((await f.checkout(id)).status, 200);
  assert.equal(f.created[0].line_items[0].price_data.unit_amount, 299);
  f.pay(); const result = await f.post("download", { sessionId: "cs_test_1" });
  assert.equal(result.status, 200); assert.equal(result.body.downloads.length, 5);
  assert.equal((await f.checkout("five:a,a,b,c,d")).status, 400);
  assert.equal((await f.checkout("five:a,b,c,d")).status, 400);
  const missing = fixture({ getSong: async () => undefined });
  assert.equal((await missing.checkout(id)).status, 409);
});


test("verified account email and explicit download policy are required before payment", async () => {
  const f = fixture();
  assert.equal((await f.checkout(undefined, "unverified")).status, 403);
  for (const body of [
    { productId: "heaven-reigns-original" },
    { productId: "heaven-reigns-original", email: "other@example.test", downloadPolicyAccepted: true },
    { productId: "heaven-reigns-original", email: "fixture@example.test" },
  ]) assert.equal((await f.post("checkout", body)).status, 400);
  assert.equal(f.created.length, 0);
  assert.equal((await f.checkout()).status, 200);
  assert.equal(f.created[0].customer_email, "fixture@example.test");
  assert.match(f.created[0].custom_text.submit.message, /2 hours/);
  assert.equal(f.orders.get("cs_test_1")!.downloadWindowHours, 2);
});

test("two-hour deadline starts at payment, caps signed links, hides expired downloads and permits repurchase", async () => {
  const f = fixture(); await f.checkout("five:a,b,c,d,e");
  f.advance(30 * 60 * 1000); f.pay();
  const paidAt = f.sessions.get("cs_test_1").payment_intent.latest_charge.created * 1000;
  assert.equal((await f.post("confirm", { sessionId: "cs_test_1" })).status, 200);
  const deadline = f.orders.get("cs_test_1")!.downloadExpiresAt;
  assert.equal(deadline, new Date(paidAt + 7200000).toISOString());
  f.advance(60 * 60 * 1000);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 200);
  assert.equal(f.signed.length, 5);
  assert.equal(f.signed[0][3], 900);
  f.advance(59 * 60 * 1000);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 200);
  assert.ok(f.signed[5][3] <= 60);
  assert.equal(f.orders.get("cs_test_1")!.downloadExpiresAt, deadline);
  f.advance(60 * 1000);
  const signedCount = f.signed.length;
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 410);
  assert.equal((await f.post("confirm", { sessionId: "cs_test_1" })).status, 410);
  assert.equal(f.signed.length, signedCount);
  const list = await request(f.app).get("/api/music-commerce/purchases").set("Authorization", "Bearer buyer");
  assert.deepEqual(list.body, []);
  assert.equal(f.orders.size, 1); // Financial record retained.
  assert.equal((await f.checkout("five:a,b,c,d,e")).status, 200);
  assert.equal(f.created.length, 2);
});

test("late confirmations and duplicate webhooks cannot restart the paid download window", async () => {
  const f = fixture(); await f.checkout(); f.pay(); f.advance(3 * 60 * 60 * 1000);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 410);
  const deadline = f.orders.get("cs_test_1")!.downloadExpiresAt;
  const event = { id: "evt_late", type: "checkout.session.completed", data: { object: f.sessions.get("cs_test_1") } };
  assert.equal((await f.webhook(event)).status, 200);
  assert.equal(f.orders.get("cs_test_1")!.downloadExpiresAt, deadline);
  assert.equal(f.signed.length, 0);
});

test("legacy paid purchases retain access sold before the two-hour policy", async () => {
  const f = fixture(); await f.checkout();
  delete f.orders.get("cs_test_1")!.downloadWindowHours;
  f.pay(); f.advance(24 * 60 * 60 * 1000);
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 200);
  assert.equal(f.orders.get("cs_test_1")!.downloadExpiresAt, undefined);
});

test("a concurrent revocation during confirmation cannot issue a download", async () => {
  let f: ReturnType<typeof fixture>;
  f = fixture({ updateOrder: async (id: string) => { f.orders.get(id)!.status = "revoked"; } });
  await f.checkout(); f.pay();
  assert.equal((await f.post("download", { sessionId: "cs_test_1" })).status, 403);
  assert.equal(f.signed.length, 0);
});
