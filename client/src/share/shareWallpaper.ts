export interface ShareWallpaperOptions {
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

export async function generateWallpaper({ verseText, reference, translation }: ShareWallpaperOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 1080;
  canvas.height = 1920;

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#0f0c29");
  bg.addColorStop(0.5, "#1a1a3e");
  bg.addColorStop(1, "#0f0c29");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(212,165,116,0.03)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(
      canvas.width / 2 + (i - 1) * 150,
      canvas.height / 2 + (i - 1) * 100,
      200 + i * 80,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const lineY1 = canvas.height * 0.35;
  const lineY2 = canvas.height * 0.65;
  ctx.strokeStyle = "rgba(212,165,116,0.15)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.15, lineY1);
  ctx.lineTo(canvas.width * 0.85, lineY1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.15, lineY2);
  ctx.lineTo(canvas.width * 0.85, lineY2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "300 52px Georgia, serif";
  ctx.textAlign = "center";

  const lines = wrapText(ctx, verseText, canvas.width - 180);
  const lineHeight = 78;
  const totalHeight = lines.length * lineHeight;
  const centerY = canvas.height / 2;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  ctx.font = "bold 28px Georgia, serif";
  ctx.fillStyle = "#d4a574";
  const refY = Math.max(lineY2 + 50, startY + totalHeight + 50);
  ctx.fillText(reference, canvas.width / 2, refY);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText(`(${translation})`, canvas.width / 2, refY + 35);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("365 Daily Devotional", canvas.width / 2, canvas.height - 60);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

export async function shareAsWallpaper(opts: ShareWallpaperOptions): Promise<{ success: boolean; method: "share" | "download" }> {
  const blob = await generateWallpaper(opts);
  if (!blob) return { success: false, method: "download" };

  const file = new File([blob], `wallpaper-${opts.reference.replace(/[:\s]/g, "-")}.png`, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `${opts.reference} Wallpaper`, files: [file] });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallpaper-${opts.reference.replace(/[:\s]/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: "download" };
}
