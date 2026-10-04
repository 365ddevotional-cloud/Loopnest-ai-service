// Release-specific prices are server-owned, in USD cents.
export const heavenTrackSlugs = ["heaven-reigns-original", "heaven-reigns-instrumental", "heaven-reigns-remix"];
export const heavenBundleId = "heaven-reigns-bundle";
export const musicProducts = [
  { id: heavenTrackSlugs[0], title: "Heaven Reigns — Original", cents: 89, slugs: [heavenTrackSlugs[0]] },
  { id: heavenTrackSlugs[1], title: "Heaven Reigns — Instrumental", cents: 89, slugs: [heavenTrackSlugs[1]] },
  { id: heavenTrackSlugs[2], title: "Heaven Reigns — Remix", cents: 89, slugs: [heavenTrackSlugs[2]] },
  { id: heavenBundleId, title: "Heaven Reigns — Three-Track Bundle", cents: 189, slugs: heavenTrackSlugs },
];
export function getMusicProduct(id: string) {
  const fixed = musicProducts.find(p => p.id === id);
  if (fixed) return fixed;
  if (!id.startsWith("five:")) return undefined;
  const slugs = id.slice(5).split(",");
  if (slugs.length !== 5 || new Set(slugs).size !== 5 || slugs.some(s => !/^[a-z0-9-]{1,100}$/.test(s)) || slugs.join(",") !== [...slugs].sort().join(",")) return undefined;
  return { id, title: "Your Five-Song Collection", cents: fiveSongCollectionPriceCents, slugs };
}
export function isPaidMusicSlug(slug: string) { return heavenTrackSlugs.includes(slug); }

// Approved mix-and-match offer: five distinct tracks, including bundle tracks.
export const fiveSongCollectionPriceCents = 299;
