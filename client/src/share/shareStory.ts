export interface ShareStoryOptions {
  verseText: string;
  reference: string;
  translation: string;
}

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

export async function generateStoryImage({ verseText, reference, translation }: ShareStoryOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 1080;
  canvas.height = 1920;

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#1a0a2e");
  bg.addColorStop(0.3, "#2d1b4e");
  bg.addColorStop(0.6, "#4a1c40");
  bg.addColorStop(1, "#1a0a1e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.015)";
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 200;
    const y = 300 + i * 250;
    ctx.beginPath();
    ctx.arc(x, y, 150 + i * 30, 0, Math.PI * 2);
    ctx.fill();
  }

  const topLineY = 400;
  const bottomLineY = canvas.height - 500;
  ctx.strokeStyle = "rgba(212,165,116,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, topLineY);
  ctx.lineTo(canvas.width - 200, topLineY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(200, bottomLineY);
  ctx.lineTo(canvas.width - 200, bottomLineY);
  ctx.stroke();

  ctx.fillStyle = "rgba(212,165,116,0.15)";
  ctx.font = "400px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("\u201C", canvas.width / 2, topLineY + 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";

  const lines = wrapText(ctx, verseText, canvas.width - 200);
  const lineHeight = 72;
  const totalHeight = lines.length * lineHeight;
  const centerY = (topLineY + bottomLineY) / 2;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  ctx.font = "bold 32px Georgia, serif";
  ctx.fillStyle = "#d4a574";
  ctx.fillText(`${reference}`, canvas.width / 2, bottomLineY + 60);

  ctx.font = "24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`(${translation})`, canvas.width / 2, bottomLineY + 100);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, canvas.height - 160, canvas.width, 160);

  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("365 Daily Devotional", canvas.width / 2, canvas.height - 80);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Your daily spiritual companion", canvas.width / 2, canvas.height - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

export async function shareAsStory(opts: ShareStoryOptions): Promise<{ success: boolean; method: "share" | "download" }> {
  const blob = await generateStoryImage(opts);
  if (!blob) return { success: false, method: "download" };

  const file = new File([blob], `story-${opts.reference.replace(/[:\s]/g, "-")}.png`, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `${opts.reference} Story`, files: [file] });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `story-${opts.reference.replace(/[:\s]/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: "download" };
}
