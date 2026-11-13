/**
 * Stage 2 read-only reconciliation of the live SpiritTone song library and shop.
 * Usage:
 *   node script/audit-weekly-shop-catalog.mjs --library ./weekly-songs.json
 *   node script/audit-weekly-shop-catalog.mjs --url https://365dailydevotional.com/api/songs/library
 *
 * Produces an audit report on stdout. Does not create, merge, delete, publish,
 * or alter songs, shop products, recordings, payments, or customer entitlements.
 */
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../client/src/data/ministry-shop-catalog.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
if (args.length !== 2 || !["--library", "--url"].includes(args[0])) {
  console.error("Usage: node script/audit-weekly-shop-catalog.mjs (--library FILE.json | --url HTTPS_URL)");
  process.exit(2);
}
let library;
if (args[0] === "--library") {
  library = JSON.parse(await readFile(args[1], "utf8"));
} else {
  const url = new URL(args[1]);
  if (url.protocol !== "https:" || url.hostname !== "365dailydevotional.com" || url.pathname !== "/api/songs/library" || url.search || url.hash) {
    throw new Error("Only the public production song-library endpoint is supported.");
  }
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Song inventory unavailable: HTTP ${response.status}`);
  library = await response.json();
}
if (!Array.isArray(library) || library.some(s => !s || typeof s.id !== "number" || typeof s.title !== "string" || typeof s.slug !== "string")) {
  throw new Error("Expected an array of songs with numeric id, title, and slug.");
}
const normalize = s => s.normalize("NFKC").toLocaleLowerCase("en").replace(/[\p{P}\p{Z}]+/gu, " ").trim().replace(/\s+/g, " ");
const shopSongs = catalog.filter(p => p.kind === "Music" && !p.replacedBy && p.id !== "x29Tw");
const byTitle = new Map();
for (const p of shopSongs) {
  const k = normalize(p.title);
  const found = byTitle.get(k) || [];
  found.push({ id: p.id, title: p.title });
  byTitle.set(k, found);
}
const active = library.filter(s => s.isActive !== false);
const archived = library.filter(s => s.isActive === false);
const results = active.map(song => {
  const options = byTitle.get(normalize(song.title)) || [];
  const status = options.length === 0 ? "missing_from_shop_or_title_differs" : options.length === 1 ? "title_match_needs_recording_verification" : "ambiguous_multiple_shop_titles";
  return {
    weeklySongId: song.id, slug: song.slug, title: song.title,
    language: song.language || null, songType: song.songType || null,
    featuredWeekStart: song.featuredWeekStart || null, featuredWeekEnd: song.featuredWeekEnd || null,
    audioPresent: Boolean(song.audioUrl),
    status,
    shopCandidates: options,
  };
});
const titleGroups = [...byTitle.entries()].filter(([, values]) => values.length > 1).map(([normalizedTitle, products]) => ({ normalizedTitle, products }));
const report = {
  checkedAt: new Date().toISOString(),
  source: args[0] === "--url" ? "production-public-library" : "provided-library-export",
  notice: "Read-only audit. Title matches are NOT recording matches. Do not publish new products until original files, edition metadata, ownership, price, and protected downloads are verified.",
  totals: {
    shopSingleTracks: shopSongs.length,
    shopMusicBundles: catalog.filter(p => p.kind === "Music" && p.id === "x29Tw").length,
    liveLibrarySongs: library.length,
    activeLibrarySongs: active.length,
    archivedLibrarySongs: archived.length,
    exactTitleCandidates: results.filter(r => r.status === "title_match_needs_recording_verification").length,
    ambiguousTitleCandidates: results.filter(r => r.status === "ambiguous_multiple_shop_titles").length,
    unmatchedTitles: results.filter(r => r.status === "missing_from_shop_or_title_differs").length,
  },
  duplicateTitleShopGroups: titleGroups,
  activeSongs: results,
  archivedSongs: archived.map(s => ({ weeklySongId: s.id, slug: s.slug, title: s.title })),
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
