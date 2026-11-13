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
      const [products, assets, orders, spiritTone] = await Promise.all([
        db.execute<{ product_id: string; total: string | null; paused: boolean | null }>(sql`
          SELECT COALESCE(v.product_id,c.product_id) AS product_id, v.total, c.paused
          FROM ministry_shop_product_views v FULL JOIN ministry_shop_sales_controls c USING (product_id)
        `),
        db.execute<ShopAsset & {product_id: string}>(sql`SELECT product_id, object_key, file_name, content_type, size_bytes FROM ministry_shop_assets`),
        db.execute<{ session_id: string; product_id: string; amount: number; currency: string; status: string; created_at: Date }>(sql`
          SELECT session_id, product_id, amount, currency, status, created_at
          FROM ministry_shop_orders ORDER BY created_at DESC, session_id DESC LIMIT 50
        `),
        // Read-only, includes archived recordings so none are silently omitted.
        db.execute<{
          id: number; slug: string; title: string; language: string | null;
          song_type: string | null; is_active: boolean; audio_ready: boolean;
          lyrics_ready: boolean; art_ready: boolean; featured_week_start: string | null;
          featured_week_end: string | null;
        }>(sql`
          SELECT id, slug, title, language, song_type, is_active,
            (audio_url IS NOT NULL AND length(btrim(audio_url)) > 0) AS audio_ready,
            (lyrics IS NOT NULL AND length(btrim(lyrics)) > 0) AS lyrics_ready,
            (cover_image_url IS NOT NULL AND length(btrim(cover_image_url)) > 0) AS art_ready,
            featured_week_start, featured_week_end
          FROM songs ORDER BY id ASC
        `),
      ]);

      const statistics = new Map(products.rows.map(row => [row.product_id, row]));
      const filesByProduct = new Map<string, ShopAsset[]>();
      for (const asset of assets.rows) {
        const files = filesByProduct.get(asset.product_id) ?? [];
        files.push(asset);
        filesByProduct.set(asset.product_id, files);
      }
      const shopSingles = catalog.filter(item => item.kind === "Music" && !item.replacedBy && item.id !== "x29Tw");
      const normalizeTitle = (title: string) => title.normalize("NFKC").toLocaleLowerCase("en")
        .replace(/[\\p{P}\\p{Z}]+/gu, " ").trim().replace(/\\s+/g, " ");
      const productMatches = new Map<string, {id: string; title: string}[]>();
      for (const product of shopSingles) {
        const normalized = normalizeTitle(product.title);
        const options = productMatches.get(normalized) ?? [];
        options.push({ id: product.id, title: product.title });
        productMatches.set(normalized, options);
      }
      const reconciliation = spiritTone.rows.map(song => {
        // Never auto-merge by title. An exact name is still only a candidate.
        const candidates = productMatches.get(normalizeTitle(song.title)) ?? [];
        return {
          songId: song.id, slug: song.slug, title: song.title,
          language: song.language, songType: song.song_type, active: song.is_active,
          audioReady: song.audio_ready, lyricsReady: song.lyrics_ready, artworkReady: song.art_ready,
          featuredWeekStart: song.featured_week_start, featuredWeekEnd: song.featured_week_end,
          matchStatus: candidates.length > 1 ? "ambiguous" : candidates.length === 1 ? "candidate" : "unmatched",
          candidates,
        };
      });
      res.json({
        reconciliation: {
          totals: {
            allSongs: reconciliation.length,
            activeSongs: reconciliation.filter(s => s.active).length,
            archivedSongs: reconciliation.filter(s => !s.active).length,
            possibleMatches: reconciliation.filter(s => s.matchStatus === "candidate").length,
            ambiguous: reconciliation.filter(s => s.matchStatus === "ambiguous").length,
            unmatched: reconciliation.filter(s => s.matchStatus === "unmatched").length,
          },
          songs: reconciliation,
        },
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
