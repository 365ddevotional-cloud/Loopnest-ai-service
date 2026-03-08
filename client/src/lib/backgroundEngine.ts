const TOTAL_BACKGROUNDS = 50;
const BG_PATH = "/devotional-backgrounds";

const preloadedImages: Map<number, HTMLImageElement> = new Map();
const loadingPromises: Map<number, Promise<HTMLImageElement>> = new Map();

export function getBackgroundUrl(index: number): string {
  const num = ((index % TOTAL_BACKGROUNDS) + 1).toString().padStart(2, "0");
  return `${BG_PATH}/bg${num}.jpg`;
}

export function getRandomBgIndex(seed: number): number {
  return ((seed * 2654435761) >>> 0) % TOTAL_BACKGROUNDS;
}

export function loadBackgroundImage(index: number): Promise<HTMLImageElement> {
  if (preloadedImages.has(index)) {
    return Promise.resolve(preloadedImages.get(index)!);
  }
  if (loadingPromises.has(index)) {
    return loadingPromises.get(index)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      preloadedImages.set(index, img);
      loadingPromises.delete(index);
      resolve(img);
    };
    img.onerror = () => {
      loadingPromises.delete(index);
      reject(new Error(`Failed to load background ${index}`));
    };
    img.src = getBackgroundUrl(index);
  });
  loadingPromises.set(index, promise);
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
  overlay.addColorStop(0, "rgba(0,0,0,0.15)");
  overlay.addColorStop(0.5, "rgba(0,0,0,0.10)");
  overlay.addColorStop(1, "rgba(0,0,0,0.20)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);
}

export function isLightBackground(index: number): boolean {
  const lightIndices = [2, 7, 8, 17, 22, 23, 24, 31, 35, 42, 43, 44, 45];
  return lightIndices.includes(index % TOTAL_BACKGROUNDS);
}

export function getTextColors(bgIndex: number): { text: string; accent: string; button: string } {
  const light = isLightBackground(bgIndex);
  return {
    text: light ? "rgba(30,30,30,1)" : "rgba(255,255,255,1)",
    accent: light ? "rgba(60,60,60,0.85)" : "rgba(255,255,255,0.85)",
    button: light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
  };
}
