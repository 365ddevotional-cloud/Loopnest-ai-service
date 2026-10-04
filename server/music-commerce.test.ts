import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import Stripe from "stripe";
import { registerMusicCommerceRoutes, paymentMatchesOrder, type MusicOrder } from "./music-commerce";

const secret = "whsec_local_fixture_only";
const archive = "/objects/uploads/11111111-1111-1111-1111-111111111111";
function fixture(overrides: Record<string, any> = {}) {
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
    verifyToken: async (token: string) => {
      if (token === "bad") throw new Error("Invalid token");
      return { uid: token, email: token === "owner" ? "365ddevotional@gmail.com" : "fixture@example.test", email_verified: token !== "unverified" };
    },
    getSong: async (slug: string) => ({ slug, title: slug, isActive: true, audioUrl: archive }),
    createOrder: async (order: MusicOrder) => { if (!orders.has(order.sessionId)) orders.set(order.sessionId, order); },
    getOrder: async (id: string) => orders.get(id),
    listOrders: async (uid: string) => Array.from(orders.values()).filter(o => o.uid === uid),
    updateOrder: async (id: string, status: string, intent?: string) => {
      const order = orders.get(id); if (order && order.status !== "revoked") { order.status = status; if (intent) order.paymentIntentId = intent; }
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
  const checkout = (productId = "heaven-reigns-original", uid = "buyer") => request(app).post("/api/music-commerce/checkout").set("Authorization", `Bearer ${uid}`).send({ productId });
  const pay = (id = "cs_test_1") => {
    const session = sessions.get(id); session.status = "complete"; session.payment_status = "paid";
    session.payment_intent = { id: "pi_fixture", status: "succeeded", latest_charge: { paid: true, amount_refunded: 0, disputed: false } };
  };
  const post = (path: string, body: object, uid = "buyer") => request(app).post(`/api/music-commerce/${path}`).set("Authorization", `Bearer ${uid}`).send(body);
  const webhook = (event: any, valid = true) => {
    const payload = JSON.stringify(event);
    const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: valid ? secret : "wrong_secret" });
    return request(app).post("/api/music-commerce/webhook").set("Content-Type", "application/json").set("stripe-signature", signature).send(payload);
  };
  return { app, orders, sessions, created, signed, checkout, post, pay, webhook };
}

test("server prices are 50 cents per track and 100 cents for all three; retries reuse checkout", async () => {
  const f = fixture();
  assert.equal((await f.checkout()).status, 200);
  assert.equal(f.created[0].line_items[0].price_data.unit_amount, 50);
  assert.equal((await f.checkout()).status, 200); assert.equal(f.created.length, 1);
  assert.equal((await f.checkout("heaven-reigns-bundle")).status, 200);
  assert.equal(f.created[1].line_items[0].price_data.unit_amount, 100);
  assert.equal(f.created[1].line_items[0].quantity, 1);
  assert.equal(f.created[1].success_url, "https://365dailydevotional.com/music/purchases?session_id={CHECKOUT_SESSION_ID}");
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
