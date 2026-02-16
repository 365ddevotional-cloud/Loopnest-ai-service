export type CardTheme = "light" | "gold" | "blue" | "floral";

export interface ShareCardOptions {
  verseText: string;
  reference: string;
  translation: string;
  theme: CardTheme;
  recipientName?: string;
}

const THEMES: Record<CardTheme, { bg1: string; bg2: string; textColor: string; accentColor: string; borderColor: string }> = {
  light: { bg1: "#faf8f5", bg2: "#f0ece4", textColor: "#3d2c1e", accentColor: "#8b6f47", borderColor: "#d4c5a9" },
  gold: { bg1: "#f5e6c8", bg2: "#e8d5a3", textColor: "#4a3520", accentColor: "#b8860b", borderColor: "#c9a94e" },
  blue: { bg1: "#e8f0f8", bg2: "#d0e0f0", textColor: "#1a3050", accentColor: "#4682b4", borderColor: "#8ab0d4" },
  floral: { bg1: "#fdf2f8", bg2: "#fce7f3", textColor: "#4a1942", accentColor: "#a0527a", borderColor: "#d4a0c0" },
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

function drawFloralCorners(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const s = 60;

  const corners = [
    { x: 30, y: 30, sx: 1, sy: 1 },
    { x: w - 30, y: 30, sx: -1, sy: 1 },
    { x: 30, y: h - 30, sx: 1, sy: -1 },
    { x: w - 30, y: h - 30, sx: -1, sy: -1 },
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
    ctx.moveTo(8, s - 15);
    ctx.quadraticCurveTo(8, 8, s - 15, 8);
    ctx.stroke();
    ctx.restore();
  }
}

export async function generateGreetingCard({ verseText, reference, translation, theme, recipientName }: ShareCardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 800;
  canvas.height = 600;
  const t = THEMES[theme];

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, t.bg1);
  bg.addColorStop(1, t.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = t.borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  drawFloralCorners(ctx, canvas.width, canvas.height, t.borderColor);

  let yOffset = 80;

  if (recipientName) {
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillStyle = t.accentColor;
    ctx.textAlign = "center";
    ctx.fillText(`To: ${recipientName}`, canvas.width / 2, yOffset);
    yOffset += 40;
  }

  ctx.fillStyle = t.accentColor;
  ctx.font = "28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("\u201C", canvas.width / 2 - 280, yOffset + 15);

  ctx.fillStyle = t.textColor;
  ctx.font = "italic 22px Georgia, serif";

  const lines = wrapText(ctx, verseText, canvas.width - 140);
  const lineHeight = 34;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, yOffset + i * lineHeight);
  });

  const afterVerse = yOffset + lines.length * lineHeight + 10;

  ctx.fillStyle = t.accentColor;
  ctx.font = "28px Georgia, serif";
  ctx.fillText("\u201D", canvas.width / 2 + 280, afterVerse - 20);

  ctx.font = "bold 18px Georgia, serif";
  ctx.fillStyle = t.accentColor;
  ctx.fillText(`\u2014 ${reference} (${translation})`, canvas.width / 2, afterVerse + 20);

  ctx.font = "13px sans-serif";
  ctx.fillStyle = t.accentColor + "99";
  ctx.fillText("Shared via 365 Daily Devotional", canvas.width / 2, canvas.height - 40);

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
