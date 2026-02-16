export interface ShareImageOptions {
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

export async function generateVerseImage({ verseText, reference, translation }: ShareImageOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 800;
  canvas.height = 500;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#4a1c40");
  gradient.addColorStop(1, "#2d1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.font = "200px serif";
  ctx.fillText("\u201C", 30, 180);
  ctx.fillText("\u201D", canvas.width - 120, canvas.height - 50);

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 24px Georgia, serif";
  ctx.textAlign = "center";

  const lines = wrapText(ctx, verseText, canvas.width - 100);
  const lineHeight = 36;
  const totalHeight = lines.length * lineHeight;
  const startY = (canvas.height - totalHeight) / 2 - 20;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  ctx.font = "bold 20px Georgia, serif";
  ctx.fillStyle = "#d4a574";
  ctx.fillText(`\u2014 ${reference} (${translation})`, canvas.width / 2, canvas.height - 80);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("365 Daily Devotional", canvas.width / 2, canvas.height - 40);

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
