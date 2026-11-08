import type { Express, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import catalog from "../client/src/data/ministry-shop-catalog.json";
import { db } from "./db";

export type ShopAsset = { object_key: string; file_name: string; content_type: string; size_bytes: string };
type ShopReadiness = {
  checkoutConfigured: boolean;
  storageConfigured: boolean;
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  countries: string[];
};
const salesInput = z.object({ paused: z.boolean() }).strict();

export function registerMinistryShopAdmin(
  app: Express,
  requireAdmin: RequestHandler,
  readiness: ShopReadiness,
  canSell: (id: string, assets: ShopAsset[]) => boolean,
) {
  app.get("/api/admin/ministry-shop", requireAdmin, async (_req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
      const [products, assets, orders] = await Promise.all([
        db.execute<{ product_id: string; total: string | null; paused: boolean | null }>(sql`
          SELECT COALESCE(v.product_id,c.product_id) AS product_id, v.total, c.paused
          FROM ministry_shop_product_views v FULL JOIN ministry_shop_sales_controls c USING (product_id)
        `),
        db.execute<ShopAsset & {product_id: string}>(sql`SELECT product_id, object_key, file_name, content_type, size_bytes FROM ministry_shop_assets`),
        db.execute<{ session_id: string; product_id: string; amount: number; currency: string; status: string; created_at: Date }>(sql`
          SELECT session_id, product_id, amount, currency, status, created_at
          FROM ministry_shop_orders ORDER BY created_at DESC, session_id DESC LIMIT 50
        `),
      ]);

      const statistics = new Map(products.rows.map(row => [row.product_id, row]));
      const filesByProduct = new Map<string, ShopAsset[]>();
      for (const asset of assets.rows) {
        const files = filesByProduct.get(asset.product_id) ?? [];
        files.push(asset);
        filesByProduct.set(asset.product_id, files);
      }
      res.json({
        readiness,
        products: catalog.map(item => {
          const files = filesByProduct.get(item.id) ?? [];
          const row = statistics.get(item.id);
          return {
            id: item.id, title: item.title, kind: item.kind,
            visits: Number(row?.total ?? 0), paused: row?.paused === true,
            fileCount: files.length, filesReady: canSell(item.id, files),
          };
        }),
        orders: orders.rows.map(order => ({
          reference: order.session_id.slice(-12),
          productId: order.product_id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          createdAt: order.created_at,
        })),
      });
    } catch {
      res.status(503).json({ message: "Shop administration is unavailable. Check that the Shop migrations have been applied." });
    }
  });

  app.patch("/api/admin/ministry-shop/:id/sales", requireAdmin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const product = catalog.find(item => item.id === req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (product.kind === "Membership") return res.status(409).json({ message: "This control is for one-time products." });
    const input = salesInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Provide a valid sales status." });

    try {
      await db.execute(sql`INSERT INTO ministry_shop_sales_controls (product_id, paused)
        VALUES (${product.id}, ${input.data.paused})
        ON CONFLICT (product_id) DO UPDATE SET paused = EXCLUDED.paused`);
      res.json({ id: product.id, paused: input.data.paused });
    } catch {
      res.status(503).json({ message: "The product’s sales status could not be saved." });
    }
  });
}
