import assert from "node:assert/strict";
import test from "node:test";
import { shopAssetsMatchProduct } from "../shared/ministry-shop-asset-readiness";

const hash = "a".repeat(64);
const asset = (id: string, type: string) => ({
  object_key: `ministry-shop/${id}/${hash}`,
  file_name: `${id}.zip`,
  content_type: type,
  size_bytes: "3248576",
});
const bundle = "x29Tw";
const spiritTone = { id: "st019", kind: "Music", packageFormat: "zip", requiredFileCount: 1 };

test("new SpiritTone releases require one complete private ZIP", () => {
  assert.equal(shopAssetsMatchProduct(spiritTone, [asset("st019", "application/zip")], bundle), true);
  assert.equal(shopAssetsMatchProduct(spiritTone, [], bundle), false);
  assert.equal(shopAssetsMatchProduct(spiritTone, [asset("st019", "audio/mpeg")], bundle), false);
  assert.equal(shopAssetsMatchProduct(spiritTone, [
    asset("st019", "application/zip"), asset("st019", "application/zip"),
  ], bundle), false);
});

test("a wrong product path, malformed hash or zero-byte object is not saleable", () => {
  assert.equal(shopAssetsMatchProduct(spiritTone, [asset("st020", "application/zip")], bundle), false);
  assert.equal(shopAssetsMatchProduct(spiritTone, [
    { ...asset("st019", "application/zip"), object_key: "ministry-shop/st019/../master.mp3" },
  ], bundle), false);
  assert.equal(shopAssetsMatchProduct(spiritTone, [
    { ...asset("st019", "application/zip"), size_bytes: "0" },
  ], bundle), false);
});

test("legacy paid MP3 releases are not converted to ZIP requirements", () => {
  const legacy = { id: "zRVSZ", kind: "Music" };
  assert.equal(shopAssetsMatchProduct(legacy, [asset("zRVSZ", "audio/mpeg")], bundle), true);
  assert.equal(shopAssetsMatchProduct(legacy, [asset("zRVSZ", "application/zip")], bundle), false);
});

test("existing praise-pack ZIP and books retain original accepted formats", () => {
  assert.equal(shopAssetsMatchProduct({ id: bundle, kind: "Music" },
    [asset(bundle, "application/zip")], bundle), true);
  assert.equal(shopAssetsMatchProduct({ id: "prayer", kind: "Book", requiredFileCount: 1 },
    [asset("prayer", "application/pdf")], bundle), true);
  assert.equal(shopAssetsMatchProduct({ id: "membership", kind: "Membership" },
    [asset("membership", "application/zip")], bundle), false);
});

test("no unknown catalog item may become purchasable", () => {
  assert.equal(shopAssetsMatchProduct(undefined, [asset("st019", "application/zip")], bundle), false);
});
