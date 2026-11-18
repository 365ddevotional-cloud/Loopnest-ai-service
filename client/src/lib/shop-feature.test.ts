import {test} from "node:test";
import assert from "node:assert/strict";
import {featuredBooks,getShopFeature,SHOP_FEATURE_START,SHOP_FEATURE_INTERVAL_MS} from "./shop-feature";

test("the book stays fixed for four days and rotates at the boundary",()=>{
  const ids=new Set(featuredBooks.map(p=>p.id));
  assert.equal(getShopFeature(SHOP_FEATURE_START,ids)?.id,featuredBooks[0].id);
  assert.equal(getShopFeature(SHOP_FEATURE_START+SHOP_FEATURE_INTERVAL_MS-1,ids)?.id,featuredBooks[0].id);
  assert.equal(getShopFeature(SHOP_FEATURE_START+SHOP_FEATURE_INTERVAL_MS,ids)?.id,featuredBooks[1].id);
  assert.equal(getShopFeature(SHOP_FEATURE_START+SHOP_FEATURE_INTERVAL_MS*14,ids)?.id,featuredBooks[0].id);
});

test("a removed or unpublished book is skipped and an empty catalog has no advert",()=>{
  assert.equal(getShopFeature(SHOP_FEATURE_START,new Set([featuredBooks[2].id]))?.id,featuredBooks[2].id);
  assert.equal(getShopFeature(SHOP_FEATURE_START,new Set()),undefined);
});
