export type ImageTheme = "parchment" | "royal" | "sunrise" | "charcoal";

export interface ShareImageOptions {
  verseText: string;
  reference: string;
  translation: string;
  theme?: ImageTheme;
}

const IMAGE_THEMES: Record<ImageTheme, {
  bg: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  textColor: string;
  refColor: string;
  quoteColor: string;
  brandColor: string;
}> = {
  parchment: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#faf6ee");
      g.addColorStop(0.5, "#f3ead8");
      g.addColorStop(1, "#ede2cc");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(139, 119, 80, 0.04)";
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    textColor: "#3d2c1e",
    refColor: "#8b6f47",
    quoteColor: "rgba(139, 111, 71, 0.12)",
    brandColor: "rgba(61, 44, 30, 0.35)",
  },
  royal: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, "#0a1628");
      g.addColorStop(0.4, "#142952");
      g.addColorStop(0.7, "#1a3a6e");
      g.addColorStop(1, "#0f2040");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    textColor: "#e8edf5",
    refColor: "#a8c4e8",
    quoteColor: "rgba(168, 196, 232, 0.08)",
    brandColor: "rgba(168, 196, 232, 0.4)",
  },
  sunrise: {
    bg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#ffecd2");
      g.addColorStop(0.35, "#fcb69f");
      g.addColorStop(0.65, "#f7a084");
      g.addColorStop(1, "#f09070");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    textColor: "#3e1f0d",
    refColor: "#6b3521",
    quoteColor: "rgba(62, 31, 13, 0.08)",
    brandColor: "rgba(62, 31, 13, 0.35)",
  },
  charcoal: {
    bg: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "#2a2a2a");
      g.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    textColor: "#e8e0d8",
    refColor: "#c9b896",
    quoteColor: "rgba(232, 224, 216, 0.05)",
    brandColor: "rgba(201, 184, 150, 0.4)",
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

export async function generateVerseImage({ verseText, reference, translation, theme = "parchment" }: ShareImageOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 1080;
  canvas.height = 1080;
  const w = canvas.width;
  const h = canvas.height;
  const t = IMAGE_THEMES[theme];

  t.bg(ctx, w, h);

  ctx.fillStyle = t.quoteColor;
  ctx.font = "280px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", 40, 240);
  ctx.textAlign = "right";
  ctx.fillText("\u201D", w - 40, h - 100);

  const pad = 120;
  const maxTextWidth = w - pad * 2;

  ctx.fillStyle = t.textColor;
  ctx.font = "italic 36px Georgia, serif";
  ctx.textAlign = "center";

  const lines = wrapText(ctx, verseText, maxTextWidth);
  const lineHeight = 54;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (h - totalTextHeight) / 2 - 30;

  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight);
  });

  const refY = startY + totalTextHeight + 50;
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillStyle = t.refColor;
  ctx.fillText(`\u2014 ${reference} (${translation})`, w / 2, refY);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = t.brandColor;
  ctx.fillText("365 Daily Devotional", w / 2, h - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

export async function shareAsImage(opts: ShareImageOptions): Promise<{ success: boolean; method: "share" | "download" }> {
  const blob = await generateVerseImage(opts);
  if (!blob) return { success: false, method: "download" };

  const file = new File([blob], `${opts.reference.replace(/[:\s]/g, "-")}.png`, { type: "image/png" });
  const text = `"${opts.verseText}"\n\n\u2014 ${opts.reference} (${opts.translation})\n\nShared from 365 Daily Devotional`;

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: opts.reference, text, files: [file] });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.reference.replace(/[:\s]/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: "download" };
}
