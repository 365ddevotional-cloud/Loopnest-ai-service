import { loadBackgroundImage, getRandomBgIndex, drawCanvasBackground } from "@/lib/backgroundEngine";

export type CardTheme = "parchment" | "royal" | "sunrise" | "charcoal";

export type CardTitle = "" | "Be Encouraged" | "God's Word for You" | "Daily Promise";

export interface ShareCardOptions {
  verseText: string;
  reference: string;
  translation: string;
  theme: CardTheme;
  recipientName?: string;
  senderName?: string;
  title?: CardTitle;
  fontSize?: number;
  textColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  textOutline?: boolean;
}

const THEME_SEED: Record<CardTheme, number> = {
  parchment: 5,
  royal: 20,
  sunrise: 1,
  charcoal: 34,
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current + (current ? " " : "") + word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCornerAccents(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const s = 50;
  const m = 30;

  const corners = [
    { x: m, y: m, sx: 1, sy: 1 },
    { x: w - m, y: m, sx: -1, sy: 1 },
    { x: m, y: h - m, sx: 1, sy: -1 },
    { x: w - m, y: h - m, sx: -1, sy: -1 },
  ];

  for (const c of corners) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.sx, c.sy);
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, s - 12);
    ctx.quadraticCurveTo(6, 6, s - 12, 6);
    ctx.stroke();
    ctx.restore();
  }
}

export async function generateGreetingCard({ verseText, reference, translation, theme, recipientName, senderName, title, fontSize = 28, textColor = "#ffffff", isBold = false, isItalic = false, textOutline = false }: ShareCardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 1080;
  canvas.height = 1080;
  const w = canvas.width;
  const h = canvas.height;

  const seed = THEME_SEED[theme];
  const bgIndex = getRandomBgIndex(seed);
  let canvasTainted = false;
  try {
    const img = await loadBackgroundImage(bgIndex);
    drawCanvasBackground(ctx, img, w, h);
    try { canvas.toDataURL(); } catch { canvasTainted = true; }
  } catch {
    canvasTainted = true;
  }
  if (canvasTainted) {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#2c1810");
    g.addColorStop(0.5, "#1a0f2e");
    g.addColorStop(1, "#0d1117");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  const bm = 40;
  ctx.strokeRect(bm, bm, w - bm * 2, h - bm * 2);

  drawCornerAccents(ctx, w, h, "rgba(255,255,255,0.3)");

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 6;
  let yPos = 160;

  if (title) {
    ctx.font = "bold 36px Georgia, serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, w / 2, yPos);
    yPos += 60;
  }

  if (recipientName) {
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`To: ${recipientName}`, w / 2, yPos);
    yPos += 50;
  }

  const maxTextWidth = w - 180;
  const fontWeight = isBold ? "800" : "600";
  const fontStyle = isItalic ? "italic " : "";
  const bottomReserve = senderName ? 220 : 180;
  const availableSpace = h - yPos - bottomReserve;

  let activeFontSize = fontSize;
  let lines: string[];
  let lineHeight: number;
  let totalTextHeight: number;

  while (activeFontSize >= 16) {
    ctx.font = `${fontStyle}${fontWeight} ${activeFontSize}px Georgia, serif`;
    lines = wrapText(ctx, verseText, maxTextWidth);
    lineHeight = Math.round(activeFontSize * 1.4);
    totalTextHeight = lines.length * lineHeight;
    if (totalTextHeight <= availableSpace) break;
    activeFontSize -= 2;
  }

  lines = lines!;
  lineHeight = lineHeight!;
  totalTextHeight = totalTextHeight!;

  ctx.font = `${fontStyle}${fontWeight} ${activeFontSize}px Georgia, serif`;
  ctx.fillStyle = textColor;
  if (textOutline) {
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 2;
  }

  const textStartY = yPos + Math.max(0, (availableSpace - totalTextHeight) / 2);

  lines.forEach((line, i) => {
    const ly = textStartY + i * lineHeight;
    if (textOutline) ctx.strokeText(line, w / 2, ly);
    ctx.fillText(line, w / 2, ly);
  });

  const refY = textStartY + totalTextHeight + 45;
  ctx.font = "600 22px Georgia, serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  if (textOutline) {
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeText(`\u2014 ${reference} (${translation})`, w / 2, refY);
  }
  ctx.fillText(`\u2014 ${reference} (${translation})`, w / 2, refY);

  if (senderName) {
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`From: ${senderName}`, w / 2, refY + 50);
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "transparent";
  ctx.lineWidth = 0;
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Shared from 365 Daily Devotional", w / 2, h - 55);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

export async function shareAsCard(opts: ShareCardOptions): Promise<{ success: boolean; method: "share" | "download" }> {
  const blob = await generateGreetingCard(opts);
  if (!blob) return { success: false, method: "download" };

  const file = new File([blob], `greeting-${opts.reference.replace(/[:\s]/g, "-")}.png`, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `${opts.reference} Greeting Card`, files: [file] });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `greeting-${opts.reference.replace(/[:\s]/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: "download" };
}
