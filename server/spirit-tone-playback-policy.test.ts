import assert from "node:assert/strict";
import test from "node:test";
import { getSpiritTonePlaybackDecision } from "../shared/spirit-tone-playback-policy";

const sha = "b".repeat(64);
const clip = {
  songId: 19, objectKey: `spirit-tone-previews/19/${sha}.mp3`,
  sha256: sha, durationMs: 45000, channels: 2, sampleRate: 48000,
};

test("enforcement off preserves the existing music player's full-song behavior", () => {
  assert.deepEqual(getSpiritTonePlaybackDecision({
    enforcementRequested: false, mastersPrivateConfirmed: false,
    isFeatured: false, songId: 19,
  }), { kind: "full" });
});

test("the server's actual current featured song remains fully playable", () => {
  assert.deepEqual(getSpiritTonePlaybackDecision({
    enforcementRequested: true, mastersPrivateConfirmed: true,
    isFeatured: true, songId: 19,
  }), { kind: "full" });
});

test("older songs use only verified fixed-length stereo preview objects", () => {
  assert.deepEqual(getSpiritTonePlaybackDecision({
    enforcementRequested: true, mastersPrivateConfirmed: true,
    isFeatured: false, songId: 19, preview: clip,
  }), { kind: "preview", objectKey: clip.objectKey });
});

test("old masters cannot be publicly redirected if private migration is incomplete", () => {
  const r = getSpiritTonePlaybackDecision({
    enforcementRequested: true, mastersPrivateConfirmed: false,
    isFeatured: false, songId: 19, preview: clip,
  });
  assert.equal(r.kind, "unavailable");
});

test("missing clips, wrong song IDs, tampered hashes and incorrectly encoded clips fail closed", () => {
  for (const preview of [
    undefined,
    { ...clip, songId: 22 },
    { ...clip, sha256: "a".repeat(64) },
    { ...clip, durationMs: 60000 },
    { ...clip, channels: 1 },
    { ...clip, sampleRate: 44100 },
    { ...clip, objectKey: "../../original.mp3" },
  ]) {
    const decision = getSpiritTonePlaybackDecision({
      enforcementRequested: true, mastersPrivateConfirmed: true,
      isFeatured: false, songId: 19, preview,
    });
    assert.equal(decision.kind, "unavailable", JSON.stringify(preview));
  }
});
