/**
 * Offline end-to-end regression test of the actual production clip generator.
 * Uses synthetic audio, never customer music, and an isolated temporary repo.
 * Run: node script/test-ministry-shop-audio-preview.mjs
 * Requires ffmpeg and ffprobe on PATH.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const base = fileURLToPath(new URL("../", import.meta.url));
const sandbox = await mkdtemp(join(tmpdir(), "spirit-tone-preview-test-"));
function call(bin, args, expected = 0) {
  const result = spawnSync(bin, args, { encoding: "utf8", timeout: 60_000 });
  assert.equal(result.status, expected, `${bin} status ${result.status}: ${result.stderr || result.error}`);
  return result.stdout;
}
function info(file) {
  return JSON.parse(call("ffprobe", [
    "-v", "error", "-select_streams", "a:0", "-show_entries",
    "format=duration:stream=channels,sample_rate,codec_name",
    "-of", "json", file,
  ]));
}
const digest = data => createHash("sha256").update(data).digest("hex");

try {
  await mkdir(join(sandbox, "script"), { recursive: true });
  await mkdir(join(sandbox, "client/src/data"), { recursive: true });
  await cp(join(base, "script/make-ministry-shop-audio-preview.mjs"),
    join(sandbox, "script/make-ministry-shop-audio-preview.mjs"));
  await writeFile(join(sandbox, "client/src/data/ministry-shop-catalog.json"),
    JSON.stringify([{ id: "TEST01", kind: "Music", title: "Stereo Test Original", sourcePrice: "$1.49" }]));
  const master = join(sandbox, "original.mp3");
  // Distinct left and right tone, 50 s. ffmpeg generated source is a fixture only.
  call("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=50",
    "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=50",
    "-filter_complex", "[0:a][1:a]amerge=inputs=2[a]",
    "-map", "[a]", "-ac", "2", "-c:a", "libmp3lame", "-q:a", "5", master]);
  const sourceHash = digest(await readFile(master));
  const generator = join(sandbox, "script/make-ministry-shop-audio-preview.mjs");
  call(process.execPath, [generator, "TEST01", "0", master]);
  const output = join(sandbox, "client/src/assets/shop-previews/TEST01.mp3");
  const result = info(output);
  assert.equal(result.streams[0].channels, 2, "Preview must have two channels");
  assert.equal(Number(result.streams[0].sample_rate), 48000);
  assert.ok(Number(result.format.duration) >= 44.9 && Number(result.format.duration) <= 45.2,
    "Preview must be 45 seconds");
  assert.equal(digest(await readFile(master)), sourceHash, "Original master was changed");
  const previousOutputHash = digest(await readFile(output));

  // Invalid start times must never replace existing previews.
  const invalid = spawnSync(process.execPath, [generator, "TEST01", "5", master], { encoding: "utf8" });
  assert.notEqual(invalid.status, 0, "Nonzero start must be rejected");
  assert.equal(digest(await readFile(output)), previousOutputHash);

  const mono = join(sandbox, "mono.mp3");
  call("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=50",
    "-ac", "1", "-c:a", "libmp3lame", mono]);
  const rejected = spawnSync(process.execPath, [generator, "TEST01", "0", mono], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "Mono must not be advertised as original stereo");
  assert.equal(digest(await readFile(output)), previousOutputHash, "Rejected source altered preview");
  assert.ok((await stat(output)).size > 0);
  console.log("45-second preview: original stereo, full length, rejection safety — PASS");
} finally {
  await rm(sandbox, { recursive: true, force: true });
}
