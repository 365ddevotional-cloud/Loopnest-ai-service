import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { pool } from "./db";
import { isAndroidReaderRequest } from "./android-reader";
import { musicCountryFromRequest } from "./music-location";

type GoldOptions = {
  stripe: Stripe | null;
  viewer: (request: Request) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;
  sendError: (response: Response, error: unknown) => unknown;
};

export function registerGoldBilling(app: Express, { stripe, viewer, sendError }: GoldOptions) {
  const price = process.env.SPIRITTONE_GOLD_PRICE_ID;
  const sandbox = /^([sr]k)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  const origin = process.env.SPIRITTONE_GOLD_SANDBOX_ORIGIN;
  const enabled = !!(stripe && price && sandbox && origin && /^https:\/\/[a-z0-9.-]+$/i.test(origin)
    && process.env.STRIPE_SHOP_WEBHOOK_SECRET && process.env.SPIRITTONE_GOLD_SANDBOX_ENABLED === "true");
  function fail(status: number, message: string): never { throw Object.assign(new Error(message), { status }); }

  app.get("/api/spirittone-gold/availability", (req, res) => {
    res.set("Cache-Control", "no-store").json({ enabled: enabled && !isAndroidReaderRequest(req) && musicCountryFromRequest(req) === "US" });
  });

  app.post("/api/spirittone-gold/checkout", async (req, res) => {
    try {
      if (!enabled || !stripe || !price || !origin || isAndroidReaderRequest(req)) fail(403, "Enrollment is closed.");
      if (musicCountryFromRequest(req) !== "US" || req.body?.acceptedMonthlyPrice !== true) fail(400, "Confirm the U.S. monthly price before enrolling.");
      const user = await viewer(req);
      if (!user.email_verified || !user.email) fail(403, "Verify your email before enrolling.");
      const offer = await stripe.prices.retrieve(price);
      if (offer.livemode || !offer.active || offer.unit_amount !== 499 || offer.currency !== "usd" ||
          offer.recurring?.interval !== "month" || offer.recurring.interval_count !== 1) fail(409, "The membership price is unavailable.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1), 365104)", [user.uid]);
        const { rows } = await client.query("SELECT session_id FROM spirittone_gold_checkout WHERE firebase_uid=$1", [user.uid]);
        const oldId: string | undefined = rows[0]?.session_id;
        if (oldId) {
          const old = await stripe.checkout.sessions.retrieve(oldId, { expand: ["subscription"] });
          if (old.status === "open" && old.url) {
            await client.query("COMMIT");
            return res.json({ url: old.url });
          }
          if (old.status === "complete") {
            const sub = old.subscription;
            if (!sub || typeof sub === "string" || !["canceled","incomplete_expired"].includes(sub.status)) fail(409, "You already have a membership or a payment in progress.");
          }
        }
        const metadata = { app: "365-spirittone-gold", uid: user.uid };
        const key = createHash("sha256").update(JSON.stringify([user.uid,oldId,price])).digest("hex");
        const session = await stripe.checkout.sessions.create({mode:"subscription",customer_email:user.email,
          line_items:[{price,quantity:1}],subscription_data:{metadata}, metadata,client_reference_id:user.uid,
          success_url:origin+"/shop/sOkZu",cancel_url:origin+"/shop/sOkZu"}, {idempotencyKey:"gold-"+key});
        if (!session.url) fail(503, "Checkout could not start.");
        await client.query("INSERT INTO spirittone_gold_checkout(firebase_uid,session_id) VALUES ($1,$2) ON CONFLICT (firebase_uid) DO UPDATE SET session_id=excluded.session_id",[user.uid,session.id]);
        await client.query("COMMIT");
        res.json({url:session.url});
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    } catch (error) { sendError(res,error); }
  });

  app.post("/api/spirittone-gold/cancel", async (req,res) => {
    try {
      if (!stripe || !sandbox) fail(403,"Sandbox membership management is unavailable.");
      const user = await viewer(req);
      const {rows} = await pool.query("SELECT session_id FROM spirittone_gold_checkout WHERE firebase_uid=$1",[user.uid]);
      if (!rows[0]) fail(404,"No membership was found.");
      const session = await stripe.checkout.sessions.retrieve(rows[0].session_id);
      if (session.metadata?.uid !== user.uid || session.metadata?.app !== "365-spirittone-gold" || typeof session.subscription !== "string") fail(409,"No active membership was found.");
      await stripe.subscriptions.update(session.subscription,{cancel_at_period_end:true});
      res.json({cancelAtPeriodEnd:true});
    } catch(error) {sendError(res,error);}
  });
}
