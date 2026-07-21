import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { sendPrayerReplyNotification, sendContactMessageNotification, sendContactAutoReply, sendGeneralInquiryNotification, sendFeedbackNotification, sendPartnershipNotification, sendDonationThankYouEmail } from "./sendgrid";
import { sendSmsNotification, isValidE164PhoneNumber } from "./twilio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getTodayDateString, isFutureDate, isPastDate, getDayOfYear } from "./date-utils";
import { seedAllDevotionals } from "./seed-devotionals";
import { getOrCreateTranslation, isAllowedLanguage, getCachedTranslationsForLanguage } from "./translationService";
import { getCurrentPromise, getNextPromise, advancePromise, resetRotation, toggleEnabled, getTotalPromises, startPromiseScheduler } from "./promiseEngine";
import { generateAIEncouragement } from "./inbox-ai";
import { promiseAmens, INBOX_CATEGORIES, insertDonationConfirmationSchema, churchTransactions } from "@shared/schema";
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

// ── Firebase ID-token verification ──────────────────────────────────────────
const FIREBASE_CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let _certCache: { certs: Record<string, string>; expiry: number } | null = null;

async function getFirebaseCerts(): Promise<Record<string, string>> {
  if (_certCache && Date.now() < _certCache.expiry) return _certCache.certs;
  const resp = await fetch(FIREBASE_CERT_URL);
  const certs = (await resp.json()) as Record<string, string>;
  _certCache = { certs, expiry: Date.now() + 3_600_000 };
  return certs;
}

const FIREBASE_PROJECT_ID = "loopnest-app";

