import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendPrayerReplyNotification, sendContactMessageNotification, sendContactAutoReply, sendGeneralInquiryNotification, sendFeedbackNotification, sendPartnershipNotification } from "./sendgrid";
import { sendSmsNotification, isValidE164PhoneNumber } from "./twilio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getTodayDateString, isFutureDate, isPastDate, getDayOfYear } from "./date-utils";
import { seedAllDevotionals } from "./seed-devotionals";
import { getOrCreateTranslation, isAllowedLanguage, getCachedTranslationsForLanguage } from "./translationService";
import { getCurrentPromise, getNextPromise, advancePromise, resetRotation, toggleEnabled, getTotalPromises, startPromiseScheduler } from "./promiseEngine";
import { generateAIEncouragement } from "./inbox-ai";
import { promiseAmens, INBOX_CATEGORIES } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, gte } from "drizzle-orm";


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function overlayTranslation(devotional: any, translation: any, lang: string) {
  return {
    ...devotional,
    title: translation._translatedTitle ?? devotional.title,
    content: translation.devotionalMessage,
    prayerPoints: translation.prayerPoints,
    faithDeclarations: translation.faithDeclarations,
    christianQuotes: translation.christianQuotes ?? devotional.christianQuotes,
    propheticDeclaration: translation.propheticDeclaration ?? devotional.propheticDeclaration,
    scriptureText: translation.scriptureTextTranslated ?? devotional.scriptureText,
    _translatedTo: lang,
  };
}

async function applyTranslation(devotional: any, lang: string | undefined) {
  if (!lang || lang === "en" || !isAllowedLanguage(lang)) return devotional;
  try {
    const translation = await getOrCreateTranslation(devotional, lang);
    if (!translation) return devotional;
    return overlayTranslation(devotional, translation, lang);
  } catch {
    return devotional;
  }
}

async function applyTranslationToList(devotionals: any[], lang: string | undefined) {
  if (!lang || lang === "en" || !isAllowedLanguage(lang)) return devotionals;
  try {
    const translations = await getCachedTranslationsForLanguage(lang);
    if (translations.length === 0) return devotionals;
    const translationMap = new Map(translations.map(t => [t.devotionalId, t]));
    return devotionals.map(d => {
      const t = translationMap.get(d.id);
      if (!t) return d;
      return overlayTranslation(d, t, lang);
    });
  } catch {
    return devotionals;
  }
}

