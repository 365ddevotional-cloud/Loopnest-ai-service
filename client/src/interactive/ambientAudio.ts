const AUDIO_SRC = "/audio/ambient-worship.wav";

export function createAndPlayAudio(existingAudio: HTMLAudioElement | null): HTMLAudioElement {
  if (existingAudio) {
    try {
      existingAudio.pause();
      existingAudio.currentTime = 0;
    } catch {}
  }

  const audio = new Audio(AUDIO_SRC);
  audio.loop = true;
  audio.volume = 0.3;

  audio.play()
    .then(() => {
      console.log("Audio started successfully");
    })
    .catch((err) => {
      console.log("Audio blocked", err);
    });

  return audio;
}

export function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}
