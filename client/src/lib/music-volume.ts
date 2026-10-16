/** Prefer the device's music-volume channel over a transient/recording session. */
type AudioBrowser = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  audioSession?: { type: string };
};

export function usesSystemMusicVolume(browser: AudioBrowser = navigator): boolean {
  return /iPad|iPhone|iPod/.test(browser.userAgent ?? '') ||
    (browser.platform === 'MacIntel' && (browser.maxTouchPoints ?? 0) > 1);
}

export function startMusicPlayback(audio: HTMLAudioElement, browser: AudioBrowser = navigator): Promise<void> {
  // Feature detection: older browsers continue to use ordinary native playback.
  try {
    if (browser.audioSession && browser.audioSession.type !== 'playback') {
      browser.audioSession.type = 'playback';
    }
  } catch { /* An unsupported session setting must never prevent playback. */ }
  // iPhone/iPad expose hardware volume, not our desktop slider. A persisted
  // desktop gain must not become an invisible second volume control on them.
  if (usesSystemMusicVolume(browser)) {
    try { audio.volume = 1; } catch { /* Some iOS versions make this read-only. */ }
  }
  return audio.play();
}
