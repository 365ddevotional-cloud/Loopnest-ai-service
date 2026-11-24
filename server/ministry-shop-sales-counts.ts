import { sql } from "drizzle-orm";
import { db } from "./db";
import type { ShopCatalogProduct } from "./ministry-shop-catalog";

export async function getShopSalesCounts(catalog: ShopCatalogProduct[]) {
  const totals: Record<string,number> = Object.fromEntries(catalog.map(item=>[item.id,0]));
  const result = await db.execute<{source:string; product_id:string; total:number}>(sql`
    SELECT 'shop' AS source, product_id, count(*)::int AS total FROM ministry_shop_orders
    WHERE status='paid' AND left(session_id,8)='cs_live_' GROUP BY product_id
    UNION ALL
    SELECT 'music',product_id,count(*)::int FROM music_purchase_orders
    WHERE status='paid' AND left(session_id,8)='cs_live_' GROUP BY product_id
    UNION ALL
    SELECT 'shop','sOkZu',count(*)::int FROM spirittone_gold_periods p
    JOIN spirittone_gold_checkout c ON c.firebase_uid=p.firebase_uid
    WHERE left(c.session_id,8)='cs_live_' AND p.revoked_at IS NULL`);
  for (const row of result.rows) {
    if (row.source === "shop") {
      if (Object.hasOwn(totals,row.product_id)) totals[row.product_id] += Number(row.total);
      continue;
    }
    const slug = row.product_id.replace(/^(single:|video:)/,"");
    const matches = catalog.filter(item=>item.spiritToneSlug===slug && !item.replacedBy);
    if (matches.length === 1) totals[matches[0].id] += Number(row.total);
  }
  return totals;
}
