/**
 * Decide whether the shop may sell one registered digital product.
 * This function reads no network/database state. The checkout code must ALSO
 * HEAD each private R2 object and verify its recorded SHA-256 metadata before
 * charging a buyer.
 */
export type ShopRegisteredAsset = {
  object_key: string;
  file_name: string;
  content_type: string;
  size_bytes: string;
};
export type ShopAssetProduct = {
  id: string;
  kind: string;
  requiredFileCount?: number;
  packageFormat?: string;
};
export function shopAssetsMatchProduct(
  item: ShopAssetProduct | undefined,
  assets: ShopRegisteredAsset[],
  bundleId: string,
): boolean {
  if (!item || item.kind === "Membership" || assets.length === 0) return false;
  if (item.requiredFileCount !== undefined && item.requiredFileCount !== assets.length) return false;
  const completeSong = item.kind === "Music" && item.packageFormat === "zip";
  const expectedType = item.kind === "Book" ? "application/pdf"
    : item.id === bundleId || completeSong ? "application/zip" : "audio/mpeg";
  if (completeSong && assets.length !== 1) return false;
  const pathPattern = new RegExp(`^ministry-shop/${item.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[a-f0-9]{64}$`);
  return assets.every(asset =>
    asset.content_type === expectedType &&
    pathPattern.test(asset.object_key) &&
    typeof asset.file_name === "string" && asset.file_name.length > 0 &&
    Number.isSafeInteger(Number(asset.size_bytes)) && Number(asset.size_bytes) > 0
  );
}
