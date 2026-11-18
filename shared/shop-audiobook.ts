export type ReaderParagraph = { id: string; text: string; heading?: boolean; page?: number };
export type ReaderEdition = { id: string; productId: string; title: string; author?: string; paragraphs: ReaderParagraph[]; audioOwned: boolean; voice: string; position?: { paragraphId: string; seconds: number; speed: number } };
export const AUDIO_UPGRADE_CENTS = 299;
export const AUDIO_VOICE = "en-US-Chirp3-HD-Charon";
export const AUDIO_VOICE_LABEL = "English · US · Male";
export type ShopPurchaseKind = "ebook" | "read-listen" | "audio";
export function audioTotal(bookAmount: number, kind: ShopPurchaseKind, currency: string) {
  // Start with a single USD audio price. Never silently convert a regional price
  // using a guessed exchange rate, or add dollars to another currency's cents.
  if (currency !== "USD" || !Number.isSafeInteger(bookAmount) || bookAmount <= 0) return null;
  return kind === "audio" ? AUDIO_UPGRADE_CENTS : kind === "read-listen" ? bookAmount + AUDIO_UPGRADE_CENTS : bookAmount;
}
export function validReaderParagraphs(paragraphs: ReaderParagraph[]) {
  const ids = new Set<string>();
  return paragraphs.length >= 1 && paragraphs.length <= 5000 && paragraphs.every(p => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id) || ids.has(p.id) || !p.text.trim() || new TextEncoder().encode(p.text).length > 4500) return false;
    ids.add(p.id); return true;
  }) && paragraphs.reduce((sum,p) => sum + p.text.length,0) <= 500000;
}

export function audioOwnership<T extends {productId:string;readerEditionId?:string;purchaseKind?:string;status:string}>(productId:string, editionId:string|undefined, orders:T[] = []) {
  if(!editionId)return {ownedBook:undefined as T|undefined,ownedAudio:false};
  const matching=orders.filter(o=>o.productId===productId && o.readerEditionId===editionId && o.status==='paid');
  return {ownedBook:matching.find(o=>o.purchaseKind!=='audio'),ownedAudio:matching.some(o=>o.purchaseKind==='audio' || o.purchaseKind==='read-listen')};
}
