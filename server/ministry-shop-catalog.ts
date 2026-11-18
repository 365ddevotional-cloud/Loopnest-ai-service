import original from "../client/src/data/ministry-shop-catalog.json";
import descriptions from "../client/src/data/ministry-shop-content.json";
import { sql } from "drizzle-orm";
import { db } from "./db";

export type ShopCatalogProduct = (typeof original)[number] & {
  description?: string; author?: string; lyrics?: string;
  artworkUrl?: string; coverKey?: string; published?: boolean; useBasePrice?: boolean;
};

export async function getShopCatalog(includeDrafts = false): Promise<ShopCatalogProduct[]> {
  const { rows } = await db.execute<{ id: string; payload: ShopCatalogProduct; published: boolean }>(sql`
    SELECT id, payload, published FROM ministry_shop_managed_products
  `);
  const products = new Map<string, ShopCatalogProduct>(original.map(item => [item.id, {
    ...item, description: (descriptions as Record<string, string[]>)[item.id]?.join("\n\n"), published: true,
  }]));
  for (const row of rows) {
    products.delete(row.id);
    if (row.published || includeDrafts) products.set(row.id, {
      ...row.payload, id: row.id, published: row.published,
      artworkUrl: row.payload.coverKey ? `/api/ministry-shop/art/${row.id}` : undefined,
    });
  }
  return [...products.values()];
}

export async function getShopProduct(id: string, includeDrafts = false) {
  return (await getShopCatalog(includeDrafts)).find(item => item.id === id);
}
