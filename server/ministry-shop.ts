import { createHmac } from "node:crypto";
import type { Express } from "express";
import { sql } from "drizzle-orm";
import catalog from "../client/src/data/ministry-shop-catalog.json";
import { db } from "./db";
import { isMinistryShopAdminEmail } from "../shared/ministry-shop-access";

const productIds = new Set(catalog.map(item => item.id));

type VerifyToken = (token: string) => Promise<{ email?: string; email_verified?: boolean }>;

export function registerMinistryShopRoutes(app: Express, verifyToken: VerifyToken) {
  app.get("/api/ministry-shop/views", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const token = req.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return res.status(401).json({ message: "Sign in to view product visit counts." });

    const account = await verifyToken(token).catch(() => null);
    if (!account) return res.status(401).json({ message: "Sign in to view product visit counts." });
    if (account.email_verified !== true || !isMinistryShopAdminEmail(account.email)) {
      return res.status(403).json({ message: "Admin access required." });
    }

    try {
      const { rows } = await db.execute<{ product_id: string; total: string }>(sql`
        SELECT product_id, total FROM ministry_shop_product_views
      `);
      const views: Record<string, number> = Object.fromEntries(catalog.map(item => [item.id, 0]));
      for (const row of rows) {
        if (productIds.has(row.product_id)) views[row.product_id] = Number(row.total);
      }
      res.json(views);
    } catch {
      res.status(503).json({ message: "Product visit counts are temporarily unavailable." });
    }
  });

  app.post("/api/ministry-shop/:id/visit", async (req, res) => {
    const id = req.params.id;
    if (!productIds.has(id)) return res.status(404).json({ message: "Product not found." });

    const browserId = req.body?.browserId;
    if (typeof browserId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(browserId)) {
      return res.status(400).json({ message: "Invalid visitor identifier." });
    }

    const secret = process.env.SESSION_SECRET ?? process.env.DATABASE_URL;
    if (!secret) return res.status(503).json({ message: "Product visit counts are temporarily unavailable." });

    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHmac("sha256", secret).update(`ministry-shop:${day}:${id}:${browserId.toLowerCase()}`).digest("hex");
    try {
      // The unique visit insert and counter increment commit together, even across replicas.
      await db.execute(sql`
        WITH visit AS (
          INSERT INTO ministry_shop_daily_visits (day, product_id, visitor_hash)
          VALUES (${day}, ${id}, ${visitorHash})
          ON CONFLICT DO NOTHING RETURNING product_id
        )
        INSERT INTO ministry_shop_product_views (product_id, total)
        SELECT product_id, 1 FROM visit
        ON CONFLICT (product_id) DO UPDATE SET total = ministry_shop_product_views.total + 1
      `);
      res.sendStatus(204);
    } catch {
      res.status(503).json({ message: "Product visit counts are temporarily unavailable." });
    }
  });
}