async function verifyFirebaseToken(idToken: string): Promise<string> {
  const certs = await getFirebaseCerts();
  const client = new OAuth2Client();
  const ticket = await (client as any).verifySignedJwtWithCertsAsync(
    idToken,
    certs,
    FIREBASE_PROJECT_ID,
    [`https://securetoken.google.com/${FIREBASE_PROJECT_ID}`]
  );
  const payload = ticket.getPayload() as Record<string, any>;
  return payload.sub as string;
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Your sign-in session was not included. Please refresh the page and try again." });
  }
  const token = header.slice(7);
  verifyFirebaseToken(token)
    .then((uid) => {
      (req as any).uid = uid;
      next();
    })
    .catch(() => res.status(401).json({ message: "Your session has expired. Please sign in again." }));
}
// ──────────────────────────────────────────────────────────────────────────────

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
      
      // Optionally link to Firebase UID if user is signed in
      let firebaseUid: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          firebaseUid = await verifyFirebaseToken(authHeader.slice(7));
        } catch {
          // token invalid or expired — continue as guest
        }
      }

      // Ensure smsEnabled is false if no valid phone number
      const sanitizedInput = {
        ...input,
        smsEnabled: input.smsEnabled && !!input.phoneNumber && isValidE164PhoneNumber(input.phoneNumber),
        ...(firebaseUid ? { firebaseUid } : {}),
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

  app.patch("/api/testimonies/:id/reject", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const testimony = await storage.rejectTestimony(id);
      res.json(testimony);
    } catch (err) {
      console.error("Error rejecting testimony:", err);
      res.status(500).json({ message: "Could not reject testimony" });
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
      if (song.downloadStatus === "disabled") {
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

  // Public: free promotional video download — streams MP4 with safe filename
  app.get("/api/songs/:id/download-video", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const song = await storage.getSong(id);
      if (!song) return res.status(404).json({ message: "Song not found" });
      if ((song as any).videoDownloadStatus === "disabled") {
        return res.status(403).json({ message: "Video download is not available for this song" });
      }
      if (!(song as any).videoUrl) {
        return res.status(404).json({ message: "No video file associated with this song" });
      }

      const { ObjectStorageService } = await import("./replit_integrations/object_storage/index.js");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile((song as any).videoUrl);
      const [metadata] = await file.getMetadata();
      const contentType = (metadata.contentType as string) || "video/mp4";

      const safeTitle = song.title
        .replace(/[^\w\s-]/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .substring(0, 80) || "song";

      res.set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
        "Cache-Control": "private, no-store",
      });
      if (metadata.size) res.set("Content-Length", String(metadata.size));

      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Song video download stream error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Error streaming video file" });
      });
      stream.pipe(res);
    } catch (err: any) {
      console.error("Song video download error:", err);
      if (err?.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Video file not found in storage" });
      }
      res.status(500).json({ message: "Video download failed" });
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

  // ── User Library Routes ────────────────────────────────────────────────────

  // GET saved songs
  app.get("/api/user/library/saved", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songs = await storage.getUserSavedSongs(uid);
      res.json(songs);
    } catch (err) {
      console.error("Get saved songs:", err);
      res.status(500).json({ message: "Could not fetch saved songs" });
    }
  });

  // POST save a song
  app.post("/api/user/library/saved", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.body.songId);
      if (isNaN(songId)) return res.status(400).json({ message: "songId required" });
      const row = await storage.saveSong(uid, songId);
      res.json(row);
    } catch (err) {
      console.error("Save song:", err);
      res.status(500).json({ message: "Could not save song" });
    }
  });

  // DELETE unsave a song
  app.delete("/api/user/library/saved/:songId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.params.songId);
      if (isNaN(songId)) return res.status(400).json({ message: "Invalid songId" });
      await storage.unsaveSong(uid, songId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Could not remove saved song" });
    }
  });

  // GET favorite songs
  app.get("/api/user/library/favorites", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songs = await storage.getUserFavoriteSongs(uid);
      res.json(songs);
    } catch (err) {
      console.error("Get favorites:", err);
      res.status(500).json({ message: "Could not fetch favorites" });
    }
  });

  // POST add favorite
  app.post("/api/user/library/favorites", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.body.songId);
      if (isNaN(songId)) return res.status(400).json({ message: "songId required" });
      const row = await storage.favoriteSong(uid, songId);
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: "Could not add favorite" });
    }
  });

  // DELETE remove favorite
  app.delete("/api/user/library/favorites/:songId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.params.songId);
      if (isNaN(songId)) return res.status(400).json({ message: "Invalid songId" });
      await storage.unfavoriteSong(uid, songId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Could not remove favorite" });
    }
  });

  // POST merge local favorites after sign-in
  app.post("/api/user/library/favorites/merge", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songIds: number[] = (req.body.songIds ?? []).map(Number).filter(Number.isFinite);
      if (!songIds.length) return res.json({ merged: 0 });
      await storage.mergeLocalFavorites(uid, songIds);
      res.json({ merged: songIds.length });
    } catch (err) {
      res.status(500).json({ message: "Could not merge favorites" });
    }
  });

  // GET download history
  app.get("/api/user/library/downloads", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const history = await storage.getUserDownloadHistory(uid);
      res.json(history);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch download history" });
    }
  });

  // POST record a download
  app.post("/api/user/library/downloads", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.body.songId);
      if (isNaN(songId)) return res.status(400).json({ message: "songId required" });
      const row = await storage.recordDownload(uid, songId);
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: "Could not record download" });
    }
  });

  // ── Playback History & Music Settings ─────────────────────────────────────
  app.get("/api/user/playback/history", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const history = await storage.getUserPlaybackHistory(uid);
      res.json(history);
    } catch {
      res.status(500).json({ message: "Failed to get playback history" });
    }
  });

  app.patch("/api/user/playback/:songId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const songId = Number(req.params.songId);
      if (!songId) return res.status(400).json({ message: "Invalid song ID" });
      const { lastPosition = 0, durationSecs = 0, progressPercent = 0 } = req.body;
      await storage.upsertPlaybackPosition(uid, songId, lastPosition, durationSecs, progressPercent);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to save position" });
    }
  });

  app.get("/api/user/music-settings", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const settings = await storage.getUserMusicSettings(uid);
      res.json(settings ?? {});
    } catch {
      res.status(500).json({ message: "Failed to get music settings" });
    }
  });

  app.put("/api/user/music-settings", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const { autoplayNext, rememberPosition, defaultSpeed, repeatMode, shuffle } = req.body;
      const settings = await storage.upsertUserMusicSettings(uid, { autoplayNext, rememberPosition, defaultSpeed, repeatMode, shuffle });
      res.json(settings);
    } catch {
      res.status(500).json({ message: "Failed to save music settings" });
    }
  });

  // ── Phase F: Devotional Account Sync ────────────────────────────────────────

  // Saved Devotionals
  app.get("/api/user/devotional/saved", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const saved = await storage.getSavedDevotionals(uid);
      res.json(saved);
    } catch {
      res.status(500).json({ message: "Failed to get saved devotionals" });
    }
  });

  app.post("/api/user/devotional/saved", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const { devotionalId } = req.body;
      if (!devotionalId || typeof devotionalId !== "number") return res.status(400).json({ message: "Invalid devotionalId" });
      await storage.saveDevotional(uid, devotionalId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to save devotional" });
    }
  });

  app.delete("/api/user/devotional/saved/:devotionalId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const devotionalId = parseInt(req.params.devotionalId);
      if (isNaN(devotionalId)) return res.status(400).json({ message: "Invalid devotionalId" });
      await storage.unsaveDevotional(uid, devotionalId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to unsave devotional" });
    }
  });

  app.get("/api/user/devotional/saved/:devotionalId/status", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const devotionalId = parseInt(req.params.devotionalId);
      if (isNaN(devotionalId)) return res.status(400).json({ saved: false });
      const saved = await storage.isDevotionalSaved(uid, devotionalId);
      res.json({ saved });
    } catch {
      res.status(500).json({ saved: false });
    }
  });

  app.post("/api/user/devotional/saved/merge", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const { devotionalIds } = req.body;
      if (!Array.isArray(devotionalIds)) return res.status(400).json({ message: "devotionalIds must be an array" });
      const ids = devotionalIds.filter((id): id is number => typeof id === "number");
      await storage.mergeLocalDevotionalSaves(uid, ids);
      res.json({ success: true, merged: ids.length });
    } catch {
      res.status(500).json({ message: "Failed to merge devotional saves" });
    }
  });

  // Reading History
  app.post("/api/user/devotional/history", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const { devotionalId } = req.body;
      if (!devotionalId || typeof devotionalId !== "number") return res.status(400).json({ message: "Invalid devotionalId" });
      await storage.recordDevotionalRead(uid, devotionalId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to record read" });
    }
  });

  app.get("/api/user/devotional/history", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const history = await storage.getDevotionalHistory(uid);
      res.json(history);
    } catch {
      res.status(500).json({ message: "Failed to get reading history" });
    }
  });

  // Reading Streak
  app.get("/api/user/devotional/streak", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const streak = await storage.getDevotionalStreak(uid);
      res.json(streak ?? { currentStreak: 0, longestStreak: 0, lastReadDate: null });
    } catch {
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.put("/api/user/devotional/streak", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const { currentStreak, longestStreak, lastReadDate } = req.body;
      if (typeof currentStreak !== "number" || typeof longestStreak !== "number" || typeof lastReadDate !== "string") {
        return res.status(400).json({ message: "Invalid streak data" });
      }
      const streak = await storage.upsertDevotionalStreak(uid, currentStreak, longestStreak, lastReadDate);
      res.json(streak);
    } catch {
      res.status(500).json({ message: "Failed to save streak" });
    }
  });

  // Private Notes
  app.get("/api/user/devotional/note/:devotionalId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const devotionalId = parseInt(req.params.devotionalId);
      if (isNaN(devotionalId)) return res.status(400).json({ message: "Invalid devotionalId" });
      const note = await storage.getDevotionalNote(uid, devotionalId);
      res.json(note ?? null);
    } catch {
      res.status(500).json({ message: "Failed to get note" });
    }
  });

  app.put("/api/user/devotional/note/:devotionalId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const devotionalId = parseInt(req.params.devotionalId);
      if (isNaN(devotionalId)) return res.status(400).json({ message: "Invalid devotionalId" });
      const { noteText } = req.body;
      if (typeof noteText !== "string" || noteText.trim().length === 0) return res.status(400).json({ message: "noteText required" });
      if (noteText.length > 1000) return res.status(400).json({ message: "Note exceeds 1000 character limit" });
      await storage.upsertDevotionalNote(uid, devotionalId, noteText.trim());
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to save note" });
    }
  });

  app.delete("/api/user/devotional/note/:devotionalId", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const devotionalId = parseInt(req.params.devotionalId);
      if (isNaN(devotionalId)) return res.status(400).json({ message: "Invalid devotionalId" });
      await storage.deleteDevotionalNote(uid, devotionalId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // ─── Phase G: User Prayer Routes ──────────────────────────────────────────

  // GET /api/user/prayers — signed-in user's own prayer requests
  app.get("/api/user/prayers", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const prayers = await storage.getPrayerRequestsByUid(uid);
      res.json(prayers);
    } catch {
      res.status(500).json({ message: "Failed to fetch prayers" });
    }
  });

  // POST /api/user/prayers/:id/answered — mark as answered (owner only)
  app.post("/api/user/prayers/:id/answered", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { answerNote } = req.body;
      const updated = await storage.markPrayerAnswered(id, uid, answerNote || undefined);
      if (!updated) return res.status(404).json({ message: "Prayer request not found or not owned by you" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to mark prayer as answered" });
    }
  });

  // DELETE /api/user/prayers/:id — withdraw (owner only, only if status is new)
  app.delete("/api/user/prayers/:id", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const updated = await storage.withdrawPrayerRequest(id, uid);
      if (!updated) return res.status(404).json({ message: "Prayer request not found, not owned by you, or no longer withdrawable" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to withdraw prayer request" });
    }
  });

  // PATCH /api/user/prayers/:id — edit subject/message (owner only, status must be new)
  app.patch("/api/user/prayers/:id", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { subject, message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const updated = await storage.updatePrayerRequestByUser(id, uid, { subject: subject || undefined, message: message.trim() });
      if (!updated) return res.status(404).json({ message: "Prayer request not found, not owned by you, or no longer editable" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update prayer request" });
    }
  });

  // GET /api/user/prayers/:id/testimony — get user's testimony draft for a prayer request
  app.get("/api/user/prayers/:id/testimony", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const testimony = await storage.getUserTestimony(id, uid);
      res.json(testimony ?? null);
    } catch {
      res.status(500).json({ message: "Failed to fetch testimony" });
    }
  });

  // PUT /api/user/prayers/:id/testimony — save testimony draft
  app.put("/api/user/prayers/:id/testimony", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { name, message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      if (message.trim().length > 2000) return res.status(400).json({ message: "Testimony must be under 2000 characters" });
      const testimony = await storage.upsertUserTestimony(id, uid, { name: name?.trim() || undefined, message: message.trim() });
      res.json(testimony);
    } catch {
      res.status(500).json({ message: "Failed to save testimony" });
    }
  });

  // POST /api/user/prayers/:id/testimony/submit — submit testimony for ministry review
  app.post("/api/user/prayers/:id/testimony/submit", requireUser, async (req, res) => {
    try {
      const uid = (req as any).uid as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const testimony = await storage.getUserTestimony(id, uid);
      if (!testimony) return res.status(404).json({ message: "No testimony draft found for this prayer request" });
      if (!testimony.isDraft) return res.status(400).json({ message: "Testimony already submitted for review" });
      const updated = await storage.submitTestimonyForReview(testimony.id, uid);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to submit testimony for review" });
    }
  });

  // ── Donation Confirmations ────────────────────────────────────────────────

  // POST /api/donation-confirmations — public, submit after donating
  app.post("/api/donation-confirmations", async (req, res) => {
    try {
      const parsed = insertDonationConfirmationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const confirmation = await storage.createDonationConfirmation(parsed.data);
      res.status(201).json(confirmation);
    } catch {
      res.status(500).json({ message: "Failed to record donation confirmation" });
    }
  });

  // GET /api/admin/donation-confirmations — admin only
  app.get("/api/admin/donation-confirmations", requireAdmin, async (req, res) => {
    try {
      const confirmations = await storage.getDonationConfirmations();
      res.json(confirmations);
    } catch {
      res.status(500).json({ message: "Failed to fetch donation confirmations" });
    }
  });

  // PATCH /api/admin/donation-confirmations/:id/thank-you-status — admin only
  app.patch("/api/admin/donation-confirmations/:id/thank-you-status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { status } = req.body;
      if (!["not_sent", "sent"].includes(status)) {
        return res.status(400).json({ message: "Status must be not_sent or sent" });
      }
      const updated = await storage.updateDonationConfirmationThankYouStatus(id, status);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update thank-you status" });
    }
  });

  // POST /api/admin/donation-confirmations/:id/send-thank-you — admin only
  app.post("/api/admin/donation-confirmations/:id/send-thank-you", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const all = await storage.getDonationConfirmations();
      const confirmation = all.find(c => c.id === id);
      if (!confirmation) return res.status(404).json({ message: "Confirmation not found" });
      let emailSent = false;
      if (confirmation.email) {
        emailSent = await sendDonationThankYouEmail(confirmation.email, confirmation.fullName, message.trim());
      }
      const updated = await storage.updateDonationConfirmationThankYouStatus(id, "sent");
      res.json({ updated, emailSent });
    } catch {
      res.status(500).json({ message: "Failed to send thank-you" });
    }
  });

  // ── Church Mode Routes — Phase 2A ────────────────────────────────────────────

  async function getUid(req: Request, res?: Response): Promise<string | null> {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) {
      if (res) res.status(401).json({ message: "Your sign-in session was not included. Please refresh the page and try again." });
      return null;
    }
    try {
      return await verifyFirebaseToken(h.slice(7));
    } catch {
      if (res) res.status(401).json({ message: "Your session has expired. Please sign in again." });
      return null;
    }
  }
  function churchSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 40)
      + "-" + Math.random().toString(36).substring(2, 6);
  }
  function inviteCode() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  }

  // Public: preview an invite code
  app.get("/api/church-invite/:code", async (req, res) => {
    try {
      const inv = await storage.getChurchInvitation(req.params.code.toUpperCase());
      if (!inv || !inv.isActive) return res.status(404).json({ message: "Invitation not found or no longer active" });
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "Invitation has expired" });
      if (inv.maxUses && inv.usedCount >= inv.maxUses) return res.status(410).json({ message: "Invitation has reached its limit" });
      const church = await storage.getChurch(inv.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      res.json({ church: { id: church.id, name: church.name, slug: church.slug, description: church.description, logoUrl: church.logoUrl, denomination: church.denomination }, invitation: { label: inv.label, expiresAt: inv.expiresAt } });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: create a church
  app.post("/api/churches", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const { name, description, denomination, address, websiteUrl, email, displayName } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Church name is required" });
      let slug = churchSlug(name.trim());
      for (let i = 0; i < 5 && await storage.getChurchBySlug(slug); i++) slug = churchSlug(name.trim());
      const church = await storage.createChurch({ name: name.trim(), slug, description: description?.trim() || null, denomination: denomination?.trim() || null, address: address?.trim() || null, websiteUrl: websiteUrl?.trim() || null, logoUrl: null, ownerId: uid, status: "active" });
      await storage.addChurchMember({ churchId: church.id, firebaseUid: uid, email: email || "", displayName: displayName || null, role: "owner", status: "active" });
      res.status(201).json(church);
    } catch (err) { console.error("Create church:", err); res.status(500).json({ message: "Failed to create church" }); }
  });

  // Auth: get user's church memberships
  app.get("/api/churches/my", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try { res.json(await storage.getUserChurches(uid)); } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: join a church via invite code
  app.post("/api/churches/join", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const { inviteCode: code, email, displayName } = req.body;
      if (!code?.trim()) return res.status(400).json({ message: "Invite code is required" });
      const inv = await storage.getChurchInvitation(code.trim().toUpperCase());
      if (!inv || !inv.isActive) return res.status(404).json({ message: "Invalid or expired invitation code" });
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "This invitation has expired" });
      if (inv.maxUses && inv.usedCount >= inv.maxUses) return res.status(410).json({ message: "This invitation has reached its maximum uses" });
      const already = await storage.getChurchMember(inv.churchId, uid);
      if (already?.status === "active") return res.json({ message: "Already a member", church: await storage.getChurch(inv.churchId) });
      await storage.addChurchMember({ churchId: inv.churchId, firebaseUid: uid, email: email || "", displayName: displayName || null, role: "member", status: "active" });
      await storage.useChurchInvitation(inv.inviteCode);
      res.json({ message: "Joined successfully", church: await storage.getChurch(inv.churchId) });
    } catch (err) { console.error("Join church:", err); res.status(500).json({ message: "Failed to join church" }); }
  });

  // Public: get church by slug
  app.get("/api/churches/slug/:slug", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      res.json(church);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: get current user's role in a church
  app.get("/api/churches/slug/:slug/my-role", async (req, res) => {
    const uid = await getUid(req); // intentionally permissive — returns null role for unauthenticated
    if (!uid) return res.json({ role: null });
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const member = await storage.getChurchMember(church.id, uid);
      res.json({ role: member?.role ?? null, memberId: member?.id ?? null, status: member?.status ?? null });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: update church (owner/admin/lead_pastor)
  app.patch("/api/churches/:id", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const church = await storage.getChurch(id);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, denomination, address, websiteUrl, logoUrl } = req.body;
      res.json(await storage.updateChurch(id, { name, description, denomination, address, websiteUrl, logoUrl }));
    } catch { res.status(500).json({ message: "Failed to update church" }); }
  });

  // Auth: get members (any active member)
  app.get("/api/churches/:id/members", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member of this church" });
      res.json(await storage.getChurchMembers(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: update member role/status (owner/admin)
  app.patch("/api/churches/:id/members/:memberId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(id, uid);
      if (!requester || !["owner", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const { role, status } = req.body;
      let updated;
      if (role !== undefined) updated = await storage.updateChurchMemberRole(memberId, role);
      if (status !== undefined) updated = await storage.updateChurchMemberStatus(memberId, status);
      if (!updated) return res.status(400).json({ message: "Nothing to update" });
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update member" }); }
  });

  // Auth: remove a member (owner/admin or self-leave)
  app.delete("/api/churches/:id/members/:memberId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(id, uid);
      if (!requester) return res.status(403).json({ message: "Not a member" });
      const all = await storage.getChurchMembers(id);
      const target = all.find(m => m.id === memberId);
      if (!target) return res.status(404).json({ message: "Member not found" });
      if (target.firebaseUid !== uid && !["owner", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      if (target.role === "owner" && all.filter(m => m.role === "owner").length <= 1) return res.status(400).json({ message: "Cannot remove the only owner" });
      await storage.removeChurchMember(id, target.firebaseUid);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to remove member" }); }
  });

  // Auth: create invitation (owner/admin/lead_pastor)
  app.post("/api/churches/:id/invitations", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { label, expiresAt, maxUses } = req.body;
      let code = inviteCode();
      for (let i = 0; i < 10 && await storage.getChurchInvitation(code); i++) code = inviteCode();
      res.status(201).json(await storage.createChurchInvitation({ churchId: id, inviteCode: code, createdBy: uid, label: label || null, expiresAt: expiresAt ? new Date(expiresAt) : null, maxUses: maxUses || null, isActive: true }));
    } catch { res.status(500).json({ message: "Failed to create invitation" }); }
  });

  // Auth: list invitations
  app.get("/api/churches/:id/invitations", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchInvitations(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: deactivate an invitation
  app.delete("/api/churches/:id/invitations/:invId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const invId = Number(req.params.invId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deactivateChurchInvitation(invId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to deactivate invitation" }); }
  });

  // ── Church Sermons ──────────────────────────────────────────────────────────
  app.get("/api/churches/:id/sermons", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchSermons(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/sermons", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, description, speakerName, videoUrl, audioUrl, bibleReference, sermonDate } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      res.status(201).json(await storage.createChurchSermon({
        churchId: id, title: title.trim(), description: description?.trim() || null,
        speakerName: speakerName?.trim() || null, videoUrl: videoUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null, bibleReference: bibleReference?.trim() || null,
        sermonDate: sermonDate ? new Date(sermonDate) : null, isPublished: true, createdBy: uid,
      }));
    } catch { res.status(500).json({ message: "Failed to create sermon" }); }
  });

  app.patch("/api/churches/:id/sermons/:sermonId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, description, speakerName, videoUrl, audioUrl, bibleReference, sermonDate, isPublished } = req.body;
      res.json(await storage.updateChurchSermon(sermonId, { title, description, speakerName, videoUrl, audioUrl, bibleReference, sermonDate: sermonDate ? new Date(sermonDate) : undefined, isPublished }));
    } catch { res.status(500).json({ message: "Failed to update sermon" }); }
  });

  app.delete("/api/churches/:id/sermons/:sermonId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchSermon(sermonId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete sermon" }); }
  });

  // ── Church Announcements ────────────────────────────────────────────────────
  app.get("/api/churches/:id/announcements", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchAnnouncements(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/announcements", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, body, isPinned, expiresAt } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
      res.status(201).json(await storage.createChurchAnnouncement({
        churchId: id, title: title.trim(), body: body.trim(),
        isPinned: !!isPinned, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: uid,
      }));
    } catch { res.status(500).json({ message: "Failed to create announcement" }); }
  });

  app.patch("/api/churches/:id/announcements/:annId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const annId = Number(req.params.annId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, body, isPinned, expiresAt } = req.body;
      res.json(await storage.updateChurchAnnouncement(annId, { title, body, isPinned, expiresAt: expiresAt ? new Date(expiresAt) : undefined }));
    } catch { res.status(500).json({ message: "Failed to update announcement" }); }
  });

  app.delete("/api/churches/:id/announcements/:annId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const annId = Number(req.params.annId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchAnnouncement(annId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete announcement" }); }
  });

  // ── Church Groups ───────────────────────────────────────────────────────────
  app.get("/api/churches/:id/groups", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const groups = await storage.getChurchGroups(id);
      const enriched = await Promise.all(groups.map(async (g) => {
        const members = await storage.getChurchGroupMembers(g.id);
        const myMembership = members.find(gm => gm.firebaseUid === uid);
        return { ...g, memberCount: members.length, isMember: !!myMembership };
      }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/groups", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, category, leaderName, meetingSchedule, isPublic } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Group name required" });
      res.status(201).json(await storage.createChurchGroup({
        churchId: id, name: name.trim(), description: description?.trim() || null,
        category: category?.trim() || null, leaderId: uid, leaderName: leaderName?.trim() || m.displayName || null,
        meetingSchedule: meetingSchedule?.trim() || null, isPublic: isPublic !== false,
      }));
    } catch { res.status(500).json({ message: "Failed to create group" }); }
  });

  app.patch("/api/churches/:id/groups/:groupId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, category, leaderName, meetingSchedule, isPublic } = req.body;
      res.json(await storage.updateChurchGroup(groupId, { name, description, category, leaderName, meetingSchedule, isPublic }));
    } catch { res.status(500).json({ message: "Failed to update group" }); }
  });

  app.delete("/api/churches/:id/groups/:groupId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchGroup(groupId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete group" }); }
  });

  app.post("/api/churches/:id/groups/:groupId/join", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const result = await storage.addChurchGroupMember({ groupId, firebaseUid: uid, displayName: m.displayName || null, email: m.email });
      res.json(result);
    } catch { res.status(500).json({ message: "Failed to join group" }); }
  });

  app.delete("/api/churches/:id/groups/:groupId/leave", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const groupId = Number(req.params.groupId);
      await storage.removeChurchGroupMember(groupId, uid);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to leave group" }); }
  });

  // ── Church Prayer Requests ──────────────────────────────────────────────────
  app.get("/api/churches/:id/prayer", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const canSeeConfidential = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "prayer_team"].includes(m.role);
      res.json(await storage.getChurchPrayerRequests(id, canSeeConfidential));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/prayer", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const { title, body, isConfidential } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
      const req2 = await storage.createChurchPrayerRequest({
        churchId: id, firebaseUid: uid, displayName: m.displayName || null,
        title: title.trim(), body: body.trim(), isConfidential: !!isConfidential, status: "active",
      });
      await storage.logChurchActivity({ churchId: id, firebaseUid: uid, displayName: m.displayName || null, activityType: "prayer_submitted", metadata: null });
      res.status(201).json(req2);
    } catch { res.status(500).json({ message: "Failed to submit prayer request" }); }
  });

  app.post("/api/churches/:id/prayer/:prayerId/pray", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      res.json(await storage.incrementPrayerCount(prayerId));
    } catch { res.status(500).json({ message: "Failed to register prayer" }); }
  });

  app.patch("/api/churches/:id/prayer/:prayerId/status", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "prayer_team"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { status } = req.body;
      res.json(await storage.updateChurchPrayerStatus(prayerId, status));
    } catch { res.status(500).json({ message: "Failed to update prayer status" }); }
  });

  app.delete("/api/churches/:id/prayer/:prayerId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchPrayerRequest(prayerId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete prayer request" }); }
  });

  // ── Church Activity (admin) ─────────────────────────────────────────────────
  app.get("/api/churches/:id/activity", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchActivity(id, 100));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Global Admin Church Moderation ──────────────────────────────────────────
  app.get("/api/admin/churches", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const churches = await storage.getAllChurches();
      const enriched = await Promise.all(churches.map(async (c) => {
        const members = await storage.getChurchMembers(c.id);
        return { ...c, memberCount: members.length };
      }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/admin/churches/:id/status", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["active", "inactive", "suspended"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      res.json(await storage.updateChurchStatus(id, status));
    } catch { res.status(500).json({ message: "Failed to update church status" }); }
  });

  // ── Church Logo Upload ────────────────────────────────────────────────────────
  app.post("/api/churches/:id/logo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl } = req.body;
      if (!logoUrl || typeof logoUrl !== "string") return res.status(400).json({ message: "logoUrl is required" });
      res.json(await storage.updateChurchLogoUrl(churchId, logoUrl));
    } catch { res.status(500).json({ message: "Failed to update logo" }); }
  });

  // ── Church Giving Settings ────────────────────────────────────────────────────
  app.get("/api/churches/:id/giving/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      if (!members.find(m => m.firebaseUid === uid)) return res.status(403).json({ message: "Not a member" });
      const settings = await storage.getChurchGivingSettings(churchId);
      res.json(settings ?? { churchId, isEnabled: false, currency: "USD", platformFeeAccepted: false });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/giving/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { isEnabled, currency, platformFeeAccepted, givingStatement } = req.body;
      res.json(await storage.upsertChurchGivingSettings(churchId, { isEnabled, currency, platformFeeAccepted, givingStatement }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Giving Public Info + Categories ────────────────────────────────────
  app.get("/api/churches/slug/:slug/giving", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const [settings, categories, platformFeeStr] = await Promise.all([
        storage.getChurchGivingSettings(church.id),
        storage.getChurchGivingCategories(church.id),
        storage.getGlobalGivingSetting("platform_fee_percent"),
      ]);
      res.json({ church, settings, categories: categories.filter(c => c.isActive), platformFeePercent: platformFeeStr ? parseFloat(platformFeeStr) : 2.5 });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/churches/:id/giving/categories", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      if (!members.find(m => m.firebaseUid === uid)) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchGivingCategories(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/giving/categories", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, displayOrder } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      res.json(await storage.createChurchGivingCategory({ churchId, name: name.trim(), description, displayOrder: displayOrder ?? 0 }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/churches/:id/giving/categories/:catId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, isActive, displayOrder } = req.body;
      res.json(await storage.updateChurchGivingCategory(Number(req.params.catId), { name, description, isActive, displayOrder }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/churches/:id/giving/categories/:catId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchGivingCategory(Number(req.params.catId));
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Payout Config ──────────────────────────────────────────────────────
  app.get("/api/churches/:id/payout-config", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const config = await storage.getChurchPayoutConfig(churchId);
      if (config?.accountNumber) {
        res.json({ ...config, accountNumber: config.accountNumber.replace(/.(?=.{4})/g, "•") });
      } else {
        res.json(config ?? null);
      }
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/payout-config", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const config = await storage.upsertChurchPayoutConfig(churchId, req.body, uid);
      const masked = config.accountNumber ? config.accountNumber.replace(/.(?=.{4})/g, "•") : null;
      res.json({ ...config, accountNumber: masked });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Transactions ───────────────────────────────────────────────────────
  app.get("/api/churches/:id/giving/transactions", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchTransactions(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Giving — Stripe Checkout ──────────────────────────────────────────
  app.post("/api/churches/slug/:slug/giving/create-session", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(503).json({ message: "Card payments are not currently configured." });
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const settings = await storage.getChurchGivingSettings(church.id);
      if (!settings?.isEnabled) return res.status(403).json({ message: "Online giving is not enabled for this church." });
      const { amount, categoryId, categoryName, donorName, donorEmail, isAnonymous, note, donorFirebaseUid } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) < 1) return res.status(400).json({ message: "Enter a valid amount (minimum $1)." });
      if (!categoryName) return res.status(400).json({ message: "Giving category is required." });
      const grossCents = Math.round(Number(amount) * 100);
      const platformFeeStr = await storage.getGlobalGivingSetting("platform_fee_percent");
      const platformFeePercent = platformFeeStr ? parseFloat(platformFeeStr) : 2.5;
      const platformFeeCents = Math.round(grossCents * (platformFeePercent / 100));
      const providerFeeCents = Math.round(grossCents * 0.029 + 30);
      const churchNetCents = grossCents - platformFeeCents - providerFeeCents;
      const reference = `cg-${church.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const txn = await storage.createChurchTransaction({
        churchId: church.id,
        categoryId: categoryId ? Number(categoryId) : null,
        categoryName: categoryName || "General",
        donorFirebaseUid: donorFirebaseUid ?? null,
        donorName: isAnonymous ? null : (donorName ?? null),
        donorEmail: isAnonymous ? null : (donorEmail ?? null),
        isAnonymous: !!isAnonymous,
        note: note ?? null,
        currency: settings.currency ?? "USD",
        grossAmount: grossCents,
        platformFeeAmount: platformFeeCents,
        providerFeeAmount: providerFeeCents,
        churchNetAmount: churchNetCents,
        status: "pending",
        payoutStatus: "pending",
        stripeSessionId: null,
        stripePaymentIntentId: null,
        reference,
      });
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(stripeKey);
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const description = `${categoryName} — ${church.name}${!isAnonymous && donorName ? ` — From: ${donorName}` : ""}${note ? ` — "${note}"` : ""}`;
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: (settings.currency ?? "USD").toLowerCase(),
            product_data: { name: `${church.name} — ${categoryName}`, description },
            unit_amount: grossCents,
          },
          quantity: 1,
        }],
        metadata: { reference, txnId: String(txn.id), churchId: String(church.id) },
        customer_email: !isAnonymous && donorEmail ? donorEmail : undefined,
        success_url: `${baseUrl}/church/${church.slug}/giving/success?ref=${reference}`,
        cancel_url: `${baseUrl}/church/${church.slug}/giving`,
      });
      await db.update(churchTransactions).set({ stripeSessionId: session.id }).where(eq(churchTransactions.id, txn.id));
      res.json({ checkoutUrl: session.url, reference });
    } catch (err: any) {
      console.error("[ChurchGiving] Stripe error:", err.message || err);
      res.status(500).json({ message: "Payment could not be started. Please try again." });
    }
  });

  // ── Church Giving Success Confirmation ────────────────────────────────────────
  app.get("/api/churches/slug/:slug/giving/confirm", async (req, res) => {
    try {
      const { ref } = req.query;
      if (!ref || typeof ref !== "string") return res.status(400).json({ message: "Reference required" });
      const txn = await storage.getChurchTransactionByReference(ref);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      res.json(txn);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Stripe Webhook for Church Giving ─────────────────────────────────────────
  app.post("/api/church-giving-webhook", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(503).end();
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(stripeKey);
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_GIVING_WEBHOOK_SECRET;
      let event: any;
      if (webhookSecret && sig) {
        try {
          event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch { return res.status(400).send("Webhook signature verification failed."); }
      } else {
        event = req.body;
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const txn = await storage.getChurchTransactionByStripeSession(session.id);
        if (txn) {
          await storage.updateChurchTransactionStatus(txn.id, "completed", session.payment_intent);
        }
      } else if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const txn = await storage.getChurchTransactionByStripeSession(session.id);
        if (txn && txn.status === "pending") {
          await storage.updateChurchTransactionStatus(txn.id, "failed");
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("[GivingWebhook] Error:", err.message);
      res.status(500).end();
    }
  });

  // ── Admin: Global Giving Platform Settings ────────────────────────────────────
  app.get("/api/admin/giving/platform-settings", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const fee = await storage.getGlobalGivingSetting("platform_fee_percent");
      res.json({ platform_fee_percent: fee ?? "2.5" });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/admin/giving/platform-settings", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const { platform_fee_percent } = req.body;
      const val = parseFloat(platform_fee_percent);
      if (isNaN(val) || val < 0 || val > 20) return res.status(400).json({ message: "Fee must be between 0 and 20%" });
      await storage.setGlobalGivingSetting("platform_fee_percent", String(val), "admin");
      res.json({ platform_fee_percent: String(val) });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/admin/giving/transactions", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const txns = await storage.getAllGivingTransactions(200);
      res.json(txns);
    } catch { res.status(500).json({ message: "Server error" }); }
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