if (!ADMIN_PASSWORD) {
  console.warn("WARNING: ADMIN_PASSWORD not set. Admin login will be disabled.");
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized: Admin access required" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ success: false, message: "Admin login not configured" });
    }
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.json({ success: true, message: "Login successful" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Logout failed" });
      } else {
        res.json({ success: true, message: "Logged out" });
      }
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // PUBLIC DEBUG ENDPOINT - Returns current server state for diagnosing production issues
  // This endpoint bypasses all caching and returns raw server data
  app.get("/api/_debug/server-status", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    
    const serverNow = new Date();
    const todayString = getTodayDateString();
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const effectiveDate = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : todayString;
    
    try {
      const todayDevotional = await storage.getDevotionalByDate(effectiveDate);
      const allDevotionals = await storage.getDevotionals();
      
      res.json({
        serverTimestamp: serverNow.toISOString(),
        serverDateUTC: serverNow.toUTCString(),
        timezone: process.env.APP_TIMEZONE || "America/New_York",
        computedToday: todayString,
        clientDateProvided: clientDate,
        effectiveDate,
        requestId: Math.random().toString(36).substring(7),
        database: {
          connected: true,
          totalDevotionals: allDevotionals.length,
          hasDevotionalForEffectiveDate: !!todayDevotional,
          devotionalTitle: todayDevotional?.title || null,
          devotionalDate: todayDevotional?.date || null,
          firstDevotionalDate: allDevotionals[allDevotionals.length - 1]?.date || null,
          lastDevotionalDate: allDevotionals[0]?.date || null,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'not set',
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        }
      });
    } catch (error) {
      res.json({
        serverTimestamp: serverNow.toISOString(),
        serverDateUTC: serverNow.toUTCString(),
        timezone: process.env.APP_TIMEZONE || "America/New_York",
        computedToday: todayString,
        error: error instanceof Error ? error.message : "Unknown database error",
        database: {
          connected: false,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'not set',
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        }
      });
    }
  });

  const BUILD_TIMESTAMP = new Date().toISOString();

  app.get("/api/_health", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const allDevotionals = await storage.getDevotionals();
      const activeCount = allDevotionals.filter(d => !d.isDeleted).length;
      const sample = allDevotionals[0];
      res.json({
        status: "ok",
        environment: process.env.NODE_ENV || "development",
        buildTimestamp: BUILD_TIMESTAMP,
        devotionalCount: activeCount,
        schemaVersion: "2.0",
        hasChristianQuotes: sample ? sample.christianQuotes !== null && sample.christianQuotes !== undefined : false,
        hasPropheticDeclaration: sample ? sample.propheticDeclaration !== null && sample.propheticDeclaration !== undefined : false,
        serviceWorkerVersion: "v6",
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        environment: process.env.NODE_ENV || "development",
        buildTimestamp: BUILD_TIMESTAMP,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Digital Asset Links for Google Play TWA verification
  // Configure ANDROID_PACKAGE_NAME and ANDROID_SHA256_FINGERPRINT env vars before publishing
  app.get("/.well-known/assetlinks.json", (req, res) => {
    const packageName = process.env.ANDROID_PACKAGE_NAME || "com.devotional365.app";
    const sha256Fingerprint = process.env.ANDROID_SHA256_FINGERPRINT || "";
    
    const assetLinks = [{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: sha256Fingerprint ? [sha256Fingerprint] : []
      }
    }];
    
    res.setHeader("Content-Type", "application/json");
    res.json(assetLinks);
  });

  // GET Today's Devotional
  // Accepts optional clientDate query param for client timezone support
  // Implements perpetual cyclical loop: if no devotional for today's exact date,
  // calculates days since earliest devotional and uses modulo to cycle forever
  app.get(api.devotionals.getToday.path, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayDateString();
    const isAdmin = !!req.session?.isAdmin;
    let devotional = await storage.getDevotionalByDate(today);
    
    if (!devotional) {
      const all = await storage.getDevotionals();
      
      if (all.length > 0) {
        const activeDevotionals = all.filter(d => !d.isDeleted);
        const sortedAsc = [...activeDevotionals].sort((a, b) => a.date.localeCompare(b.date));

        if (sortedAsc.length > 0) {
          const earliestDate = sortedAsc[0].date;
          const todayMs = new Date(today + "T00:00:00").getTime();
          const earliestMs = new Date(earliestDate + "T00:00:00").getTime();
          const daysDiff = Math.floor((todayMs - earliestMs) / (1000 * 60 * 60 * 24));
          const index = ((daysDiff % sortedAsc.length) + sortedAsc.length) % sortedAsc.length;
          devotional = sortedAsc[index];
          console.log("Loop fallback activated for devotional");
        } else if (isAdmin) {
          devotional = all[0];
        }
      }
    }

    if (!devotional) {
      return res.status(404).json({ message: "No devotionals found." });
    }
    
    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const result = await applyTranslation(devotional, lang);
    res.json(result);
  });

  // GET Devotional by specific Date
  // Non-admin users cannot access future devotionals
  // Accepts optional clientDate query param for client timezone support
  app.get(api.devotionals.getByDate.path, async (req, res) => {
    // Prevent ALL caching (browser, proxy, CDN) to ensure fresh data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    
    const date = req.params.date;
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayDateString();
    const isAdmin = !!req.session?.isAdmin;
    
    // Check if this is a future date and user is not admin
    if (!isAdmin && date > today) {
      return res.status(403).json({ 
        restricted: true,
        message: "This devotional will be available on its scheduled date.",
        scheduledDate: date
      });
    }
    
    const devotional = await storage.getDevotionalByDate(date);
    if (!devotional) {
      return res.status(404).json({ message: "Devotional not found for this date" });
    }
    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const result = await applyTranslation(devotional, lang);
    res.json(result);
  });

  // GET All Devotionals (Archive)
  // Non-admin users only see past and present devotionals
  // Accepts optional clientDate query param for client timezone support
  app.get(api.devotionals.list.path, async (req, res) => {
    // Prevent ALL caching (browser, proxy, CDN) to ensure fresh data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    
    const list = await storage.getDevotionals();
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayDateString();
    const isAdmin = !!req.session?.isAdmin;
    
    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    if (isAdmin) {
      const translated = await applyTranslationToList(list, lang);
      res.json(translated);
    } else {
      const filteredList = list.filter(d => d.date <= today);
      const translated = await applyTranslationToList(filteredList, lang);
      res.json(translated);
    }
  });

  // POST Create/Update Devotional (Admin only)
  // Uses UPSERT: Creates new or updates existing devotional for the given date
  // Only allowed for present or future dates (past dates are immutable)
  app.post(api.devotionals.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.devotionals.create.input.parse(req.body);
      
      // Check if date is in the past (computed at request time using server time)
      if (isPastDate(input.date)) {
        return res.status(403).json({ 
          message: "Cannot create or modify past devotionals. Past dates are read-only." 
        });
      }

      // UPSERT: Insert new or update existing devotional for this date
      const devotional = await storage.upsertDevotional(input);
      res.status(201).json(devotional);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // DELETE Devotional (Admin only - only present and future devotionals can be deleted)
  // Requires explicit confirmation via query param: ?confirm=true
  // Uses SOFT DELETE - devotional is marked as deleted but not permanently removed
  app.delete(api.devotionals.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // SAFETY: Require explicit confirmation for delete operations
    const confirmed = req.query.confirm === "true";
    if (!confirmed) {
      return res.status(400).json({ 
        message: "Delete requires explicit confirmation. Add ?confirm=true to proceed.",
        requiresConfirmation: true
      });
    }
    
    // Check if devotional exists and is not in the past
    const devotional = await storage.getDevotional(id);
    if (!devotional) {
      return res.status(404).json({ message: "Devotional not found" });
    }
    
    // Use timezone-aware comparison: past means before today (in APP_TIMEZONE)
    if (isPastDate(devotional.date)) {
      return res.status(403).json({ message: "Cannot delete past devotionals" });
    }
    
    // Soft-delete: marks as deleted but preserves data for potential restoration
    await storage.deleteDevotional(id);
    res.status(204).send();
  });

  // RESTORE Devotional (Admin only - restores a soft-deleted devotional)
  app.post("/api/devotionals/:id/restore", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const restored = await storage.restoreDevotional(id);
    if (!restored) {
      return res.status(404).json({ message: "Devotional not found or already active" });
    }
    
    res.json(restored);
  });

  // GET Deleted Devotionals (Admin only - for restoration purposes)
  app.get("/api/devotionals/deleted", requireAdmin, async (req, res) => {
    const deleted = await storage.getDeletedDevotionals();
    res.json(deleted);
  });

  // ==== ADMIN SAFETY & BACKUP ENDPOINTS ====

  // BACKUP Export - Non-destructive JSON export of all devotionals (Admin only)
  // Returns all devotionals including deleted ones for complete backup
  app.get("/api/admin/backup/devotionals", requireAdmin, async (req, res) => {
    try {
      const activeDevotionals = await storage.getDevotionals();
      const deletedDevotionals = await storage.getDeletedDevotionals();
      
      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        type: "devotionals_backup",
        stats: {
          active: activeDevotionals.length,
          deleted: deletedDevotionals.length,
          total: activeDevotionals.length + deletedDevotionals.length,
        },
        data: {
          active: activeDevotionals,
          deleted: deletedDevotionals,
        },
      };
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="devotionals-backup-${getTodayDateString()}.json"`);
      res.json(backup);
    } catch (error) {
      console.error("Backup export failed:", error);
      res.status(500).json({ message: "Failed to export backup" });
    }
  });

  // SYSTEM INTEGRITY CHECK - Validates data consistency (Admin only)
  // Checks for duplicates, date gaps, and other potential issues
  app.get("/api/admin/integrity-check", requireAdmin, async (req, res) => {
    try {
      const devotionals = await storage.getDevotionals();
      const issues: Array<{ type: string; severity: "warning" | "error"; message: string; details?: unknown }> = [];
      
      // Check for duplicate dates (shouldn't happen due to unique constraint, but verify)
      const dateMap = new Map<string, number[]>();
      for (const d of devotionals) {
        const ids = dateMap.get(d.date) || [];
        ids.push(d.id);
        dateMap.set(d.date, ids);
      }
      Array.from(dateMap.entries()).forEach(([date, ids]) => {
        if (ids.length > 1) {
          issues.push({
            type: "duplicate_date",
            severity: "error",
            message: `Multiple devotionals found for date ${date}`,
            details: { date, ids },
          });
        }
      });
      
      // Check for date gaps in 2026 (if devotionals exist for that year)
      const dates2026 = devotionals
        .filter(d => d.date.startsWith("2026-"))
        .map(d => d.date)
        .sort();
      
      if (dates2026.length > 1) {
        for (let i = 1; i < dates2026.length; i++) {
          const prev = new Date(dates2026[i - 1]);
          const curr = new Date(dates2026[i]);
          const daysDiff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff > 1) {
            issues.push({
              type: "date_gap",
              severity: "warning",
              message: `Gap of ${daysDiff - 1} day(s) between ${dates2026[i - 1]} and ${dates2026[i]}`,
              details: { from: dates2026[i - 1], to: dates2026[i], missingDays: daysDiff - 1 },
            });
          }
        }
      }
      
      // Check for empty required fields
      for (const d of devotionals) {
        if (!d.title || d.title.trim() === "") {
          issues.push({
            type: "empty_field",
            severity: "error",
            message: `Devotional ${d.id} (${d.date}) has empty title`,
            details: { id: d.id, date: d.date, field: "title" },
          });
        }
        if (!d.scriptureReference || d.scriptureReference.trim() === "") {
          issues.push({
            type: "empty_field",
            severity: "warning",
            message: `Devotional ${d.id} (${d.date}) has empty scripture reference`,
            details: { id: d.id, date: d.date, field: "scriptureReference" },
          });
        }
        if (!d.prayerPoints || d.prayerPoints.length === 0) {
          issues.push({
            type: "empty_field",
            severity: "warning",
            message: `Devotional ${d.id} (${d.date}) has no prayer points`,
            details: { id: d.id, date: d.date, field: "prayerPoints" },
          });
        }
      }
      
      const summary = {
        checkedAt: new Date().toISOString(),
        timezone: process.env.APP_TIMEZONE || "America/New_York",
        totalDevotionals: devotionals.length,
        issuesFound: issues.length,
        errorCount: issues.filter(i => i.severity === "error").length,
        warningCount: issues.filter(i => i.severity === "warning").length,
        healthy: issues.filter(i => i.severity === "error").length === 0,
        issues,
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Integrity check failed:", error);
      res.status(500).json({ message: "Integrity check failed" });
    }
  });

  // BACKUP Export - Bible passages (Admin only)
  app.get("/api/admin/backup/bible-passages", requireAdmin, async (req, res) => {
    try {
      const allTranslations = ["KJV", "WEB", "ASV", "DRB"] as const;
      const allPassages: Record<string, Awaited<ReturnType<typeof storage.getAllBiblePassages>>> = {};
      
      for (const translation of allTranslations) {
        allPassages[translation] = await storage.getAllBiblePassages(translation);
      }
      
      const totalCount = Object.values(allPassages).reduce((sum, arr) => sum + arr.length, 0);
      
      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        type: "bible_passages_backup",
        stats: {
          total: totalCount,
          byTranslation: Object.fromEntries(
            Object.entries(allPassages).map(([k, v]) => [k, v.length])
          ),
        },
        data: allPassages,
      };
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="bible-passages-backup-${getTodayDateString()}.json"`);
      res.json(backup);
    } catch (error) {
      console.error("Bible passages backup failed:", error);
      res.status(500).json({ message: "Failed to export bible passages backup" });
    }
  });

  // SYSTEM STATUS - Overall system health (Admin only)
  app.get("/api/admin/system-status", requireAdmin, async (req, res) => {
    try {
      const devotionals = await storage.getDevotionals();
      const deletedDevotionals = await storage.getDeletedDevotionals();
      const prayerRequests = await storage.getPrayerRequests();
      
      const today = getTodayDateString();
      const todayDevotional = devotionals.find(d => d.date === today);
      const futureCount = devotionals.filter(d => d.date > today).length;
      const pastCount = devotionals.filter(d => d.date < today).length;
      
      res.json({
        timestamp: new Date().toISOString(),
        timezone: process.env.APP_TIMEZONE || "America/New_York",
        today,
        hasTodayDevotional: !!todayDevotional,
        devotionals: {
          total: devotionals.length,
          past: pastCount,
          future: futureCount,
          deleted: deletedDevotionals.length,
        },
        prayerRequests: {
          total: prayerRequests.length,
          unread: prayerRequests.filter(pr => !pr.isRead).length,
          pending: prayerRequests.filter(pr => pr.status === "new").length,
        },
        safetyFeatures: {
          softDeleteEnabled: true,
          confirmationRequired: true,
          pastEditProtection: true,
          futureAccessControl: true,
          duplicatePrevention: true,
        },
      });
    } catch (error) {
      console.error("System status failed:", error);
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // SEED DATABASE - Populate database with all 2026 devotionals (Admin only)
  // This is idempotent - it will skip existing dates and only insert missing ones
  app.post("/api/admin/seed-devotionals", requireAdmin, async (req, res) => {
    try {
      console.log("Admin triggered database seeding...");
      
      // Get current count before seeding
      const beforeCount = (await storage.getDevotionals()).length;
      
      // Run the seed function (idempotent - skips existing dates)
      await seedAllDevotionals();
      
      // Get count after seeding
      const afterCount = (await storage.getDevotionals()).length;
      const inserted = afterCount - beforeCount;
      
      res.json({
        success: true,
        message: `Database seeding complete`,
        stats: {
          beforeCount,
          afterCount,
          inserted,
          skipped: afterCount === beforeCount ? "All devotionals already existed" : `${beforeCount} existing devotionals preserved`,
        }
      });
    } catch (error) {
      console.error("Seeding failed:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to seed database",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==== END ADMIN SAFETY ENDPOINTS ====

  // PATCH Update Devotional (Admin only - only present and future devotionals can be edited)
  app.patch(api.devotionals.update.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const devotional = await storage.getDevotional(id);
    if (!devotional) {
      return res.status(404).json({ message: "Devotional not found" });
    }
    
    // Check if devotional is in the past (read-only) using timezone-aware comparison
    if (isPastDate(devotional.date)) {
      return res.status(403).json({ message: "Cannot edit past devotionals. They are read-only." });
    }
    
    try {
      const input = api.devotionals.update.input.parse(req.body);
      
      // Merge partial updates with existing values to prevent overwriting with undefined
      const updateData = {
        title: input.title ?? devotional.title,
        scriptureReference: input.scriptureReference ?? devotional.scriptureReference,
        scriptureText: input.scriptureText ?? devotional.scriptureText,
        content: input.content ?? devotional.content,
        prayerPoints: input.prayerPoints ?? devotional.prayerPoints,
        faithDeclarations: input.faithDeclarations ?? devotional.faithDeclarations,
        christianQuotes: input.christianQuotes !== undefined ? input.christianQuotes : devotional.christianQuotes,
        propheticDeclaration: input.propheticDeclaration !== undefined ? input.propheticDeclaration : devotional.propheticDeclaration,
        author: input.author ?? devotional.author,
        date: input.date ?? devotional.date,
      };
      
      const updated = await storage.updateDevotional(id, updateData);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Scripture Routes
  // GET all Bible passages for a translation
  app.get("/api/bible-passages", async (req, res) => {
    const translation = (req.query.translation as string) || "KJV";
    
    const validTranslations = ["KJV", "WEB", "ASV", "DRB"];
    if (!validTranslations.includes(translation)) {
      return res.status(400).json({ message: "Invalid translation. Must be one of: KJV, WEB, ASV, DRB" });
    }
    
    const passages = await storage.getAllBiblePassages(translation as any);
    res.json(passages);
  });

  // GET Scripture passage by reference and translation
  app.get(api.scripture.get.path, async (req, res) => {
    const reference = req.query.reference as string;
    const translation = (req.query.translation as string) || "KJV";
    
    if (!reference) {
      return res.status(400).json({ message: "Reference is required" });
    }
    
    // Validate translation
    const validTranslations = ["KJV", "WEB", "ASV", "DRB"];
    if (!validTranslations.includes(translation)) {
      return res.status(400).json({ message: "Invalid translation. Must be one of: KJV, WEB, ASV, DRB" });
    }
    
    const passage = await storage.getBiblePassage(reference, translation as any);
    
    if (!passage) {
      // If specific translation not found, try to get KJV as fallback
      if (translation !== "KJV") {
        const kjvPassage = await storage.getBiblePassage(reference, "KJV");
        if (kjvPassage) {
          // Return KJV with a flag indicating it's a fallback
          return res.json({ ...kjvPassage, isFallback: true, requestedTranslation: translation });
        }
      }
      return res.status(404).json({ message: "Scripture not found for this reference" });
    }
    
    res.json(passage);
  });

  // Prayer Request Routes
  app.post(api.prayerRequests.create.path, async (req, res) => {
    try {
      const input = api.prayerRequests.create.input.parse(req.body);
      
      // Validate phone number format if provided
      if (input.phoneNumber && !isValidE164PhoneNumber(input.phoneNumber)) {
        return res.status(400).json({
          message: "Phone number must be in E.164 format (e.g., +1234567890)",
          field: "phoneNumber",
        });
      }
      
      // Ensure smsEnabled is false if no valid phone number
      const sanitizedInput = {
        ...input,
        smsEnabled: input.smsEnabled && !!input.phoneNumber && isValidE164PhoneNumber(input.phoneNumber),
      };
      
      const prayerRequest = await storage.createPrayerRequest(sanitizedInput);
      res.status(201).json(prayerRequest);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Prayer request list (Admin only)
  app.get(api.prayerRequests.list.path, requireAdmin, async (req, res) => {
    const requests = await storage.getPrayerRequests();
    res.json(requests);
  });

  // Get replies for prayer request (Admin only)
  app.get(api.prayerRequests.getReplies.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const replies = await storage.getRepliesForRequest(id);
    res.json(replies);
  });

  // GET single prayer request
  app.get(api.prayerRequests.get.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const request = await storage.getPrayerRequest(id);
    if (!request) {
      return res.status(404).json({ message: "Prayer request not found" });
    }
    res.json(request);
  });

  // Update prayer request status (Admin only)
  app.patch(api.prayerRequests.updateStatus.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const { status } = req.body;
    if (!["new", "replied", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updatePrayerRequestStatus(id, status);
    res.json(updated);
  });

  // Update prayer request category (Admin only)
  app.patch("/api/prayer-requests/:id/category", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    try {
      const { prayerCategorySchema } = await import("@shared/schema");
      const category = prayerCategorySchema.parse(req.body.category);
      const updated = await storage.updatePrayerRequestCategory(id, category);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category" });
      }
      throw err;
    }
  });

  // Get thread messages (accessible to admin and users who own the request via email query param)
  app.get(api.prayerRequests.getThread.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!req.session?.isAdmin) {
      const email = req.query.email as string;
      if (!email) {
        return res.status(401).json({ message: "Email required to view conversation" });
      }
      const request = await storage.getPrayerRequest(id);
      if (!request || request.email?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const messages = await storage.getThreadMessages(id);
    res.json(messages);
  });

  // Add thread message (Admin only for admin replies)
  app.post(api.prayerRequests.addThreadMessage.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const { message, senderType } = req.body;
      
      // Only admins can send as "admin"
      if (senderType === "admin" && !req.session?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized: Admin access required" });
      }
      
      const threadMessage = await storage.createThreadMessage({
        requestId: id,
        message,
        senderType,
      });
      
      // Update request status if admin replied
      if (senderType === "admin") {
        await storage.updatePrayerRequestStatus(id, "replied");
        
        const prayerRequest = await storage.getPrayerRequest(id);
        const requesterName = prayerRequest?.fullName || "Friend";
        
        // Send email notification if user has email
        if (prayerRequest?.email && !prayerRequest.isAnonymous) {
          sendPrayerReplyNotification(
            prayerRequest.email,
            requesterName,
            message
          ).catch(err => console.error("Email send error:", err));
        }
        
        // Send SMS notification if user has phone and enabled SMS
        if (prayerRequest?.phoneNumber && prayerRequest?.smsEnabled) {
          sendSmsNotification(
            prayerRequest.phoneNumber,
            requesterName,
            message
          ).catch(err => console.error("SMS send error:", err));
        }
      }
      
      res.status(201).json(threadMessage);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // User-facing: Get prayer requests by email
  app.get("/api/my-prayer-requests", async (req, res) => {
    const email = req.query.email as string;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    try {
      const requests = await storage.getPrayerRequestsByEmail(email);
      const enriched = await Promise.all(
        requests.map(async (r) => {
          const thread = await storage.getThreadMessages(r.id);
          const unreadAdminReplies = thread.filter(
            (m) => m.senderType === "admin" && !m.isRead
          ).length;
          return { ...r, unreadAdminReplies };
        })
      );
      res.json(enriched);
    } catch (err) {
      console.error("Error fetching prayer requests by email:", err);
      res.status(500).json({ message: "Could not fetch prayer requests" });
    }
  });

  // User-facing: Mark admin messages as read when user opens the conversation
  app.post("/api/prayer-requests/:id/mark-read", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    try {
      const request = await storage.getPrayerRequest(id);
      if (!request || request.email?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
      const markedCount = await storage.markAdminMessagesRead(id);
      res.json({ markedCount });
    } catch (err) {
      console.error("Conversation reply could not be saved.", err);
      res.status(500).json({ message: "Could not mark messages as read" });
    }
  });

  // Auto-Reply Templates Routes
  app.get(api.autoReplyTemplates.list.path, async (req, res) => {
    const templates = await storage.getAutoReplyTemplates();
    res.json(templates);
  });

  app.get(api.autoReplyTemplates.get.path, async (req, res) => {
    const type = req.params.type;
    const template = await storage.getAutoReplyTemplate(type);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  });

  // Update auto-reply templates (Admin only)
  app.post(api.autoReplyTemplates.upsert.path, requireAdmin, async (req, res) => {
    try {
      const input = api.autoReplyTemplates.upsert.input.parse(req.body);
      const template = await storage.upsertAutoReplyTemplate(input);
      res.json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Sunday School Routes

  // GET Sunday School preview - returns current + next 3 upcoming lessons using cyclical loop
  app.get("/api/sunday-school/preview", async (_req, res) => {
    const allLessons = await storage.getSundaySchoolLessons();
    if (allLessons.length === 0) {
      return res.json([]);
    }

    const sortedAsc = [...allLessons].sort((a, b) => a.date.localeCompare(b.date));
    const totalCount = sortedAsc.length;

    const today = getTodayDateString();
    const [todayY, todayM, todayD] = today.split("-").map(Number);
    const todayDate = new Date(todayY, todayM - 1, todayD);
    const dayOfWeek = todayDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

    function formatDateLocal(d: Date): string {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    const currentSundayDate = new Date(todayY, todayM - 1, todayD + daysUntilSunday);
    const currentSundayMs = currentSundayDate.getTime();

    const earliestDate = sortedAsc[0].date;
    const [eY, eM, eD] = earliestDate.split("-").map(Number);
    const earliestMs = new Date(eY, eM - 1, eD).getTime();

    const preview = [];
    for (let i = 0; i < 4; i++) {
      const targetSundayDate = new Date(todayY, todayM - 1, todayD + daysUntilSunday + i * 7);
      const targetSundayMs = targetSundayDate.getTime();
      const targetSunday = formatDateLocal(targetSundayDate);

      const exact = sortedAsc.find(l => l.date === targetSunday);
      if (exact) {
        preview.push(exact);
      } else {
        const weeksDiff = Math.floor((targetSundayMs - earliestMs) / (7 * 86400000));
        const index = ((weeksDiff % totalCount) + totalCount) % totalCount;
        preview.push(sortedAsc[index]);
        if (i === 0) console.log("Loop fallback activated for Sunday School");
      }
    }

    res.json(preview);
  });

  app.get(api.sundaySchool.list.path, async (_req, res) => {
    const lessons = await storage.getSundaySchoolLessons();
    res.json(lessons);
  });

  app.get(api.sundaySchool.get.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const lesson = await storage.getSundaySchoolLesson(id);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    res.json(lesson);
  });

  app.post(api.sundaySchool.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.sundaySchool.create.input.parse(req.body);
      const lesson = await storage.createSundaySchoolLesson(input);
      res.status(201).json(lesson);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.patch(api.sundaySchool.update.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const existing = await storage.getSundaySchoolLesson(id);
    if (!existing) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    try {
      const input = api.sundaySchool.update.input.parse(req.body);
      const updated = await storage.updateSundaySchoolLesson(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.sundaySchool.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const existing = await storage.getSundaySchoolLesson(id);
    if (!existing) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    await storage.deleteSundaySchoolLesson(id);
    res.status(204).send();
  });

  // Object Storage Routes
  registerObjectStorageRoutes(app);

  // Prayer Attachment Routes (accessible to admin and users who own the request)
  app.get("/api/prayer-requests/:id/attachments", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!req.session?.isAdmin) {
      const email = req.query.email as string;
      if (!email) {
        return res.status(401).json({ message: "Email required to view attachments" });
      }
      const request = await storage.getPrayerRequest(id);
      if (!request || request.email?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const attachments = await storage.getAttachmentsForRequest(id);
    res.json(attachments);
  });

  app.post("/api/prayer-requests/:id/attachments", async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const { fileName, fileSize, contentType, objectPath } = req.body;
      
      if (!fileName || !fileSize || !contentType || !objectPath) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate file size (5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File size exceeds 5MB limit" });
      }
      
      // Validate file type
      const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
      if (!ALLOWED_TYPES.includes(contentType)) {
        return res.status(400).json({ message: "Invalid file type. Allowed: jpg, png, pdf" });
      }
      
      const attachment = await storage.createPrayerAttachment({
        requestId,
        fileName,
        fileSize,
        contentType,
        objectPath,
      });
      
      res.status(201).json(attachment);
    } catch (err) {
      console.error("Error creating attachment:", err);
      res.status(500).json({ message: "Failed to save attachment" });
    }
  });

  // Support Ticket Routes
  app.post("/api/support-tickets", async (req, res) => {
    try {
      const { insertSupportTicketSchema } = await import("@shared/schema");
      const input = insertSupportTicketSchema.parse(req.body);
      const ticket = await storage.createSupportTicket(input);
      res.status(201).json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Error creating support ticket:", err);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  // Get support tickets (Admin only)
  app.get("/api/support-tickets", requireAdmin, async (req, res) => {
    const tickets = await storage.getSupportTickets();
    res.json(tickets);
  });

  // Contact Message Routes
  app.post("/api/contact-messages", async (req, res) => {
    try {
      const { insertContactMessageSchema } = await import("@shared/schema");
      const input = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(input);
      
      // Send notification email to ministry
      sendContactMessageNotification(
        input.fullName,
        input.email,
        input.subject,
        input.message,
        input.isUrgent || false,
        input.isPrayerRelated || false
      ).catch(err => console.error("Failed to send contact notification:", err));
      
      // Send auto-reply to sender
      sendContactAutoReply(
        input.email,
        input.fullName
      ).catch(err => console.error("Failed to send auto-reply:", err));
      
      // If prayer-related, also create a prayer request
      if (input.isPrayerRelated) {
        await storage.createPrayerRequest({
          fullName: input.fullName,
          email: input.email,
          subject: input.subject,
          message: input.message,
          isAnonymous: false,
          priority: input.isUrgent ? "prayer_urgent" : "prayer_normal",
          category: "other",
        });
      }
      
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Error creating contact message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get contact messages (Admin only)
  app.get("/api/contact-messages", requireAdmin, async (req, res) => {
    const messages = await storage.getContactMessages();
    res.json(messages);
  });

  // General Inquiries Routes
  app.post("/api/general-inquiries", async (req, res) => {
    try {
      const { insertGeneralInquirySchema } = await import("@shared/schema");
      const input = insertGeneralInquirySchema.parse(req.body);
      const inquiry = await storage.createGeneralInquiry(input);
      
      // Send notification email to ministry
      sendGeneralInquiryNotification(
        input.fullName,
        input.email,
        input.topic,
        input.message
      ).catch(err => console.error("Failed to send inquiry notification:", err));
      
      // Send auto-reply to sender
      sendContactAutoReply(
        input.email,
        input.fullName
      ).catch(err => console.error("Failed to send auto-reply:", err));
      
      res.status(201).json(inquiry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Error creating general inquiry:", err);
      res.status(500).json({ message: "Failed to submit inquiry" });
    }
  });

  // Get general inquiries (Admin only)
  app.get("/api/general-inquiries", requireAdmin, async (req, res) => {
    const inquiries = await storage.getGeneralInquiries();
    res.json(inquiries);
  });

  // Feedback Routes
  app.post("/api/feedback", async (req, res) => {
    try {
      const { insertFeedbackSchema } = await import("@shared/schema");
      const input = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(input);
      
      sendFeedbackNotification(
        input.name || null,
        input.email || null,
        input.feedbackType,
        input.message
      ).catch(err => console.error("Failed to send feedback notification:", err));
      
      res.status(201).json(feedback);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Error creating feedback:", err);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback", requireAdmin, async (req, res) => {
    const feedback = await storage.getFeedback();
    res.json(feedback);
  });

  // Partnership Routes
  app.post("/api/partnership", async (req, res) => {
    try {
      const { insertPartnershipSchema } = await import("@shared/schema");
      const input = insertPartnershipSchema.parse(req.body);
      const inquiry = await storage.createPartnershipInquiry(input);
      
      sendPartnershipNotification(
        input.fullName,
        input.email,
        input.organization || null,
        input.partnershipType,
        input.message
      ).catch(err => console.error("Failed to send partnership notification:", err));
      
      sendContactAutoReply(
        input.email,
        input.fullName
      ).catch(err => console.error("Failed to send auto-reply:", err));
      
      res.status(201).json(inquiry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Error creating partnership inquiry:", err);
      res.status(500).json({ message: "Failed to submit inquiry" });
    }
  });

  app.get("/api/partnership", requireAdmin, async (req, res) => {
    const inquiries = await storage.getPartnershipInquiries();
    res.json(inquiries);
  });

  // Testimony Routes
  app.get("/api/testimonies", async (req, res) => {
    try {
      const approved = await storage.getApprovedTestimonies();
      res.json(approved);
    } catch (err) {
      console.error("Error fetching testimonies:", err);
      res.status(500).json({ message: "Could not fetch testimonies" });
    }
  });

  app.get("/api/testimonies/all", requireAdmin, async (req, res) => {
    try {
      const all = await storage.getAllTestimonies();
      res.json(all);
    } catch (err) {
      console.error("Error fetching all testimonies:", err);
      res.status(500).json({ message: "Could not fetch testimonies" });
    }
  });

  app.post("/api/testimonies", async (req, res) => {
    try {
      const { message, name, country, photoUrl, requestId } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Testimony message is required" });
      }
      const testimony = await storage.createTestimony({
        message: message.trim(),
        name: name?.trim() || null,
        country: country?.trim() || null,
        photoUrl: photoUrl || null,
        requestId: requestId || null,
      });
      res.status(201).json(testimony);
    } catch (err) {
      console.error("Conversation reply could not be saved.", err);
      res.status(500).json({ message: "Could not save testimony" });
    }
  });

  app.patch("/api/testimonies/:id/approve", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const testimony = await storage.approveTestimony(id);
      res.json(testimony);
    } catch (err) {
      console.error("Error approving testimony:", err);
      res.status(500).json({ message: "Could not approve testimony" });
    }
  });

  app.delete("/api/testimonies/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      await storage.deleteTestimony(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting testimony:", err);
      res.status(500).json({ message: "Could not delete testimony" });
    }
  });

  // ── Songs — Song of the Week ──────────────────────────────────────────────

  // Public: get currently featured song
  app.get("/api/songs/featured", async (req, res) => {
    try {
      const song = await storage.getFeaturedSong();
      if (!song) return res.status(404).json({ message: "No featured song found" });
      res.json(song);
    } catch (err) {
      console.error("Error fetching featured song:", err);
      res.status(500).json({ message: "Could not fetch featured song" });
    }
  });

  // Public: list all active songs for the SpiritTone Music library
  app.get("/api/songs/library", async (req, res) => {
    try {
      const allSongs = await storage.getPublicSongs();
      res.json(allSongs);
    } catch (err) {
      console.error("Error fetching public songs:", err);
      res.status(500).json({ message: "Could not fetch songs" });
    }
  });

  // Public: get song by slug (for song detail page)
  app.get("/api/songs/by-slug/:slug", async (req, res) => {
    try {
      const song = await storage.getSongBySlug(req.params.slug);
      if (!song || !song.isActive) return res.status(404).json({ message: "Song not found" });
      res.json(song);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch song" });
    }
  });

  // Admin: list all songs
  app.get("/api/songs", requireAdmin, async (req, res) => {
    try {
      const allSongs = await storage.getSongs();
      res.json(allSongs);
    } catch (err) {
      console.error("Error fetching songs:", err);
      res.status(500).json({ message: "Could not fetch songs" });
    }
  });

  // Admin: get song by id
  app.get("/api/songs/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const song = await storage.getSong(id);
      if (!song) return res.status(404).json({ message: "Song not found" });
      res.json(song);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch song" });
    }
  });

  // Admin: create song
  app.post("/api/songs", requireAdmin, async (req, res) => {
    try {
      const data = req.body;
      if (!data.title || !data.slug || !data.scriptureReference) {
        return res.status(400).json({ message: "title, slug, and scriptureReference are required" });
      }
      const song = await storage.createSong(data);
      res.status(201).json(song);
    } catch (err) {
      console.error("Error creating song:", err);
      res.status(500).json({ message: "Could not create song" });
    }
  });

  // Admin: update song
  app.patch("/api/songs/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const song = await storage.updateSong(id, req.body);
      res.json(song);
    } catch (err) {
      console.error("Error updating song:", err);
      res.status(500).json({ message: "Could not update song" });
    }
  });

  // Admin: delete song
  app.delete("/api/songs/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      await storage.deleteSong(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting song:", err);
      res.status(500).json({ message: "Could not delete song" });
    }
  });

  // Public: stream audio for listening (no download headers)
  app.get("/api/songs/:id/audio", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const song = await storage.getSong(id);
      if (!song || !song.isActive) return res.status(404).json({ message: "Song not found" });
      if (!song.audioUrl) return res.status(404).json({ message: "No audio file" });

      const { ObjectStorageService } = await import("./replit_integrations/object_storage/index.js");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(song.audioUrl);

      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": (metadata.contentType as string) || "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      });
      if (metadata.size) res.set("Content-Length", String(metadata.size));

      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Song audio stream error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Error streaming audio" });
      });
      stream.pipe(res);
    } catch (err: any) {
      if (err?.name === "ObjectNotFoundError") return res.status(404).json({ message: "Audio file not found" });
      res.status(500).json({ message: "Streaming failed" });
    }
  });

  // Public: free promotional download — streams audio with safe filename
  app.get("/api/songs/:id/download", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const song = await storage.getSong(id);
      if (!song) return res.status(404).json({ message: "Song not found" });
      if (song.downloadStatus !== "free") {
        return res.status(403).json({ message: "Download is not available for this song" });
      }
      if (!song.audioUrl) {
        return res.status(404).json({ message: "No audio file associated with this song" });
      }

      const { ObjectStorageService } = await import("./replit_integrations/object_storage/index.js");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(song.audioUrl);

      const [metadata] = await file.getMetadata();
      const contentType = (metadata.contentType as string) || "audio/mpeg";
      const ext = contentType.includes("mp4") || contentType.includes("m4a") ? ".m4a"
        : contentType.includes("wav") ? ".wav"
        : contentType.includes("ogg") ? ".ogg"
        : ".mp3";

      const safeTitle = song.title
        .replace(/[^\w\s-]/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .substring(0, 80) || "song";

      res.set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}${ext}"`,
        "Cache-Control": "private, no-store",
      });
      if (metadata.size) res.set("Content-Length", String(metadata.size));

      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Song download stream error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Error streaming audio file" });
      });
      stream.pipe(res);
    } catch (err: any) {
      console.error("Song download error:", err);
      if (err?.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Audio file not found in storage" });
      }
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Public: get active giving methods (voluntary support)
  app.get("/api/giving-methods", async (_req, res) => {
    try {
      const methods = await storage.getGivingMethods(true);
      res.json(methods);
    } catch (err) {
      console.error("Error fetching giving methods:", err);
      res.status(500).json({ message: "Could not fetch giving methods" });
    }
  });

  // Admin: get all giving methods
  app.get("/api/giving-methods/all", requireAdmin, async (_req, res) => {
    try {
      const methods = await storage.getGivingMethods(false);
      res.json(methods);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch giving methods" });
    }
  });

  // Admin: create giving method
  app.post("/api/giving-methods", requireAdmin, async (req, res) => {
    try {
      const { name, type, url, handle, instructions, isActive, displayOrder } = req.body;
      if (!name || !type) return res.status(400).json({ message: "name and type are required" });
      const method = await storage.createGivingMethod({
        name, type, url: url || null, handle: handle || null,
        instructions: instructions || null,
        isActive: !!isActive,
        displayOrder: Number(displayOrder) || 0,
      });
      res.json(method);
    } catch (err) {
      console.error("Error creating giving method:", err);
      res.status(500).json({ message: "Could not create giving method" });
    }
  });

  // Admin: update giving method
  app.patch("/api/giving-methods/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const updated = await storage.updateGivingMethod(id, req.body);
      if (!updated) return res.status(404).json({ message: "Giving method not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating giving method:", err);
      res.status(500).json({ message: "Could not update giving method" });
    }
  });

  // Admin: delete giving method
  app.delete("/api/giving-methods/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      await storage.deleteGivingMethod(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Could not delete giving method" });
    }
  });

  // Public: submit song testimony
  app.post("/api/song-testimonies", async (req, res) => {
    try {
      const { songId, name, isAnonymous, email, testimony, consentToPublish, songTitle } = req.body;
      if (!songId || !name || !testimony || !songTitle) {
        return res.status(400).json({ message: "songId, name, testimony, and songTitle are required" });
      }
      if (typeof testimony !== "string" || testimony.trim().length < 10) {
        return res.status(400).json({ message: "Testimony must be at least 10 characters" });
      }
      if (testimony.trim().length > 2000) {
        return res.status(400).json({ message: "Testimony must be under 2000 characters" });
      }
      const created = await storage.createSongTestimony({
        songId: Number(songId),
        name: name.trim().substring(0, 100),
        isAnonymous: Boolean(isAnonymous),
        email: email?.trim() || null,
        testimony: testimony.trim(),
        consentToPublish: Boolean(consentToPublish),
        songTitle: songTitle.trim().substring(0, 200),
      });
      // Return without email for privacy
      const { email: _email, ...safe } = created;
      res.status(201).json(safe);
    } catch (err) {
      console.error("Error submitting song testimony:", err);
      res.status(500).json({ message: "Could not submit testimony" });
    }
  });

  // Admin: list song testimonies (all or by song)
  app.get("/api/song-testimonies", requireAdmin, async (req, res) => {
    try {
      const songId = req.query.songId ? Number(req.query.songId) : undefined;
      const list = await storage.getSongTestimonies(songId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch song testimonies" });
    }
  });

  // Admin: approve/feature/reject testimony
  app.patch("/api/song-testimonies/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const updated = await storage.updateSongTestimony(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Could not update testimony" });
    }
  });

  // Admin: delete song testimony
  app.delete("/api/song-testimonies/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      await storage.deleteSongTestimony(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Could not delete testimony" });
    }
  });

  // ── End Songs ─────────────────────────────────────────────────────────────

  // Quick Prayer ("Pray With Someone Now")
  app.post("/api/quick-prayer", async (req, res) => {
    try {
      const { name, message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Prayer request message is required" });
      }
      const prayerRequest = await storage.createPrayerRequest({
        fullName: name?.trim() || null,
        email: null,
        phoneNumber: null,
        smsEnabled: false,
        subject: "Pray With Someone Now",
        message: message.trim(),
        isAnonymous: !name?.trim(),
        priority: "prayer_urgent",
        category: "other",
      });
      res.status(201).json({ success: true, id: prayerRequest.id });
    } catch (err) {
      console.error("Conversation reply could not be saved.", err);
      res.status(500).json({ message: "Could not save prayer request" });
    }
  });

  // Prayer Follow-Up Messages
  app.get("/api/prayer-requests/:id/follow-ups", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const followUps = await storage.getFollowUpsForRequest(id);
      res.json(followUps);
    } catch (err) {
      console.error("Error fetching follow-ups:", err);
      res.status(500).json({ message: "Could not fetch follow-ups" });
    }
  });

  app.post("/api/create-donation-session", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ message: "Card payments are not currently available. Please use PayPal or Cash App." });
      }

      const { amount, donorName, note, purpose } = req.body;

      if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
        return res.status(400).json({ message: "Please enter a valid donation amount." });
      }

      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(stripeKey);

      const amountCents = Math.round(Number(amount) * 100);
      const description = `${purpose || "General Ministry Support"}${donorName ? ` - ${donorName}` : ""}${note ? ` - ${note}` : ""}`;

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Ministry Donation",
                description,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/donation-success`,
        cancel_url: `${baseUrl}/donate`,
      });

      res.json({ checkoutUrl: session.url });
    } catch (err: any) {
      console.error("Stripe donation error:", err.message || err);
      res.status(500).json({ message: "Payment could not be started. Please try again." });
    }
  });

  // Seed Data if empty
  await seedDatabase();
  await seedAutoReplyTemplates();
  await seedSampleSong();

  // =========== PROMISE OF GOD ROUTES ===========

  app.get("/api/promise/current", async (_req, res) => {
    try {
      const result = await getCurrentPromise();
      res.json(result);
    } catch (err) {
      console.error("Error getting current promise:", err);
      res.status(500).json({ message: "Could not get current promise" });
    }
  });

  app.get("/api/promise/next", async (_req, res) => {
    try {
      const result = await getNextPromise();
      res.json(result);
    } catch (err) {
      console.error("Error getting next promise:", err);
      res.status(500).json({ message: "Could not get next promise" });
    }
  });

  app.post("/api/promise/advance", requireAdmin, async (_req, res) => {
    try {
      const result = await advancePromise();
      res.json(result);
    } catch (err) {
      console.error("Error advancing promise:", err);
      res.status(500).json({ message: "Could not advance promise" });
    }
  });

  app.post("/api/promise/reset", requireAdmin, async (_req, res) => {
    try {
      await resetRotation();
      res.json({ success: true });
    } catch (err) {
      console.error("Error resetting promise rotation:", err);
      res.status(500).json({ message: "Could not reset promise rotation" });
    }
  });

  app.patch("/api/promise/toggle", requireAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      const result = await toggleEnabled(enabled);
      res.json({ isEnabled: result });
    } catch (err) {
      console.error("Error toggling promise notifications:", err);
      res.status(500).json({ message: "Could not toggle promise notifications" });
    }
  });

  app.get("/api/promise/stats", requireAdmin, async (_req, res) => {
    try {
      const current = await getCurrentPromise();
      const next = await getNextPromise();
      res.json({
        total: getTotalPromises(),
        currentIndex: current.index,
        isEnabled: current.isEnabled,
        currentPromise: current.promise,
        nextPromise: next.promise,
      });
    } catch (err) {
      console.error("Error getting promise stats:", err);
      res.status(500).json({ message: "Could not get promise stats" });
    }
  });

  app.post("/api/promise/amen", async (req, res) => {
    try {
      const { promiseId } = req.body;
      if (typeof promiseId !== "number") {
        return res.status(400).json({ message: "promiseId must be a number" });
      }
      const sessionId = req.sessionID || null;
      await db.insert(promiseAmens).values({ promiseId, sessionId });
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(promiseAmens).where(eq(promiseAmens.promiseId, promiseId));
      res.json({ success: true, totalAmens: countResult.count });
    } catch (err) {
      console.error("Error recording amen:", err);
      res.status(500).json({ message: "Could not record amen" });
    }
  });

  app.get("/api/promise/amen-count/:promiseId", async (req, res) => {
    try {
      const promiseId = parseInt(req.params.promiseId);
      if (isNaN(promiseId)) return res.status(400).json({ message: "Invalid promiseId" });
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(promiseAmens).where(eq(promiseAmens.promiseId, promiseId));
      res.json({ totalAmens: countResult.count });
    } catch (err) {
      res.status(500).json({ message: "Could not get amen count" });
    }
  });

  app.get("/api/promise/amen-analytics", requireAdmin, async (_req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const totalAmens = await db.select({ count: sql<number>`count(*)::int` }).from(promiseAmens);

      const topToday = await db
        .select({ promiseId: promiseAmens.promiseId, count: sql<number>`count(*)::int` })
        .from(promiseAmens)
        .where(gte(promiseAmens.createdAt, todayStart))
        .groupBy(promiseAmens.promiseId)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      const topWeek = await db
        .select({ promiseId: promiseAmens.promiseId, count: sql<number>`count(*)::int` })
        .from(promiseAmens)
        .where(gte(promiseAmens.createdAt, weekStart))
        .groupBy(promiseAmens.promiseId)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      const topAllTime = await db
        .select({ promiseId: promiseAmens.promiseId, count: sql<number>`count(*)::int` })
        .from(promiseAmens)
        .groupBy(promiseAmens.promiseId)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      res.json({
        totalAmens: totalAmens[0].count,
        topToday,
        topWeek,
        topAllTime,
      });
    } catch (err) {
      console.error("Error getting amen analytics:", err);
      res.status(500).json({ message: "Could not get amen analytics" });
    }
  });

  // Run prayer follow-ups on startup and every 6 hours
  import("./prayer-followups").then(({ runPrayerFollowUps }) => {
    runPrayerFollowUps().catch(err => console.error("[FollowUp] Initial run error:", err));
    setInterval(() => {
      runPrayerFollowUps().catch(err => console.error("[FollowUp] Scheduled run error:", err));
    }, 6 * 60 * 60 * 1000);
  });

  startPromiseScheduler();

  // ============================================
  // INBOX ROUTES — User endpoints
  // ============================================

  app.post("/api/inbox/threads", async (req, res) => {
    try {
      const schema = z.object({
        userEmail: z.string().email(),
        userName: z.string().min(1),
        subject: z.string().min(1),
        category: z.enum(INBOX_CATEGORIES as unknown as [string, ...string[]]),
        message: z.string().min(1),
      });
      const data = schema.parse(req.body);
      const thread = await storage.createInboxThread(
        {
          userEmail: data.userEmail.toLowerCase(),
          userName: data.userName,
          subject: data.subject,
          category: data.category,
        },
        data.message
      );

      generateAIEncouragement(data.category, data.message)
        .then(async (aiMessage) => {
          await storage.createInboxMessage({
            threadId: thread.id,
            senderType: "ai",
            message: aiMessage,
          });
        })
        .catch((err) => console.error("AI encouragement failed:", err));

      res.status(201).json(thread);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create inbox thread error:", error);
      res.status(500).json({ message: "Failed to create thread" });
    }
  });

  app.get("/api/inbox/threads", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const threads = await storage.getInboxThreadsByEmail(email.toLowerCase());
      const threadsWithPreview = await Promise.all(
        threads.map(async (thread) => {
          const lastMsg = await storage.getLastInboxMessage(thread.id);
          return {
            ...thread,
            lastMessage: lastMsg?.message?.substring(0, 100) || "",
            lastMessageDate: lastMsg?.createdAt || thread.createdAt,
            lastMessageSender: lastMsg?.senderType || "user",
          };
        })
      );
      res.json(threadsWithPreview);
    } catch (error) {
      console.error("Get inbox threads error:", error);
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  app.get("/api/inbox/threads/:id", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const thread = await storage.getInboxThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      if (thread.userEmail !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.markInboxThreadRead(thread.id, "user");
      const messages = await storage.getInboxMessages(thread.id, "user");
      res.json({ thread: { ...thread, hasUnreadUser: false }, messages });
    } catch (error) {
      console.error("Get inbox thread error:", error);
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.post("/api/inbox/threads/:id/messages", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const thread = await storage.getInboxThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      if (thread.userEmail !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (thread.status === "closed") {
        return res.status(400).json({ message: "This conversation has been closed" });
      }
      const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
      const created = await storage.createInboxMessage({
        threadId: thread.id,
        senderType: "user",
        message,
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Send inbox message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.delete("/api/inbox/messages/:id", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const messageId = parseInt(req.params.id);
      const threadId = req.query.threadId as string;
      if (!threadId) return res.status(400).json({ message: "Thread ID is required" });
      const thread = await storage.getInboxThread(parseInt(threadId));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      if (thread.userEmail !== email.toLowerCase()) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteInboxMessage(messageId, "user");
      res.json({ success: true });
    } catch (error) {
      console.error("Delete inbox message error:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // ============================================
  // INBOX ROUTES — Admin endpoints
  // ============================================

  app.get("/api/admin/inbox/threads", requireAdmin, async (req, res) => {
    try {
      const filters: { category?: string; status?: string } = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.status) filters.status = req.query.status as string;
      const threads = await storage.getAllInboxThreads(filters);
      const threadsWithPreview = await Promise.all(
        threads.map(async (thread) => {
          const lastMsg = await storage.getLastInboxMessage(thread.id);
          return {
            ...thread,
            lastMessage: lastMsg?.message?.substring(0, 100) || "",
            lastMessageDate: lastMsg?.createdAt || thread.createdAt,
            lastMessageSender: lastMsg?.senderType || "user",
          };
        })
      );
      res.json(threadsWithPreview);
    } catch (error) {
      console.error("Admin get inbox threads error:", error);
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  app.get("/api/admin/inbox/threads/:id", requireAdmin, async (req, res) => {
    try {
      const thread = await storage.getInboxThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      await storage.markInboxThreadRead(thread.id, "admin");
      const messages = await storage.getInboxMessages(thread.id, "admin");
      res.json({ thread: { ...thread, hasUnreadAdmin: false }, messages });
    } catch (error) {
      console.error("Admin get inbox thread error:", error);
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.post("/api/admin/inbox/threads/:id/messages", requireAdmin, async (req, res) => {
    try {
      const thread = await storage.getInboxThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
      const created = await storage.createInboxMessage({
        threadId: thread.id,
        senderType: "admin",
        message,
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Admin send inbox message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/admin/inbox/threads/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = z.object({ status: z.enum(["open", "replied", "closed"]) }).parse(req.body);
      const updated = await storage.updateInboxThreadStatus(parseInt(req.params.id), status);
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Admin update thread status error:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/admin/inbox/messages/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteInboxMessage(parseInt(req.params.id), "admin");
      res.json({ success: true });
    } catch (error) {
      console.error("Admin delete inbox message error:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getDevotionals();
  if (existing.length === 0) {
    const today = getTodayDateString();
    
    await storage.createDevotional({
      date: today,
      title: "Walking in Wisdom",
      scriptureReference: "Proverbs 4:7",
      scriptureText: "Wisdom is the principal thing; therefore get wisdom.",
      content: "Wisdom is not just knowledge; it is the application of knowledge. As we navigate through life, we must seek God’s wisdom in every decision we make. It guides our path and protects us from stumbling. Today, ask the Lord to open your eyes to His wisdom in every situation.",
      prayerPoints: [
        "Lord, grant me wisdom in every decision I make",
        "Help me to hear Your voice clearly",
        "Guide my steps in righteousness"
      ],
      faithDeclarations: [
        "I walk in divine wisdom daily",
        "I have the mind of Christ",
        "My steps are ordered by the Lord"
      ],
      author: "Moses Afolabi"
    });

    console.log("Database seeded with initial devotional.");
  }
}

async function seedSampleSong() {
  const existing = await storage.getFeaturedSong();
  if (existing) return; // Already have a song
  try {
    await storage.createSong({
      title: "The Lord Is My Shepherd",
      slug: "the-lord-is-my-shepherd",
      artist: null,
      featuredArtist: null,
      labelName: "SpiritTone Records",
      labelLogoUrl: null,
      producer: "Moses Afolabi",
      composer: "Moses Afolabi",
      lyricist: "Moses Afolabi",
      scriptureReference: "Psalm 23:1",
      scriptureText: "The LORD is my shepherd; I shall not want.",
      lyrics: `[Verse 1]
