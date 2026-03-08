export type CardTheme = "parchment" | "royal" | "sunrise" | "charcoal";

export type CardTitle = "" | "Be Encouraged" | "God's Word for You" | "Daily Promise";

export interface ShareCardOptions {
  verseText: string;
  reference: string;
  translation: string;
  theme: CardTheme;
  recipientName?: string;
  title?: CardTitle;
}

function drawLightRays(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, count: number) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  const cx = w * 0.3;
  const cy = h * 0.1;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const len = Math.max(w, h) * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.lineTo(cx + Math.cos(angle + 0.03) * len, cy + Math.sin(angle + 0.03) * len);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

function drawTexture(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, density: number) {
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const THEMES: Record<CardTheme, {
  bg: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  textColor: string;
  accentColor: string;
  borderColor: string;
  titleColor: string;
  brandColor: string;
}> = {
  parchment: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#faf6ee");
      g.addColorStop(0.3, "#f3ead8");
      g.addColorStop(0.6, "#ede2cc");
      g.addColorStop(1, "#e8d8b8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawTexture(ctx, w, h, "#8b7750", 120);
      drawLightRays(ctx, w, h, "#FFD700", 10);
      ctx.save();
      ctx.globalAlpha = 0.06;
      const rg = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.5);
      rg.addColorStop(0, "#FFD700");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
    textColor: "#3d2c1e",
    accentColor: "#8b6f47",
    borderColor: "#d4c5a9",
    titleColor: "#6b5530",
    brandColor: "rgba(139, 111, 71, 0.4)",
  },
  royal: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, "#0a1628");
      g.addColorStop(0.3, "#142952");
      g.addColorStop(0.6, "#1a3a6e");
      g.addColorStop(1, "#0f2040");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawLightRays(ctx, w, h, "#B3E5FC", 14);
      ctx.save();
      ctx.globalAlpha = 0.08;
      const rg = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.4);
      rg.addColorStop(0, "#64B5F6");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
    textColor: "#e8edf5",
    accentColor: "#a8c4e8",
    borderColor: "rgba(168, 196, 232, 0.3)",
    titleColor: "#c4d8f0",
    brandColor: "rgba(168, 196, 232, 0.35)",
  },
  sunrise: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#FF9A56");
      g.addColorStop(0.35, "#FF6B6B");
      g.addColorStop(0.65, "#C850C0");
      g.addColorStop(1, "#4158D0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawLightRays(ctx, w, h, "#ffffff", 16);
      ctx.save();
      ctx.globalAlpha = 0.1;
      const rg = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.6);
      rg.addColorStop(0, "#FFD700");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
    textColor: "#ffffff",
    accentColor: "#FFE0B2",
    borderColor: "rgba(255, 255, 255, 0.25)",
    titleColor: "#FFF3E0",
    brandColor: "rgba(255, 255, 255, 0.4)",
  },
  charcoal: {
    bg: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "#2a2a2a");
      g.addColorStop(0.5, "#222222");
      g.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawTexture(ctx, w, h, "#ffffff", 80);
      ctx.save();
      ctx.globalAlpha = 0.06;
      const rg = ctx.createRadialGradient(w * 0.4, h * 0.25, 0, w * 0.4, h * 0.25, w * 0.5);
      rg.addColorStop(0, "#FFD700");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
    textColor: "#e8e0d8",
    accentColor: "#c9b896",
    borderColor: "rgba(201, 184, 150, 0.25)",
    titleColor: "#d4c8a8",
    brandColor: "rgba(201, 184, 150, 0.35)",
  },
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

export async function generateGreetingCard({ verseText, reference, translation, theme, recipientName, title }: ShareCardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 1080;
  canvas.height = 1080;
  const w = canvas.width;
  const h = canvas.height;
  const t = THEMES[theme];

  t.bg(ctx, w, h);

  ctx.strokeStyle = t.borderColor;
  ctx.lineWidth = 3;
  const bm = 40;
  ctx.strokeRect(bm, bm, w - bm * 2, h - bm * 2);

  drawCornerAccents(ctx, w, h, t.borderColor);

  ctx.textAlign = "center";
  let yPos = 160;

  if (title) {
    ctx.font = "bold 34px Georgia, serif";
    ctx.fillStyle = t.titleColor;
    ctx.fillText(title, w / 2, yPos);
    yPos += 55;
  }

  if (recipientName) {
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillStyle = t.accentColor;
    ctx.fillText(`To: ${recipientName}`, w / 2, yPos);
    yPos += 50;
  }

  const maxTextWidth = w - 180;
  ctx.font = "italic 30px Georgia, serif";
  ctx.fillStyle = t.textColor;

  const lines = wrapText(ctx, verseText, maxTextWidth);
  const lineHeight = 46;
  const totalTextHeight = lines.length * lineHeight;

  const availableSpace = h - yPos - 180;
  const textStartY = yPos + Math.max(0, (availableSpace - totalTextHeight) / 2);

  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, textStartY + i * lineHeight);
  });

  const refY = textStartY + totalTextHeight + 45;
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillStyle = t.accentColor;
  ctx.fillText(`\u2014 ${reference} (${translation})`, w / 2, refY);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = t.brandColor;
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
