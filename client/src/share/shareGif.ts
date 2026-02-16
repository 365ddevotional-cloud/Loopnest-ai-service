export interface ShareGifOptions {
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

function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  verseText: string,
  reference: string,
  translation: string,
  progress: number
) {
  const w = canvas.width;
  const h = canvas.height;

  const hueShift = progress * 20;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${280 + hueShift}, 50%, 15%)`);
  bg.addColorStop(1, `hsl(${320 + hueShift}, 40%, 12%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glowX = w / 2 + Math.sin(progress * Math.PI * 2) * 100;
  const glowY = h / 2 + Math.cos(progress * Math.PI * 2) * 60;
  const glowGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 300);
  glowGrad.addColorStop(0, "rgba(212,165,116,0.08)");
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.font = "italic 24px Georgia, serif";
  const lines = wrapText(ctx, verseText, w - 120);
  const lineHeight = 38;
  const totalHeight = lines.length * lineHeight;
  const startY = (h - totalHeight) / 2 - 20;

  const charTotal = verseText.length;
  const revealCount = Math.floor(charTotal * Math.min(progress * 1.5, 1));
  let charsSoFar = 0;

  ctx.textAlign = "center";

  lines.forEach((line, i) => {
    const lineStart = charsSoFar;
    const lineEnd = lineStart + line.length;
    charsSoFar = lineEnd + 1;

    if (lineStart >= revealCount) return;

    const visibleChars = Math.min(revealCount - lineStart, line.length);
    const visibleText = line.substring(0, visibleChars);

    const alpha = Math.min(1, (revealCount - lineStart) / line.length);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText(visibleText, w / 2, startY + i * lineHeight);
  });

  const refAlpha = Math.max(0, (progress - 0.7) / 0.3);
  if (refAlpha > 0) {
    ctx.globalAlpha = refAlpha;
    ctx.font = "bold 20px Georgia, serif";
    ctx.fillStyle = "#d4a574";
    ctx.fillText(`\u2014 ${reference} (${translation})`, w / 2, h - 80);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("365 Daily Devotional", w / 2, h - 45);
    ctx.globalAlpha = 1;
  }
}

export async function generateAnimatedVerse(opts: ShareGifOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = 800;
  canvas.height = 500;

  const stream = canvas.captureStream(30);
  const chunks: Blob[] = [];

  const mimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  let mimeType = "";
  for (const mt of mimeTypes) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mt)) {
      mimeType = mt;
      break;
    }
  }

  if (!mimeType || typeof MediaRecorder === "undefined") {
    drawFrame(ctx, canvas, opts.verseText, opts.reference, opts.translation, 1);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 1000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = 90;
  const duration = 3000;
  const interval = duration / totalFrames;

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const ext = mimeType.includes("mp4") ? "video/mp4" : "video/webm";
      const blob = new Blob(chunks, { type: ext });
      resolve(blob);
    };

    recorder.start();

    let frame = 0;
    const timer = setInterval(() => {
      const progress = frame / totalFrames;
      drawFrame(ctx, canvas, opts.verseText, opts.reference, opts.translation, progress);
      frame++;
      if (frame > totalFrames) {
        clearInterval(timer);
        setTimeout(() => recorder.stop(), 100);
      }
    }, interval);
  });
}

export async function shareAsGif(opts: ShareGifOptions): Promise<{ success: boolean; method: "share" | "download" }> {
  const blob = await generateAnimatedVerse(opts);
  if (!blob) return { success: false, method: "download" };

  const isVideo = blob.type.startsWith("video/");
  const ext = isVideo ? (blob.type.includes("mp4") ? "mp4" : "webm") : "png";
  const fileName = `animated-${opts.reference.replace(/[:\s]/g, "-")}.${ext}`;
  const file = new File([blob], fileName, { type: blob.type });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `${opts.reference} Animated`, files: [file] });
      return { success: true, method: "share" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { success: false, method: "share" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: "download" };
}