The Lord is my Shepherd, I shall not want
He leads me beside still waters
He restores my weary soul
In paths of righteousness I'll walk

[Chorus]
You are my Shepherd, my Provider
My Comforter, my Guide
I will not fear the valley of shadows
For You are by my side

[Verse 2]
He prepares a table before me
In the presence of my enemies
He anoints my head with oil
My cup it overflows with peace

[Chorus]
You are my Shepherd, my Provider
My Comforter, my Guide
I will not fear the valley of shadows
For You are by my side

[Bridge]
Surely goodness and mercy
Shall follow me all my days
And I will dwell in the house of the Lord
Forever I will give Him praise

[Outro]
The Lord is my Shepherd
The Lord is my Shepherd
I shall not want
I shall not want`,
      audioUrl: null,
      coverImageUrl: null,
      description: "A peaceful worship melody inspired by the timeless words of Psalm 23, reminding us of God's faithful guidance, provision, and protection through every season of life.",
      isActive: true,
      featuredWeekStart: new Date().toISOString().split("T")[0],
      featuredWeekEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      releaseYear: 2026,
      copyrightNotice: "© 2026 SpiritTone Records. All rights reserved.",
      downloadStatus: "coming_soon",
    });
    console.log("[Songs] Sample song seeded.");
  } catch (err) {
    console.error("[Songs] Seed error:", err);
  }
}

async function seedAutoReplyTemplates() {
  const templates = await storage.getAutoReplyTemplates();
  if (templates.length === 0) {
    const defaultTemplates = [
      {
        templateType: "prayer_normal",
        encouragement: "Thank you for trusting us with your prayer request. God hears every prayer and cares deeply for you.",
        scriptureReference: "Philippians 4:6-7 (NLT)",
        scriptureText: "Don't worry about anything; instead, pray about everything. Tell God what you need, and thank him for all he has done. Then you will experience God's peace, which exceeds anything we can understand.",
        prayer: "Lord, we lift this request to You. You know every need and every heart. Bring Your peace and answer according to Your perfect will. In Jesus' name, Amen.",
      },
      {
        templateType: "prayer_urgent",
        encouragement: "We understand the urgency of your situation. God is your refuge and strength, and He is with you right now.",
        scriptureReference: "Psalm 46:1 (NLT)",
        scriptureText: "God is our refuge and strength, always ready to help in times of trouble.",
        prayer: "Father, we bring this urgent need before You. You are the God who answers in the day of trouble. Move swiftly on behalf of Your child. We trust You completely. Amen.",
      },
      {
        templateType: "counseling_normal",
        encouragement: "Thank you for reaching out for guidance. God promises rest for the weary and wisdom for those who seek Him.",
        scriptureReference: "Matthew 11:28 (NLT)",
        scriptureText: "Then Jesus said, 'Come to me, all of you who are weary and carry heavy burdens, and I will give you rest.'",
        prayer: "Lord Jesus, give wisdom and clarity in this situation. Guide this dear one in the way they should go, and grant them Your peace as they wait. Amen.",
      },
      {
        templateType: "counseling_urgent",
        encouragement: "We hear you, and we are here for you. Jesus invites the burdened to come to Him for rest.",
        scriptureReference: "Matthew 11:28 (NLT)",
        scriptureText: "Then Jesus said, 'Come to me, all of you who are weary and carry heavy burdens, and I will give you rest.'",
        prayer: "Heavenly Father, we ask for Your immediate presence and comfort. Surround this person with Your love and give them hope. We trust You to carry them through. In Jesus' name, Amen.",
      },
    ];

    for (const template of defaultTemplates) {
      await storage.upsertAutoReplyTemplate(template);
    }

    console.log("Auto-reply templates seeded.");
  }
}
