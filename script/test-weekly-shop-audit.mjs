import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./audit-weekly-shop-catalog.mjs", import.meta.url));
const temp = await mkdtemp(join(tmpdir(), "weekly-shop-audit-"));
try {
  const exportPath = join(temp, "sanitized-admin-inventory.json");
  await writeFile(exportPath, JSON.stringify({
    source: "365 Ministry Shop admin reconciliation",
    totals: { allSongs: 4, activeSongs: 3, archivedSongs: 1 },
    songs: [
      { songId: 19, slug: "-rivers-of-living-water", title: "Rivers of Living Water", songType: "Message", active: true, audioReady: true, lyricsReady: true, artworkReady: true },
      { songId: 22, slug: "rivers-of-living-water", title: "Rivers of Living Water", songType: "Vocal", active: true, audioReady: true, lyricsReady: true, artworkReady: true },
      { songId: 35, slug: "the-burning-bush-is-calling-combined-instrumental", title: "The Burning Bush Is Calling (Combined Instrumental)", songType: "Instrumental", active: true, audioReady: true, lyricsReady: false, artworkReady: true },
      { songId: 100, slug: "archived-example", title: "Archived Example", active: false, audioReady: true, lyricsReady: true, artworkReady: false },
    ],
  }));
  const run = spawnSync(process.execPath, [script, "--library", exportPath], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.source, "authenticated-admin-inventory-export");
  assert.equal(report.totals.activeLibrarySongs, 3);
  assert.equal(report.totals.archivedLibrarySongs, 1);
  assert.equal(report.duplicateSourceTitleGroups.length, 1);
  assert.deepEqual(report.duplicateSourceTitleGroups[0].entries.map(x => x.songId), [19, 22]);
  assert.deepEqual(report.activeSongs.map(x => x.suggestedShopId), ["st019", "st022", "st035"]);
  assert.ok(report.activeSongs.every(x => x.safeToPublish === false));
  assert.equal(report.activeSongs[2].lyricsPresent, false);
  assert.equal(report.activeSongs[0].audioPresent, true);
  assert.equal(report.archivedSongs[0].weeklySongId, 100);
  console.log("Stage 2 admin-export reconciliation test — PASS");
} finally {
  await rm(temp, { recursive: true, force: true });
}
