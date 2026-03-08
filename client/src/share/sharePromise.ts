interface PromiseShareTheme {
  name: string;
  drawBg: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  textColor: string;
  accentColor: string;
  quoteColor: string;
  brandColor: string;
}

function drawLightRays(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, count: number) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  const cx = w * 0.3;
  const cy = h * 0.15;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const len = Math.max(w, h) * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.lineTo(cx + Math.cos(angle + 0.04) * len, cy + Math.sin(angle + 0.04) * len);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftCircles(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  const circles = [
    { x: w * 0.2, y: h * 0.2, r: w * 0.25 },
    { x: w * 0.8, y: h * 0.75, r: w * 0.2 },
    { x: w * 0.5, y: h * 0.4, r: w * 0.15 },
  ];
  for (const c of circles) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const SHARE_THEMES: PromiseShareTheme[] = [
  {
    name: "sunrise",
    drawBg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#FF9A56");
      g.addColorStop(0.3, "#FF6B6B");
      g.addColorStop(0.6, "#C850C0");
      g.addColorStop(1, "#4158D0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawLightRays(ctx, w, h, "#ffffff", 16);
      drawSoftCircles(ctx, w, h, "#ffffff");
    },
    textColor: "#ffffff",
    accentColor: "#FFE0B2",
    quoteColor: "#ffffff",
    brandColor: "rgba(255,255,255,0.4)",
  },
  {
    name: "heavenClouds",
    drawBg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#89CFF0");
      g.addColorStop(0.3, "#B6D8F2");
      g.addColorStop(0.5, "#F0F4F8");
      g.addColorStop(0.75, "#E8D5B7");
      g.addColorStop(1, "#F5E6CC");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawSoftCircles(ctx, w, h, "#ffffff");
      drawLightRays(ctx, w, h, "#FFD700", 12);
    },
    textColor: "#1a2a3a",
    accentColor: "#0277BD",
    quoteColor: "#0288D1",
    brandColor: "rgba(2, 119, 189, 0.35)",
  },
  {
    name: "goldenRays",
    drawBg: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.8);
      g.addColorStop(0, "#FFF8DC");
      g.addColorStop(0.3, "#FFD700");
      g.addColorStop(0.6, "#DAA520");
      g.addColorStop(1, "#B8860B");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawLightRays(ctx, w, h, "#ffffff", 20);
    },
    textColor: "#3E2723",
    accentColor: "#795548",
    quoteColor: "#D4A017",
    brandColor: "rgba(121, 85, 72, 0.4)",
  },
  {
    name: "peacefulFlowers",
    drawBg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#FFDEE9");
      g.addColorStop(0.5, "#B5FFFC");
      g.addColorStop(1, "#E8F5E9");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawSoftCircles(ctx, w, h, "#E91E63");
      drawSoftCircles(ctx, w, h, "#4CAF50");
    },
    textColor: "#2E3440",
    accentColor: "#AD1457",
    quoteColor: "#C2185B",
    brandColor: "rgba(173, 20, 87, 0.35)",
  },
  {
    name: "royalLight",
    drawBg: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0c1445");
      g.addColorStop(0.3, "#1a237e");
      g.addColorStop(0.6, "#283593");
      g.addColorStop(1, "#3949AB");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawLightRays(ctx, w, h, "#B3E5FC", 14);
      drawSoftCircles(ctx, w, h, "#64B5F6");
    },
    textColor: "#E3F2FD",
    accentColor: "#90CAF9",
    quoteColor: "#64B5F6",
    brandColor: "rgba(144, 202, 249, 0.35)",
  },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function generatePromiseImage(
  heading: string,
  scripture: string,
  reference: string,
  themeIndex: number = 0
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  const theme = SHARE_THEMES[themeIndex % SHARE_THEMES.length];

  theme.drawBg(ctx, 1080, 1080);

  const pad = 70;
  drawRoundedRect(ctx, pad, pad, 1080 - pad * 2, 1080 - pad * 2, 40);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.accentColor;
  ctx.font = "bold 22px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GOD'S PROMISE FOR YOU", 540, 160);

  ctx.fillStyle = theme.quoteColor;
  ctx.globalAlpha = 0.15;
  ctx.font = "200px Georgia, serif";
  ctx.fillText("\u201C", 170, 340);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.textColor;
  ctx.font = "bold 46px 'Playfair Display', Georgia, serif";
  const headingLines = wrapText(ctx, heading, 800);
  let y = 330;
  for (const line of headingLines) {
    ctx.fillText(line, 540, y);
    y += 56;
  }

  ctx.font = "italic 34px Georgia, serif";
  ctx.fillStyle = theme.textColor;
  ctx.globalAlpha = 0.9;
  const scriptureLines = wrapText(ctx, `\u201C${scripture}\u201D`, 780);
  y += 30;
  for (const line of scriptureLines) {
    ctx.fillText(line, 540, y);
    y += 44;
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 28px 'DM Sans', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(`\u2014 ${reference}`, 540, y + 40);

  ctx.fillStyle = theme.brandColor;
  ctx.font = "15px 'DM Sans', sans-serif";
  ctx.fillText("From the 365DailyDevotional", 540, 1020);

  return canvas;
}

export async function sharePromiseAsImage(
  heading: string,
  scripture: string,
  reference: string,
  themeIndex: number = 0
): Promise<void> {
  const canvas = generatePromiseImage(heading, scripture, reference, themeIndex);

  const blob = await new window.Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return;

  const file = new File([blob], "gods-promise.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: heading,
        text: `${scripture} — ${reference}`,
        files: [file],
      });
      return;
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gods-promise.png";
  a.click();
  URL.revokeObjectURL(url);
}
