import type { Express } from "express";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 upload credentials are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Download directly from R2 with attachment headers, without sending media bytes
// through Railway or changing the headers used for normal playback.
export async function getVideoDownloadUrl(objectPath: string, title: string): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) throw new Error("R2_BUCKET_NAME is not configured");

  const key = objectPath.replace(/^\.private\//, "");
  if (!key.startsWith("uploads/") || key.split("/").some(part => part === "..") || /[?#]/.test(key)) {
    throw new Error("Invalid video object path");
  }
  const safeTitle = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[^a-zA-Z0-9 _!-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  const filename = `${safeTitle || "Song"} - from 365 Daily Devotional.mp4`;
  return getSignedUrl(getR2Client(), new GetObjectCommand({
    Bucket: bucketName,
    Key: `.private/${key}`,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
    ResponseContentType: "application/octet-stream",
  }), { expiresIn: 3600 });
}

export function registerObjectStorageRoutes(app: Express): void {

  // Generate a temporary Cloudflare R2 upload URL.
  // The browser uploads directly to R2; Railway never handles the file bytes.
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const bucketName = process.env.R2_BUCKET_NAME;
      if (!bucketName) {
        throw new Error("R2_BUCKET_NAME is not configured");
      }

      const objectId = randomUUID();
      const objectKey = `.private/uploads/${objectId}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType || "application/octet-stream",
      });

      const uploadURL = await getSignedUrl(getR2Client(), command, {
        expiresIn: 900,
      });

      // Preserve the same path format already stored throughout the app.
      const objectPath = `/objects/uploads/${objectId}`;

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating R2 upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Existing and new /objects/uploads/... paths resolve to Cloudflare R2.
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const r2BaseUrl = process.env.R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      return res.status(503).json({
        error: "Media storage is not configured",
      });
    }

    const objectPath = req.params.objectPath;

    if (!objectPath?.startsWith("uploads/")) {
      return res.status(404).json({ error: "Object not found" });
    }

    const r2ObjectUrl =
      `${r2BaseUrl.replace(/\/$/, "")}/.private/${objectPath}`;

    return res.redirect(302, r2ObjectUrl);
  });
}
