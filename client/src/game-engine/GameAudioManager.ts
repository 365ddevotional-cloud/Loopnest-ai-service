export class GameAudioManager {
  private audio: HTMLAudioElement | null = null;
  private _isPlaying = false;
  private listeners: Set<(playing: boolean) => void> = new Set();

  constructor(src?: string) {
    if (src) {
      this.init(src);
    }
  }

  init(src: string) {
    if (this.audio) {
      this.cleanup();
    }
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = 0.3;
    this.audio.setAttribute("playsinline", "true");

    this.audio.addEventListener("play", () => {
      this._isPlaying = true;
      this.notify();
    });
    this.audio.addEventListener("pause", () => {
      this._isPlaying = false;
      this.notify();
    });
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  toggle(): void {
    if (!this.audio) return;

    if (this._isPlaying) {
      this.audio.pause();
    } else {
      this.audio.volume = 0.3;
      this.audio.play().catch((err) => console.log("Audio play failed", err));
    }
  }

  play(): void {
    if (!this.audio || this._isPlaying) return;
    this.audio.volume = 0.3;
    this.audio.play().catch((err) => console.log("Audio play failed", err));
  }

  pause(): void {
    if (!this.audio || !this._isPlaying) return;
    this.audio.pause();
  }

  setVolume(volume: number): void {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  subscribe(listener: (playing: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this._isPlaying));
  }

  cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this._isPlaying = false;
    this.listeners.clear();
  }
}
