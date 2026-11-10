import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [productId, start, source, ...extra] = process.argv.slice(2);
if (!productId || !/^[A-Za-z0-9]+$/.test(productId) || !start || !/^\d+(\.\d+)?$/.test(start) || !source || extra.length) {
  throw new Error("Usage: node script/make-ministry-shop-audio-preview.mjs PRODUCT_ID START_SECONDS LOCAL_MASTER_FILE");
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
    "-ss", start, "-i", master, "-map", "0:a:0", "-t", "30", "-map_metadata", "-1",
    "-af", "afade=t=in:d=0.15,afade=t=out:st=29.4:d=0.6", "-c:a", "libmp3lame", "-b:a", "64k", clip,
  ], { stdio: "inherit" });
  if (transcode.status !== 0) throw new Error("Could not create a clip from this local audio file.");

  const check = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration,size", "-of", "json", clip,
  ], { encoding: "utf8" });
  if (check.status !== 0) throw new Error("Could not verify the clip.");
  const { duration, size } = JSON.parse(check.stdout).format;
  if (Number(duration) < 29.9 || Number(duration) > 30.15 || Number(size) > 260_000) {
    throw new Error("Choose a start with at least 30 seconds remaining in the recording.");
  }

  const directory = join(root, "client/src/assets/shop-previews");
  await mkdir(directory, { recursive: true });
  const staged = join(directory, `.${productId}.${process.pid}.tmp`);
  try {
    await writeFile(staged, await readFile(clip), { flag: "wx" });
    await rename(staged, join(directory, `${productId}.mp3`));
  } finally {
    await rm(staged, { force: true });
  }
  console.log(`Created a 30-second shop preview for ${product.title}.`);
} finally {
  await rm(work, { recursive: true, force: true });
}
