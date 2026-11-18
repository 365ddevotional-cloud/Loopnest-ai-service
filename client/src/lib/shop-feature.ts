export const SHOP_FEATURE_START = Date.UTC(2026, 10, 18);
export const SHOP_FEATURE_INTERVAL_MS = 4 * 24 * 60 * 60 * 1000;

export const featuredBooks = [
  { id: "dfe85b71e2614bd99676e28960a1a6a0", message: "Want a deeper, more confident prayer life? Explore biblical prayers with practical guidance for everyday life." },
  { id: "350fd530b3184b79a60cf6d87aea9e22", message: "Turn a useful skill into a clear client offer. Explore ten worked business opportunities, sample prompts and quality checks." },
  { id: "4f28ec864bd94f42a9e6730ed62cece5", message: "Build a home where correction teaches, conversations matter and children grow in grace and responsibility." },
  { id: "4dc651f5e23c45ba8fdc51ce76e24c07", message: "Discover what Ephesians teaches about belonging, forgiveness and your shared identity in Christ." },
  { id: "forgivingwithwisdom", message: "Explore forgiveness alongside wise boundaries, honest repair and the patient rebuilding of trust." },
  { id: "58793ac4d8674b75a8133e2155be5369", message: "Bring clarity to household money with worked examples, payment planning and practical stewardship." },
  { id: "b72a916fefc04e9bbe513321a73a9436", message: "Begin again with grace. Build realistic habits and learn how to return after an interruption or setback." },
  { id: "homeschoolingwithpurpose", message: "Shape a workable learning rhythm with thoughtful planning, practical exercises and space for your child's needs." },
  { id: "ca1b6edd72b64b469d81956f03c4b288", message: "What changes when someone feels truly heard? Practice thoughtful questions and dependable follow-through." },
  { id: "97b5261326284e88bb3bb0f27bc991bf", message: "Strengthen ordinary family life through peaceful words, shared responsibilities and practical care." },
  { id: "practicingthanksgiving", message: "Make room for gratitude in ordinary days and difficult seasons, without pretending that hardship has disappeared." },
  { id: "0183da3c54574347b827bf367643613d", message: "Prepare requests, encouragement and difficult conversations with truth, clarity and care." },
  { id: "servantleadershipforministryteams", message: "Lead with clear priorities, supported delegation and thoughtful follow-up. Includes practical tools for ministry teams." },
  { id: "2b57c7fba656483bb8bc1359ba509200", message: "Explore the gift of eternal life, the ground of assurance and hope for everyday Christian living." },
];

export function getShopFeature(now: number, publishedIds: Set<string>) {
  const cycle = Math.max(0, Math.floor((now - SHOP_FEATURE_START) / SHOP_FEATURE_INTERVAL_MS));
  for (let offset = 0; offset < featuredBooks.length; offset++) {
    const item = featuredBooks[(cycle + offset) % featuredBooks.length];
    if (publishedIds.has(item.id)) return item;
  }
  return undefined;
}
