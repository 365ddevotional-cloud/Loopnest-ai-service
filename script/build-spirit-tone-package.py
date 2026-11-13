#!/usr/bin/env python3
"""Build a buyer-ready SpiritTone song ZIP from verified local masters.

No network calls, database changes, paid-content downloads, or uploads.
Requires exact original master audio and original artwork, plus a metadata
JSON export from the authoritative SpiritTone song record.

Usage:
  python3 script/build-spirit-tone-package.py \
    --song song-record.json --audio original-master.mp3 \
    --art original-artwork.jpg --output release.zip

Metadata must contain title, slug, lyrics, artist, producer, labelName,
scriptureReference. Other credits are included when available.
"""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def build(song_file, audio_file, art_file, destination):
    song = json.loads(Path(song_file).read_text(encoding="utf-8"))
    required = ("title", "slug", "artist", "producer", "labelName", "scriptureReference")
    if song.get("songType") != "Instrumental":
        required += ("lyrics",)
    missing = [key for key in required if not isinstance(song.get(key), str) or not song[key].strip()]
    if missing:
        raise ValueError("Incomplete authoritative song metadata: " + ", ".join(missing))

    slug = song["slug"]
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or len(slug) > 100:
        raise ValueError("Slug must be safe and unique to the exact recording/version")
    audio, art, output = Path(audio_file), Path(art_file), Path(destination)
    if audio.suffix.lower() != ".mp3" or art.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise ValueError("Expected original MP3 audio and JPG, PNG, or WebP artwork")
    if not audio.is_file() or not art.is_file() or audio.stat().st_size == 0 or art.stat().st_size == 0:
        raise ValueError("Original audio and artwork must exist and be nonempty")
    if output.resolve() in {audio.resolve(), art.resolve(), Path(song_file).resolve()}:
        raise ValueError("Cannot overwrite original sources")
    output.parent.mkdir(parents=True, exist_ok=True)

    fields = [
        ("Song", "title"), ("Artist", "artist"), ("Featured artist", "featuredArtist"),
        ("Record label", "labelName"), ("Producer", "producer"), ("Composer", "composer"),
        ("Lyricist", "lyricist"), ("Choir", "choir"), ("Instrumentalist", "instrumentalist"),
        ("Genre", "genre"), ("Language", "language"), ("Song type", "songType"),
        ("Scripture reference", "scriptureReference"), ("Scripture text", "scriptureText"),
        ("Release year", "releaseYear"), ("Copyright", "copyrightNotice"),
        ("Description", "description"),
    ]
    info = "\n".join(f"{label}: {song[key]}" for label, key in fields if song.get(key) not in (None, ""))
    manifest = {
        "song_slug": slug, "title": song["title"], "package_format": "spirit-tone-complete-v1",
        "master_audio_sha256": digest(audio), "original_artwork_sha256": digest(art),
    }
    folder = slug + "/"
    lyric_text = song.get("lyrics") or ""
    if song.get("songType") == "Instrumental" and not lyric_text.strip():
        lyric_text = "Instrumental recording — no sung lyrics. No lyrics were provided in the source record."
    entries = {
        folder + "Lyrics.txt": song["title"] + "\n\n" + lyric_text.strip() + "\n",
        folder + "Song-Information.txt": info + "\n",
        folder + "Package-Manifest.json": json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    }
    temporary = output.with_name(output.name + ".tmp")
    try:
        with zipfile.ZipFile(temporary, mode="w", allowZip64=True) as z:
            for name, body in entries.items():
                z.writestr(name, body.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED)
            # Audio and image are already compressed; copy originals without modifying quality.
            z.write(audio, folder + "Full-Song.mp3", compress_type=zipfile.ZIP_STORED)
            z.write(art, folder + "Original-Artwork" + art.suffix.lower(), compress_type=zipfile.ZIP_STORED)
        with zipfile.ZipFile(temporary) as z:
            if z.testzip() is not None:
                raise ValueError("ZIP integrity check failed")
            if len(z.namelist()) != 5:
                raise ValueError("Incomplete song package")
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    print(json.dumps({"package": str(output), "sha256": digest(output), "bytes": output.stat().st_size, "slug": slug}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--song", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--art", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    build(args.song, args.audio, args.art, args.output)
