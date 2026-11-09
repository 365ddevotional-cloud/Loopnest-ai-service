import { musicRegions, type MusicPrices } from "./music-regions";

export const shopBundleId = "x29Tw";

const littleHeartsVolumePrices: Partial<Record<string, number>> = {
  US: 899,
  NG: 250000,
  GH: 2250,
};

export function ministryShopPrice(product: { id: string; kind: string; sourcePrice: string; replacedBy?: string[] }, country: string, prices: MusicPrices) {
  const region = musicRegions[country];
  if (!region || product.kind === "Membership" || product.replacedBy) return null;
  const local = prices[country];
  if (!local) return null;

  // Five singles must cost at least 25% more than Media's regional five-track offer.
  const songPrice = Math.max(Math.ceil(local.five / 4), Math.ceil(local.single * 1.1), country === "US" ? 99 : 0);
  const source = /^\$(\d+)\.(\d{2})$/.exec(product.sourcePrice);
  if (!source) return null;
  const sourceCents = Number(source[1]) * 100 + Number(source[2]);
  const isLittleHeartsVolume = product.id === "littleheartsoldtestament" || product.id === "littleheartsnewtestament";
  let amount = product.kind === "Music" && product.id !== shopBundleId
    ? songPrice
    : Math.ceil(sourceCents * local.single / prices.US.single);
  if (isLittleHeartsVolume) amount = littleHeartsVolumePrices[country] ?? amount;
  if (product.id === shopBundleId) amount = Math.max(amount, songPrice * 5);
  if (region.currency === "UGX") amount = Math.ceil(amount / 100) * 100;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99999999) return null;

  return { amount, currency: region.currency, country, stripeSupported: region.stripe };
}
