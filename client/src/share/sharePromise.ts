interface PromiseShareTheme {
  bgGradient: [string, string, string];
  textColor: string;
  accentColor: string;
  quoteColor: string;
}

const SHARE_THEMES: PromiseShareTheme[] = [
  { bgGradient: ["#FFF8E1", "#FFE082", "#FFD54F"], textColor: "#3E2723", accentColor: "#8D6E63", quoteColor: "#D4A017" },
  { bgGradient: ["#F3E5F5", "#CE93D8", "#AB47BC"], textColor: "#1A0033", accentColor: "#7B1FA2", quoteColor: "#9C27B0" },
  { bgGradient: ["#E3F2FD", "#90CAF9", "#42A5F5"], textColor: "#0D2137", accentColor: "#1565C0", quoteColor: "#2196F3" },
  { bgGradient: ["#FFF3E0", "#FFAB91", "#FF7043"], textColor: "#3E1A00", accentColor: "#D84315", quoteColor: "#FF5722" },
  { bgGradient: ["#E8F5E9", "#A5D6A7", "#66BB6A"], textColor: "#1B3A1B", accentColor: "#2E7D32", quoteColor: "#4CAF50" },
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

  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, theme.bgGradient[0]);
  grad.addColorStop(0.5, theme.bgGradient[1]);
  grad.addColorStop(1, theme.bgGradient[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(200, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(880, 880, 250, 0, Math.PI * 2);
  ctx.fill();

  const pad = 80;
  drawRoundedRect(ctx, pad, pad, 1080 - pad * 2, 1080 - pad * 2, 40);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.accentColor;
  ctx.font = "bold 24px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GOD'S PROMISE FOR YOU", 540, 170);

  ctx.fillStyle = theme.quoteColor;
  ctx.globalAlpha = 0.2;
  ctx.font = "200px Georgia, serif";
  ctx.fillText("\u201C", 180, 350);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.textColor;
  ctx.font = "bold 48px 'Playfair Display', Georgia, serif";
  const headingLines = wrapText(ctx, heading, 800);
  let y = 340;
  for (const line of headingLines) {
    ctx.fillText(line, 540, y);
    y += 58;
  }

  ctx.font = "italic 36px 'DM Sans', Georgia, serif";
  ctx.fillStyle = theme.textColor;
  ctx.globalAlpha = 0.85;
  const scriptureLines = wrapText(ctx, `"${scripture}"`, 780);
  y += 30;
  for (const line of scriptureLines) {
    ctx.fillText(line, 540, y);
    y += 46;
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 30px 'DM Sans', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(`— ${reference}`, 540, y + 40);

  ctx.fillStyle = theme.accentColor;
  ctx.globalAlpha = 0.4;
  ctx.font = "16px 'DM Sans', sans-serif";
  ctx.fillText("From the 365DailyDevotional", 540, 1020);
  ctx.globalAlpha = 1;

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
