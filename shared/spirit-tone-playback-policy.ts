/**
 * Server-owned playback decision. Never grant free archived full playback
 * based on client song IDs, browser clock, cookies, or query parameters.
 */
export type PreviewManifestEntry = {
  songId: number;
  objectKey: string;
  sha256: string;
  durationMs: number;
  channels: number;
  sampleRate: number;
};
export type PlaybackDecision =
  | { kind: "full" }
  | { kind: "preview"; objectKey: string }
  | { kind: "unavailable"; reason: string };

export function getSpiritTonePlaybackDecision(input: {
  enforcementRequested: boolean;
  mastersPrivateConfirmed: boolean;
  isFeatured: boolean;
  songId: number;
  preview?: PreviewManifestEntry;
}): PlaybackDecision {
  if (!input.enforcementRequested || input.isFeatured) return { kind: "full" };
  // Misconfiguration fails closed. No full-recording redirect is permitted
  // while the archived-playback gate is requested but not ready.
  if (!input.mastersPrivateConfirmed) {
    return { kind: "unavailable", reason: "Master recordings require private storage before archive preview enforcement." };
  }
  const p = input.preview;
  if (!p || p.songId !== input.songId ||
      !/^spirit-tone-previews\/[0-9]+\/[a-f0-9]{64}\.mp3$/.test(p.objectKey) ||
      p.sha256 !== p.objectKey.match(/([a-f0-9]{64})\.mp3$/)?.[1] ||
      p.durationMs < 44900 || p.durationMs > 45150 ||
      p.channels !== 2 || p.sampleRate !== 48000) {
    return { kind: "unavailable", reason: "No verified 45-second stereo preview exists." };
  }
  return { kind: "preview", objectKey: p.objectKey };
}
