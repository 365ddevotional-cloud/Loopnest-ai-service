import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [productId, start, source, ...extra] = process.argv.slice(2);
if (!productId || !/^[A-Za-z0-9]+$/.test(productId) || !start || !/^\d+(\.\d+)?$/.test(start) || Number(start) !== 0 || !source || extra.length) {
  throw new Error("Usage: node script/make-ministry-shop-audio-preview.mjs PRODUCT_ID 0 LOCAL_MASTER_FILE (previews must start at the beginning)");
}
const root = fileURLToPath(new URL("../", import.meta.url));
const catalog = JSON.parse(await readFile(join(root, "client/src/data/ministry-shop-catalog.json"), "utf8"));
const product = catalog.find(item => item.id === productId && item.kind === "Music" && !item.replacedBy);
if (!product || productId === "x29Tw") throw new Error("Choose a single-track shop product ID.");

const master = await realpath(source);
const work = await mkdtemp(join(tmpdir(), "ministry-shop-clip-"));
try {
  const clip = join(work, "clip.mp3");
  const transcode = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-protocol_whitelist", "file,pipe",
    "-ss", start, "-i", master, "-map", "0:a:0", "-t", "45", "-map_metadata", "-1",
    "-af", "afade=t=in:d=0.15,afade=t=out:st=44.4:d=0.6",
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-q:a", "2", clip,
  ], { stdio: "inherit" });
  if (transcode.status !== 0) throw new Error("Could not create a clip from this local audio file.");

  const check = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,channels,sample_rate", "-of", "json", clip,
  ], { encoding: "utf8" });
  if (check.status !== 0) throw new Error("Could not verify the clip.");
  const probe = JSON.parse(check.stdout);
  const { duration, size } = probe.format;
  const audio = probe.streams?.[0];
  if (audio?.codec_name !== "mp3" || audio.channels !== 2 || Number(audio.sample_rate) !== 48000) {
    throw new Error("Preview must be a 48 kHz stereo MP3.");
  }
  if (Number(duration) < 44.9 || Number(duration) > 45.2) {
    throw new Error("Choose a start with at least 45 seconds remaining in the recording.");
  }
  if (Number(size) > 2_000_000) throw new Error("The 45-second clip exceeds the MP3 size limit.");

  const directory = join(root, "client/src/assets/shop-previews");
  await mkdir(directory, { recursive: true });
  const staged = join(directory, `.${productId}.${process.pid}.tmp`);
  try {
    await writeFile(staged, await readFile(clip), { flag: "wx" });
    await rename(staged, join(directory, `${productId}.mp3`));
  } finally {
    await rm(staged, { force: true });
  }
  console.log(`Created a 45-second stereo shop preview for ${product.title}.`);
} finally {
  await rm(work, { recursive: true, force: true });
}
