const AUDIO_SRC = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=healing-ambient-11038.mp3";

export function createAndPlayAudio(existingAudio: HTMLAudioElement | null): HTMLAudioElement {
  if (existingAudio) {
    try {
      existingAudio.pause();
      existingAudio.currentTime = 0;
      existingAudio.src = "";
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
    audio.src = "";
  } catch {}
}
