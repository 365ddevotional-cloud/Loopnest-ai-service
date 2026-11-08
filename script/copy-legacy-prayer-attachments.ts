import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { prayerAttachmentFiles, prayerAttachments } from "@shared/schema";
import { db, pool } from "../server/db";
import { readLegacyPrayerAttachment } from "../server/replit_integrations/object_storage/routes";

async function main() {
  const copy = process.argv.includes("--copy");
  let cursor = 0;
  let candidates = 0;
  let verified = 0;
  let failed = 0;

  for (;;) {
    const batch = await db.select({
      id: prayerAttachments.id,
      fileSize: prayerAttachments.fileSize,
      objectPath: prayerAttachments.objectPath,
    }).from(prayerAttachments).leftJoin(prayerAttachmentFiles, eq(prayerAttachmentFiles.attachmentId, prayerAttachments.id))
      .where(and(gt(prayerAttachments.id, cursor), ne(prayerAttachments.objectPath, "private"), isNull(prayerAttachmentFiles.attachmentId)))
      .orderBy(prayerAttachments.id).limit(25);
    if (!batch.length) break;

    for (const item of batch) {
      cursor = item.id;
      candidates++;
      if (!copy) continue;
      try {
        const bytes = await readLegacyPrayerAttachment(item.objectPath);
        if (bytes.length !== item.fileSize) throw new Error("Legacy size mismatch");
        await db.transaction(async tx => {
          const [current] = await tx.select({ id: prayerAttachments.id }).from(prayerAttachments)
            .where(and(eq(prayerAttachments.id, item.id), eq(prayerAttachments.objectPath, item.objectPath))).for("update");
          if (!current) throw new Error("Attachment changed during copy");
          await tx.insert(prayerAttachmentFiles).values({ attachmentId: item.id, bytes }).onConflictDoNothing();
          const [saved] = await tx.select({ bytes: prayerAttachmentFiles.bytes }).from(prayerAttachmentFiles)
            .where(eq(prayerAttachmentFiles.attachmentId, item.id));
          if (!saved?.bytes.equals(bytes)) throw new Error("Stored bytes differ from source");
        });
        verified++;
      } catch {
        failed++;
        console.error(`Could not verify legacy attachment ID ${item.id}`);
      }
    }
  }

  console.log(JSON.stringify({ mode: copy ? "copy" : "inventory", candidates, verified, failed }));
  if (failed) process.exitCode = 1;
}

main().catch(() => {
  console.error("Legacy attachment inventory or copy failed.");
  process.exitCode = 1;
}).finally(() => pool.end());
