import { devotionalBackgrounds } from "@/constants/devotionalBackgrounds";

const TOTAL_BACKGROUNDS = devotionalBackgrounds.length;

const preloadedImages: Map<number, HTMLImageElement> = new Map();
const loadingPromises: Map<number, Promise<HTMLImageElement>> = new Map();

export function getBackgroundUrl(index: number): string {
  return devotionalBackgrounds[((index % TOTAL_BACKGROUNDS) + TOTAL_BACKGROUNDS) % TOTAL_BACKGROUNDS];
}

export function getRandomBgIndex(seed: number): number {
  return ((seed * 2654435761) >>> 0) % TOTAL_BACKGROUNDS;
}

export function loadBackgroundImage(index: number): Promise<HTMLImageElement> {
  const normalizedIndex = ((index % TOTAL_BACKGROUNDS) + TOTAL_BACKGROUNDS) % TOTAL_BACKGROUNDS;
  if (preloadedImages.has(normalizedIndex)) {
    return Promise.resolve(preloadedImages.get(normalizedIndex)!);
  }
  if (loadingPromises.has(normalizedIndex)) {
    return loadingPromises.get(normalizedIndex)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      preloadedImages.set(normalizedIndex, img);
      loadingPromises.delete(normalizedIndex);
      resolve(img);
    };
    img.onerror = () => {
      loadingPromises.delete(normalizedIndex);
      reject(new Error(`Failed to load background ${normalizedIndex}`));
    };
    img.src = getBackgroundUrl(normalizedIndex);
  });
  loadingPromises.set(normalizedIndex, promise);
  return promise;
}

export function preloadAhead(currentSeed: number, count: number = 5): void {
  for (let i = 0; i < count; i++) {
    const idx = getRandomBgIndex(currentSeed + i);
    loadBackgroundImage(idx).catch(() => {});
  }
}

export function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);

  const overlay = ctx.createLinearGradient(0, 0, 0, h);
  overlay.addColorStop(0, "rgba(0,0,0,0.25)");
  overlay.addColorStop(0.5, "rgba(0,0,0,0.20)");
  overlay.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);
}

export function isLightBackground(index: number): boolean {
  return false;
}

export function getTextColors(bgIndex: number): { text: string; accent: string; button: string } {
  return {
    text: "rgba(255,255,255,1)",
    accent: "rgba(255,255,255,0.85)",
    button: "rgba(255,255,255,0.2)",
  };
}
