#!/usr/bin/env python3
"""Offline regression checks for buyer-ready SpiritTone ZIP packages."""
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "build-spirit-tone-package.py"
SPEC = importlib.util.spec_from_file_location("spirit_tone_package", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

SONG = {
    "title": "Test Original", "slug": "test-original",
    "lyrics": "Verse one\nChorus", "artist": "Test Artist",
    "producer": "Test Producer", "labelName": "SpiritTone Records",
    "scriptureReference": "Psalm 100:1", "language": "English",
    "copyrightNotice": "Test fixture; not for publication",
}

class SpiritTonePackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = tempfile.TemporaryDirectory()
        cls.master = Path(cls.fixture.name) / "genuine-stereo.mp3"
        command = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=46",
            "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=46",
            "-filter_complex", "[0:a][1:a]amerge=inputs=2[a]",
            "-map", "[a]", "-ac", "2", "-c:a", "libmp3lame", "-q:a", "6",
            str(cls.master),
        ]
        subprocess.run(command, check=True)

    @classmethod
    def tearDownClass(cls):
        cls.fixture.cleanup()

    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        self.song = self.root / "song.json"
        self.audio = self.root / "original.mp3"
        self.art = self.root / "cover.jpg"
        self.zip = self.root / "sale.zip"
        self.song.write_text(json.dumps(SONG), encoding="utf-8")
        shutil.copyfile(self.master, self.audio)
        self.art.write_bytes(bytes.fromhex("FFD8FFDB") + b"fixture-cover" + bytes.fromhex("FFD9"))

    def test_includes_all_files_and_preserves_originals(self):
        original_audio = self.audio.read_bytes()
        original_art = self.art.read_bytes()
        MODULE.build(self.song, self.audio, self.art, self.zip)
        with zipfile.ZipFile(self.zip) as pack:
            self.assertIsNone(pack.testzip())
            self.assertEqual(set(pack.namelist()), {
                "test-original/Full-Song.mp3",
                "test-original/Original-Artwork.jpg",
                "test-original/Lyrics.txt",
                "test-original/Song-Information.txt",
                "test-original/Package-Manifest.json",
            })
            self.assertEqual(pack.read("test-original/Full-Song.mp3"), original_audio)
            self.assertEqual(pack.read("test-original/Original-Artwork.jpg"), original_art)
            self.assertIn("Verse one", pack.read("test-original/Lyrics.txt").decode())
            self.assertIn("Psalm 100:1", pack.read("test-original/Song-Information.txt").decode())
            manifest = json.loads(pack.read("test-original/Package-Manifest.json"))
            self.assertEqual(manifest["master_audio_sha256"], MODULE.digest(self.audio))
        self.assertEqual(self.audio.read_bytes(), original_audio)
        self.assertEqual(self.art.read_bytes(), original_art)

    def test_rejects_missing_lyrics(self):
        self.song.write_text(json.dumps({**SONG, "lyrics": ""}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "lyrics"):
            MODULE.build(self.song, self.audio, self.art, self.zip)
        self.assertFalse(self.zip.exists())

    def test_instrumental_without_lyrics_uses_truthful_notice(self):
        self.song.write_text(json.dumps({**SONG, "songType": "Instrumental", "lyrics": ""}), encoding="utf-8")
        MODULE.build(self.song, self.audio, self.art, self.zip)
        with zipfile.ZipFile(self.zip) as pack:
            text = pack.read("test-original/Lyrics.txt").decode("utf-8")
            self.assertIn("no sung lyrics", text)
            self.assertNotIn("Verse one", text)

    def test_rejects_unsafe_slug(self):
        self.song.write_text(json.dumps({**SONG, "slug": "../../other"}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Slug"):
            MODULE.build(self.song, self.audio, self.art, self.zip)
        self.assertFalse(self.zip.exists())

    def test_legacy_leading_hyphen_slug_uses_unique_song_id(self):
        self.song.write_text(json.dumps({**SONG, "slug": "-rivers-of-living-water", "songId": 19}), encoding="utf-8")
        MODULE.build(self.song, self.audio, self.art, self.zip)
        with zipfile.ZipFile(self.zip) as pack:
            self.assertTrue(all(name.startswith("st019-rivers-of-living-water/") for name in pack.namelist()))
            manifest = json.loads(pack.read("st019-rivers-of-living-water/Package-Manifest.json"))
            self.assertEqual(manifest["song_id"], 19)

    def test_rejects_fake_stereo(self):
        mono = self.root / "mono.mp3"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                        "-i", str(self.audio), "-ac", "1", str(mono)], check=True)
        with self.assertRaisesRegex(ValueError, "two-channel"):
            MODULE.build(self.song, mono, self.art, self.zip)
        self.assertFalse(self.zip.exists())

    def test_rejects_disguised_artwork(self):
        self.art.write_bytes(b"This is not artwork.")
        with self.assertRaisesRegex(ValueError, "artwork"):
            MODULE.build(self.song, self.audio, self.art, self.zip)
        self.assertFalse(self.zip.exists())

    def test_rejects_missing_artwork(self):
        self.art.unlink()
        with self.assertRaisesRegex(ValueError, "artwork"):
            MODULE.build(self.song, self.audio, self.art, self.zip)

if __name__ == "__main__":
    unittest.main()
