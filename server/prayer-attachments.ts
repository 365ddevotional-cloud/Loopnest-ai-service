import type { RequestHandler } from "express";
import multer from "multer";

export const MAX_PRAYER_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;
const MAX_CONCURRENT_SUBMISSIONS = 8;
let activeSubmissions = 0;
const FILE_SIGNATURES: Record<string, Buffer> = {
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "application/pdf": Buffer.from("%PDF-"),
};

export interface PrayerFile {
  fileName: string;
  contentType: string;
  bytes: Buffer;
}

export function isPrayerAttachmentContent(contentType: string, bytes: Buffer) {
  const signature = Object.hasOwn(FILE_SIGNATURES, contentType) ? FILE_SIGNATURES[contentType] : undefined;
  return !!signature && bytes.length <= MAX_PRAYER_ATTACHMENT_SIZE &&
    bytes.subarray(0, signature.length).equals(signature);
}

const parseMultipart = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_FILES, fileSize: MAX_PRAYER_ATTACHMENT_SIZE + 1, fields: 1, fieldSize: 64 * 1024, fieldArrayIndexLimit: 0, parts: MAX_FILES + 2 },
}).array("attachments", MAX_FILES);

export const parsePrayerSubmission: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  if (activeSubmissions >= MAX_CONCURRENT_SUBMISSIONS) {
    return res.status(503).json({ message: "File uploads are busy. Please try again shortly." });
  }
  activeSubmissions++;
  res.once("close", () => { activeSubmissions--; });
  parseMultipart(req, res, error => {
    if (error) return res.status(400).json({ message: "Attach up to three JPG, PNG or PDF files of 5 MB each." });

    const files: PrayerFile[] = [];
    for (const file of (req.files ?? []) as Express.Multer.File[]) {
      if (!isPrayerAttachmentContent(file.mimetype, file.buffer)) {
        return res.status(400).json({ message: "An attachment is invalid or larger than 5 MB." });
      }
      const fileName = file.originalname.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180).trim() || "attachment";
      files.push({ fileName, contentType: file.mimetype, bytes: file.buffer });
    }
    try {
      if (typeof req.body?.request !== "string") throw new Error("Missing request");
      req.body = JSON.parse(req.body.request);
    } catch {
      return res.status(400).json({ message: "Invalid prayer request." });
    }
    res.locals.prayerFiles = files;
    next();
  });
};
