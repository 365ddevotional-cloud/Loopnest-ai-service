import { storage } from "./storage";
import type { InsertSundaySchoolLesson } from "@shared/schema";
import lessonData from "./sunday-school-data.json";

export async function seedSundaySchoolLessons() {
  const existing = await storage.getSundaySchoolLessons();
  const existingDates = new Set(existing.map((l) => l.date));

  const allLessons = lessonData as InsertSundaySchoolLesson[];
  if (allLessons.length === 0) {
    console.log("[Sunday School] No lesson data found.");
    return;
  }

  const missing = allLessons.filter((l) => !existingDates.has(l.date));

  if (missing.length === 0) {
    console.log(`[Sunday School] All ${existing.length} lessons up to date.`);
    return;
  }

  console.log(`[Sunday School] ${existing.length} existing, ${missing.length} new lessons to add.`);

  let created = 0;
  for (const lesson of missing) {
    try {
      await storage.createSundaySchoolLesson(lesson);
      created++;
    } catch (err: any) {
      console.error(`[Sunday School] Failed to seed "${lesson.title}" (${lesson.date}):`, err.message);
    }
  }
  console.log(`[Sunday School] Seed complete: ${created} new lessons added. Total: ${existing.length + created}.`);
}
