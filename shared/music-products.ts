// Release-specific prices are server-owned, in USD cents.
export const heavenTrackSlugs = ["heaven-reigns-original", "heaven-reigns-instrumental", "heaven-reigns-remix"];
export const heavenBundleId = "heaven-reigns-bundle";
export const musicProducts = [
  { id: heavenTrackSlugs[0], title: "Heaven Reigns — Original", cents: 50, slugs: [heavenTrackSlugs[0]] },
  { id: heavenTrackSlugs[1], title: "Heaven Reigns — Instrumental", cents: 50, slugs: [heavenTrackSlugs[1]] },
  { id: heavenTrackSlugs[2], title: "Heaven Reigns — Remix", cents: 50, slugs: [heavenTrackSlugs[2]] },
  { id: heavenBundleId, title: "Heaven Reigns — Three-Track Bundle", cents: 100, slugs: heavenTrackSlugs },
];
export function getMusicProduct(id: string) { return musicProducts.find(p => p.id === id); }
export function isPaidMusicSlug(slug: string) { return heavenTrackSlugs.includes(slug); }
