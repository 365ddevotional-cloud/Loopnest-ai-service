const AUDIO_SRC = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=healing-ambient-11038.mp3";

let audio: HTMLAudioElement | null = null;

function stopCurrent() {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {}
}

export function startNextTheme(volume = 0.3) {
  stopCurrent();

  if (!audio) {
    audio = new Audio(AUDIO_SRC);
    audio.crossOrigin = "anonymous";
  }

  audio.loop = true;
  audio.volume = volume;
  audio.currentTime = 0;

  const playPromise = audio.play();
  if (playPromise) {
    playPromise
      .then(() => {
        console.log("Audio started successfully");
      })
      .catch((err) => {
        console.warn("Audio play blocked:", err.message);
      });
  }
}

export function stopAmbient() {
  stopCurrent();
}
