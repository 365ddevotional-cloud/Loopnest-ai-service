import { loadBackgroundImage, getRandomBgIndex, drawCanvasBackground } from "@/lib/backgroundEngine";

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

export async function generatePromiseImage(
  heading: string,
  scripture: string,
  reference: string,
  themeIndex: number = 0
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  const w = 1080, h = 1080;

  const bgIndex = getRandomBgIndex(themeIndex);
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
    g.addColorStop(0, "#FF9A56");
    g.addColorStop(0.5, "#C850C0");
    g.addColorStop(1, "#4158D0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const pad = 60;
  drawRoundedRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 30);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "bold 22px 'DM Sans', sans-serif";
  ctx.fillText("GOD'S PROMISE FOR YOU", w / 2, 150);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.font = "200px Georgia, serif";
  ctx.fillText("\u201C", 160, 340);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px 'Playfair Display', Georgia, serif";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 8;
  const headingLines = wrapText(ctx, heading, 800);
  let y = 320;
  for (const line of headingLines) {
    ctx.fillText(line, w / 2, y);
    y += 50;
  }

  ctx.font = "600 28px Georgia, serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 6;
  const scriptureLines = wrapText(ctx, `\u201C${scripture}\u201D`, 780);
  y += 35;
  for (const line of scriptureLines) {
    ctx.fillText(line, w / 2, y);
    y += 44;
  }

  ctx.shadowBlur = 4;
  ctx.font = "600 22px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`\u2014 ${reference}`, w / 2, y + 40);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "14px 'DM Sans', sans-serif";
  ctx.fillText("From the 365DailyDevotional", w / 2, 1030);

  return canvas;
}

export async function sharePromiseAsImage(
  heading: string,
  scripture: string,
  reference: string,
  themeIndex: number = 0
): Promise<void> {
  const canvas = await generatePromiseImage(heading, scripture, reference, themeIndex);

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
