import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { sendPrayerReplyNotification, sendContactMessageNotification, sendContactAutoReply, sendGeneralInquiryNotification, sendFeedbackNotification, sendPartnershipNotification, sendDonationThankYouEmail, sendChurchNameChangeSecurityEmail } from "./sendgrid";
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
    // Readable format: 3 letters + dash + 4 digits, e.g. "AXJ-4823"
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "0123456789";
    const letters = Array.from({ length: 3 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
    const nums = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
    return `${letters}-${nums}`;
  }

  // Public: preview an invite code — returns full context for the join page
  app.get("/api/church-invite/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().replace(/\s/g, "");
      const inv = await storage.getChurchInvitation(code);
      if (inv && inv.isActive) {
        if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "Invitation has expired" });
        if (inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(410).json({ message: "Invitation has reached its limit" });
        const church = await storage.getChurch(inv.churchId);
        if (!church) return res.status(404).json({ message: "Church not found" });
        // Platform governance gate: invitations are only usable for approved orgs
        if (church.platformStatus !== "approved") return res.status(403).json({ message: "This organization is not currently active on the platform" });
        let groupName: string | null = inv.targetGroupName ?? null;
        if (!groupName && inv.targetGroupId) {
          const groups = await storage.getChurchGroups(inv.churchId);
          groupName = groups.find(g => g.id === inv.targetGroupId)?.name ?? null;
        }
        return res.json({
          church: { id: church.id, name: church.name, slug: church.slug, description: church.description, logoUrl: church.logoUrl, denomination: church.denomination, approvalMode: church.approvalMode },
          invitation: {
            id: inv.id, label: inv.label, expiresAt: inv.expiresAt,
            invitationType: inv.invitationType, targetGroupId: inv.targetGroupId,
            targetGroupName: groupName, maxUses: inv.maxUses,
            approvedUses: inv.approvedUses, remaining: inv.maxUses ? Math.max(0, inv.maxUses - inv.approvedUses) : null,
          },
        });
      }
      // Fallback: check department invite codes
      const dept = await storage.getDepartmentByInviteCode(code);
      if (!dept || !dept.isActive) return res.status(404).json({ message: "Invitation not found or no longer active" });
      const church = await storage.getChurch(dept.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      return res.json({
        church: { id: church.id, name: church.name, slug: church.slug, description: church.description, logoUrl: church.logoUrl, denomination: church.denomination, approvalMode: church.approvalMode },
        invitation: {
          id: dept.id, label: dept.name, expiresAt: null,
          invitationType: "department", targetGroupId: dept.id,
          targetGroupName: dept.name, maxUses: null,
          approvedUses: 0, remaining: null,
        },
        isDepartmentInvite: true,
        deptId: dept.id,
      });
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
      const church = await storage.createChurch({ name: name.trim(), slug, description: description?.trim() || null, denomination: denomination?.trim() || null, address: address?.trim() || null, websiteUrl: websiteUrl?.trim() || null, logoUrl: null, ownerId: uid, status: "active", platformStatus: "draft" });
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
      const inv = await storage.getChurchInvitation(code.trim().toUpperCase().replace(/\s/g, ""));
      if (!inv || !inv.isActive) return res.status(404).json({ message: "Invalid or expired invitation code" });
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "This invitation has expired" });
      // Server-side atomic limit check using approvedUses (only counts approved members)
      if (inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(410).json({ message: "This invitation has reached its maximum uses" });
      const church = await storage.getChurch(inv.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      // Platform governance gate: block joins to non-approved orgs
      if (church.platformStatus !== "approved") return res.status(403).json({ message: "This organization is not currently accepting new members" });
      const already = await storage.getChurchMember(inv.churchId, uid);
      if (already?.status === "active") return res.json({ message: "Already a member", church });
      if (already?.status === "pending") return res.json({ message: "Your membership request is pending approval", pending: true, church });
      // Determine initial status based on church approvalMode
      const initialStatus = church.approvalMode === "auto_approve" ? "active" : "pending";
      await storage.addChurchMember({
        churchId: inv.churchId, firebaseUid: uid, email: email || "",
        displayName: displayName || null, role: "member", status: initialStatus,
        invitedGroupId: inv.targetGroupId ?? null,
        inviteCodeUsed: inv.inviteCode,
      });
      // Only increment approvedUses if auto-approved
      if (initialStatus === "active") {
        await storage.approveChurchInvitationUse(inv.inviteCode);
        // Assign to group if targeted
        if (inv.targetGroupId) {
          try {
            await storage.addChurchGroupMember({ groupId: inv.targetGroupId, firebaseUid: uid, displayName: displayName || null, email: email || "" });
          } catch { /* group may not exist */ }
        }
      }
      await storage.useChurchInvitation(inv.inviteCode);
      res.json({
        message: initialStatus === "pending" ? "Your request to join has been sent and is awaiting approval." : "Joined successfully",
        pending: initialStatus === "pending",
        church,
      });
    } catch (err) { console.error("Join church:", err); res.status(500).json({ message: "Failed to join church" }); }
  });

  // Auth: approve a pending member (increments approvedUses, assigns group)
  app.post("/api/churches/:id/members/:memberId/approve", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(churchId, uid);
      if (!requester || !["owner", "lead_pastor", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const all = await storage.getChurchMembers(churchId);
      const target = all.find(m => m.id === memberId);
      if (!target || target.status !== "pending") return res.status(404).json({ message: "Pending member not found" });
      // Check invitation limit before approving
      if (target.inviteCodeUsed) {
        const inv = await storage.getChurchInvitation(target.inviteCodeUsed);
        if (inv && inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(409).json({ message: "Invitation limit reached — cannot approve this member" });
        if (inv) await storage.approveChurchInvitationUse(inv.inviteCode);
      }
      const updated = await storage.updateChurchMemberStatus(memberId, "active");
      // Assign to group if invitation targeted one
      if (target.invitedGroupId) {
        try {
          await storage.addChurchGroupMember({ groupId: target.invitedGroupId, firebaseUid: target.firebaseUid, displayName: target.displayName, email: target.email });
        } catch { /* already in group */ }
      }
      storage.createAuditLog({ churchId, action: "member_approved", newValue: target.email ?? target.displayName ?? String(memberId), actorUid: uid, actorRole: requester.role }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to approve member" }); }
  });

  // Auth: decline a pending member
  app.post("/api/churches/:id/members/:memberId/decline", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(churchId, uid);
      if (!requester || !["owner", "lead_pastor", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const all = await storage.getChurchMembers(churchId);
      const target = all.find(m => m.id === memberId);
      const updated = await storage.updateChurchMemberStatus(memberId, "declined");
      storage.createAuditLog({ churchId, action: "member_declined", newValue: target?.email ?? target?.displayName ?? String(memberId), actorUid: uid, actorRole: requester.role }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to decline member" }); }
  });

  // Public: get church by slug
  app.get("/api/churches/slug/:slug", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      res.json(church);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Public Church Website API (no auth required) ────────────────────────────

  // GET /api/public/churches/:slug — full public church data bundle
  app.get("/api/public/churches/:slug", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.publicWebsiteEnabled === false || church.platformStatus !== "approved") {
        return res.status(404).json({ message: "Church not found" });
      }
      const [sermons, announcements, departments] = await Promise.all([
        storage.getChurchSermons(church.id),
        storage.getChurchAnnouncements(church.id),
        storage.getDepartments(church.id),
      ]);
      const recentSermons = sermons.filter((s: any) => s.isPublished).slice(0, 6);
      const recentAnnouncements = announcements.slice(0, 6);
      res.json({ church, recentSermons, recentAnnouncements, departments });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // GET /api/public/churches/:slug/sermons — all published sermons
  app.get("/api/public/churches/:slug/sermons", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      const sermons = await storage.getChurchSermons(church.id);
      res.json({ sermons: sermons.filter((s: any) => s.isPublished) });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // GET /api/public/churches/:slug/events — upcoming department events
  app.get("/api/public/churches/:slug/events", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      const departments = await storage.getDepartments(church.id);
      const eventArrays = await Promise.all(departments.map(d => storage.getDepartmentEvents(d.id)));
      const events = eventArrays.flat().sort((a: any, b: any) =>
        new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime()
      );
      res.json({ events });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // POST /api/public/churches/:slug/prayer — public prayer request (no auth)
  app.post("/api/public/churches/:slug/prayer", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      const { name, email, request } = req.body;
      if (!name?.trim() || !request?.trim()) return res.status(400).json({ message: "Name and request are required" });
      const prayer = await storage.createChurchPrayerRequest({
        churchId: church.id,
        firebaseUid: `public_${Date.now()}`,
        displayName: `${name.trim()}${email ? ` <${email}>` : ""} (Public)`,
        title: "Public Prayer Request",
        body: request.trim(),
        isConfidential: false,
        status: "active",
      });
      res.json({ success: true, id: prayer.id });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // POST /api/public/churches/:slug/contact — public contact message
  app.post("/api/public/churches/:slug/contact", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });
      const { name, email, subject, message } = req.body;
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Name, email and message are required" });
      }
      await storage.createChurchPrayerRequest({
        churchId: church.id,
        firebaseUid: `contact_${Date.now()}`,
        displayName: `${name.trim()} <${email.trim()}> (Contact)`,
        title: subject?.trim() || "Website Contact Message",
        body: message.trim(),
        isConfidential: false,
        status: "active",
      });
      res.json({ success: true });
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
      const {
        name, description, denomination, address, websiteUrl, logoUrl,
        // Website settings fields
        pastorName, phone, email, welcomeMessage, missionStatement, vision,
        visitorInfo, mapEmbedUrl, websiteHeroImage, publicWebsiteEnabled,
        socialLinks, serviceTimes, publicPhotos,
      } = req.body;
      const update: Record<string, any> = {};
      const oldName = church.name;
      const nameChanged = name !== undefined && name !== oldName;
      // Church name changes are owner-only for security
      if (nameChanged && m.role !== "owner") return res.status(403).json({ message: "Only the church owner can change the church name" });
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Church name cannot be empty" });
        update.name = name.trim();
      }
      if (description !== undefined) update.description = description;
      if (denomination !== undefined) update.denomination = denomination;
      if (address !== undefined) update.address = address;
      if (websiteUrl !== undefined) update.websiteUrl = websiteUrl;
      if (logoUrl !== undefined) update.logoUrl = logoUrl;
      if (pastorName !== undefined) update.pastorName = pastorName;
      if (phone !== undefined) update.phone = phone;
      if (email !== undefined) update.email = email;
      if (welcomeMessage !== undefined) update.welcomeMessage = welcomeMessage;
      if (missionStatement !== undefined) update.missionStatement = missionStatement;
      if (vision !== undefined) update.vision = vision;
      if (visitorInfo !== undefined) update.visitorInfo = visitorInfo;
      if (mapEmbedUrl !== undefined) update.mapEmbedUrl = mapEmbedUrl;
      if (websiteHeroImage !== undefined) update.websiteHeroImage = websiteHeroImage;
      if (publicWebsiteEnabled !== undefined) update.publicWebsiteEnabled = publicWebsiteEnabled;
      if (socialLinks !== undefined) update.socialLinks = socialLinks;
      if (serviceTimes !== undefined) update.serviceTimes = serviceTimes;
      if (publicPhotos !== undefined) update.publicPhotos = publicPhotos;
      const updated = await storage.updateChurch(id, update);
      // If name changed: audit log + announcement + security email
      if (nameChanged && name) {
        const newName = name as string;
        storage.createAuditLog({ churchId: id, action: "church_name_changed", previousValue: oldName, newValue: newName, actorUid: uid, actorRole: m.role }).catch(() => {});
        storage.createChurchAnnouncement({
          churchId: id,
          createdBy: uid,
          title: `Church Name Updated`,
          body: `This church has been renamed from "${oldName}" to "${newName}" on ${new Date().toLocaleDateString()} by the church owner. If you have questions, please contact your church leader.`,
          isPinned: false,
          expiresAt: null,
          imageUrl: null,
          pdfUrl: null,
          externalLink: null,
        }).catch(() => {});
        // Send security email to owner
        const ownerMember = (await storage.getChurchMembers(id)).find(mb => mb.role === "owner");
        if (ownerMember?.email) {
          sendChurchNameChangeSecurityEmail(ownerMember.email, ownerMember.displayName ?? ownerMember.email, oldName, newName, church.slug).catch(() => {});
        }
      }
      res.json(updated);
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
      const LEADER_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "ministry_leader", "group_leader", "prayer_team"];
      const isLeader = LEADER_ROLES.includes(m.role);
      const members = await storage.getChurchMembers(id);
      const profiles = await storage.getChurchMemberProfilesByChurchId(id);
      const photoMap = new Map(profiles.map(p => [p.firebaseUid, p.photoUrl ?? null]));
      // Server-side privacy: strip email from non-leaders; attach photoUrl for avatars
      const safe = members.map(mb => {
        const photoUrl = photoMap.get(mb.firebaseUid ?? "") ?? null;
        if (isLeader) return { ...mb, photoUrl };
        const { email: _omit, ...rest } = mb as any;
        return { ...rest, email: undefined, photoUrl };
      });
      res.json(safe);
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
      // Only owners can assign the owner role
      if (role === "owner" && requester.role !== "owner") return res.status(403).json({ message: "Only owners can assign the owner role" });
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

  // Auth: get my church member profile
  app.get("/api/churches/:id/my-profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const profile = await storage.getChurchMemberProfile(id, uid);
      res.json({ member: m, profile: profile ?? null });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Auth: update my church member profile
  app.put("/api/churches/:id/my-profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const { fullName, phone, country, city, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly } = req.body;
      const profile = await storage.upsertChurchMemberProfile({
        churchId: id, firebaseUid: uid,
        fullName: fullName ?? null, phone: phone ?? null,
        country: country ?? null, city: city ?? null,
        bio: bio ?? null, photoUrl: photoUrl ?? null,
        showInDirectory: showInDirectory ?? true,
        allowMemberMessages: allowMemberMessages ?? true,
        allowLeaderContact: allowLeaderContact ?? true,
        showPhoneToLeadersOnly: showPhoneToLeadersOnly ?? true,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Failed to update profile" }); }
  });

  // Auth: update my church member profile photo
  app.patch("/api/churches/:id/my-profile/photo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const { objectPath } = req.body;
      if (!objectPath || typeof objectPath !== "string") return res.status(400).json({ message: "objectPath is required" });
      if (!objectPath.startsWith("/objects/")) return res.status(400).json({ message: "Invalid object path" });
      const profile = await storage.upsertChurchMemberProfile({ churchId: id, firebaseUid: uid, photoUrl: objectPath });
      res.json({ photoUrl: profile.photoUrl });
    } catch { res.status(500).json({ message: "Failed to update photo" }); }
  });

  // Auth: remove my church member profile photo
  app.delete("/api/churches/:id/my-profile/photo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      await storage.upsertChurchMemberProfile({ churchId: id, firebaseUid: uid, photoUrl: null });
      res.json({ photoUrl: null });
    } catch { res.status(500).json({ message: "Failed to remove photo" }); }
  });

  // Auth: create invitation (owner/admin/lead_pastor) — only for approved orgs
  app.post("/api/churches/:id/invitations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      // Platform governance gate: only approved orgs can create new invitations
      const church = await storage.getChurch(id);
      if (!church || church.platformStatus !== "approved") return res.status(403).json({ message: "Invitations can only be created for approved organizations" });
      const { label, expiresAt, maxUses, invitationType, targetGroupId } = req.body;
      let groupName: string | null = null;
      if (targetGroupId) {
        const groups = await storage.getChurchGroups(id);
        groupName = groups.find(g => g.id === Number(targetGroupId))?.name ?? null;
      }
      let code = inviteCode();
      for (let i = 0; i < 10 && await storage.getChurchInvitation(code); i++) code = inviteCode();
      const inv = await storage.createChurchInvitation({
        churchId: id, inviteCode: code, createdBy: uid,
        label: label || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        isActive: true,
        invitationType: invitationType || "membership",
        targetGroupId: targetGroupId ? Number(targetGroupId) : null,
        targetGroupName: groupName,
      });
      storage.createAuditLog({ churchId: id, action: "invitation_created", newValue: code, actorUid: uid, actorRole: m.role }).catch(() => {});
      res.status(201).json(inv);
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
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const invId = Number(req.params.invId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { permanent } = req.query;
      if (permanent === "true") await storage.deleteChurchInvitation(invId);
      else await storage.deactivateChurchInvitation(invId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to deactivate invitation" }); }
  });

  // Auth: update church settings (includes approvalMode)
  app.patch("/api/churches/:id/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { approvalMode, memberDirectoryEnabled } = req.body;
      const update: any = {};
      if (approvalMode !== undefined) update.approvalMode = approvalMode;
      if (memberDirectoryEnabled !== undefined) update.memberDirectoryEnabled = memberDirectoryEnabled;
      res.json(await storage.updateChurch(id, update));
    } catch { res.status(500).json({ message: "Failed to update settings" }); }
  });

  // ── Church Member Profiles ────────────────────────────────────────────────────
  app.get("/api/churches/:id/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchMemberProfile(churchId, uid) ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.status(403).json({ message: "Not a member" });
      const { fullName, phone, country, city, address, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly } = req.body;
      res.json(await storage.upsertChurchMemberProfile({ churchId, firebaseUid: uid, fullName, phone, country, city, address, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Admin: get any member's profile (leaders only)
  app.get("/api/churches/:id/members/:targetUid/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchMemberProfile(churchId, req.params.targetUid) ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Member Directory ───────────────────────────────────────────────────
  app.get("/api/churches/:id/directory", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const church = await storage.getChurch(churchId);
      if (!church?.memberDirectoryEnabled) return res.status(403).json({ message: "Directory is not enabled for this church" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const members = await storage.getChurchMembers(churchId);
      const activeMembers = members.filter(mb => mb.status === "active");
      // Return public-safe directory entries
      const directory = await Promise.all(activeMembers.map(async mb => {
        const profile = await storage.getChurchMemberProfile(churchId, mb.firebaseUid);
        if (profile && !profile.showInDirectory) return null;
        const entry: any = { firebaseUid: mb.firebaseUid, displayName: mb.displayName, role: mb.role, bio: profile?.bio ?? null, photoUrl: profile?.photoUrl ?? null };
        if (isLeader) {
          entry.email = mb.email;
          entry.phone = profile?.showPhoneToLeadersOnly ? profile.phone : null;
          entry.city = profile?.city ?? null;
          entry.country = profile?.country ?? null;
        }
        return entry;
      }));
      res.json(directory.filter(Boolean));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Messaging ──────────────────────────────────────────────────────────
  app.get("/api/churches/:id/conversations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const convs = await storage.getChurchConversations(churchId, uid, isLeader);
      const unread = await storage.getUnreadMessageCount(churchId, uid);
      res.json({ conversations: convs, unreadCount: unread });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/conversations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const { subject, category, targetType, targetGroupId, initialMessage } = req.body;
      if (!subject?.trim()) return res.status(400).json({ message: "Subject is required" });
      if (!initialMessage?.trim()) return res.status(400).json({ message: "Message is required" });
      // Only leaders can send to groups or all members
      if ((targetType === "all" || targetType === "leaders" || targetType === "group") && !isLeader) return res.status(403).json({ message: "Not authorized to broadcast messages" });
      const conv = await storage.createChurchConversation({
        churchId, subject: subject.trim(), category: category || "general",
        status: "open", createdBy: uid,
        targetType: targetType || "direct",
        targetGroupId: targetGroupId ? Number(targetGroupId) : null,
      });
      // Add creator as participant
      await storage.addConversationParticipant({ conversationId: conv.id, churchId, firebaseUid: uid, displayName: m.displayName, role: isLeader ? "pastor" : "member", addedBy: uid });
      // For direct messages: add a pastor/admin as participant
      if (targetType === "direct" && !isLeader) {
        const allMembers = await storage.getChurchMembers(churchId);
        const leader = allMembers.find(mb => mb.status === "active" && ["owner", "lead_pastor"].includes(mb.role));
        if (leader) await storage.addConversationParticipant({ conversationId: conv.id, churchId, firebaseUid: leader.firebaseUid, displayName: leader.displayName, role: "pastor", addedBy: uid });
      }
      // Create first message
      const msg = await storage.createChurchMessage({ conversationId: conv.id, churchId, senderUid: uid, senderName: m.displayName, senderRole: isLeader ? "pastor" : "member", body: initialMessage.trim(), isSystemMessage: false });
      res.status(201).json({ conversation: conv, message: msg });
    } catch { res.status(500).json({ message: "Failed to create conversation" }); }
  });

  app.get("/api/churches/:id/conversations/:convId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Conversation not found" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const isParticipant = await storage.isConversationParticipant(convId, uid);
      if (!isLeader && !isParticipant) return res.status(403).json({ message: "Not a participant in this conversation" });
      const [messages, participants] = await Promise.all([
        storage.getChurchMessages(convId),
        storage.getConversationParticipants(convId),
      ]);
      await storage.markMessagesRead(convId, uid);
      res.json({ conversation: conv, messages, participants });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:id/conversations/:convId/messages", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Conversation not found" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const isParticipant = await storage.isConversationParticipant(convId, uid);
      if (!isLeader && !isParticipant) return res.status(403).json({ message: "Not authorized to reply" });
      if (conv.status === "closed") return res.status(400).json({ message: "Conversation is closed" });
      const { body } = req.body;
      if (!body?.trim()) return res.status(400).json({ message: "Message body is required" });
      const msg = await storage.createChurchMessage({ conversationId: convId, churchId, senderUid: uid, senderName: m.displayName, senderRole: isLeader ? "pastor" : "member", body: body.trim(), isSystemMessage: false });
      res.status(201).json(msg);
    } catch { res.status(500).json({ message: "Failed to send message" }); }
  });

  app.patch("/api/churches/:id/conversations/:convId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Not found" });
      const { status, assignedTo, isUrgent } = req.body;
      const updated = await storage.updateChurchConversation(convId, { status, assignedTo, isUrgent });
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update conversation" }); }
  });

  // Add a participant to a conversation (for assigning pastoral assistants)
  app.post("/api/churches/:id/conversations/:convId/participants", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Not found" });
      const { firebaseUid: targetUid, displayName, role: participantRole } = req.body;
      if (!targetUid) return res.status(400).json({ message: "Firebase UID is required" });
      // Verify they are a member
      const targetMember = await storage.getChurchMember(churchId, targetUid);
      if (!targetMember) return res.status(404).json({ message: "User is not a member of this church" });
      const participant = await storage.addConversationParticipant({ conversationId: convId, churchId, firebaseUid: targetUid, displayName: displayName || targetMember.displayName, role: participantRole || "assistant", addedBy: uid });
      // Create system message noting the addition
      await storage.createChurchMessage({ conversationId: convId, churchId, senderUid: uid, senderName: m.displayName, senderRole: "admin", body: `${displayName || targetMember.displayName || "A staff member"} was added to this conversation.`, isSystemMessage: true });
      res.status(201).json(participant);
    } catch { res.status(500).json({ message: "Failed to add participant" }); }
  });

  app.get("/api/churches/:id/unread-count", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.json({ count: 0 });
      res.json({ count: await storage.getUnreadMessageCount(churchId, uid) });
    } catch { res.status(500).json({ message: "Server error" }); }
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
      const { title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl, bibleReference, sermonDate, scheduledDate, isPublished } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      res.status(201).json(await storage.createChurchSermon({
        churchId: id, title: title.trim(), description: description?.trim() || null,
        speakerName: speakerName?.trim() || null, videoUrl: videoUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null, pdfNotesUrl: pdfNotesUrl?.trim() || null,
        outlineUrl: outlineUrl?.trim() || null, imageUrl: imageUrl?.trim() || null,
        bibleReference: bibleReference?.trim() || null,
        sermonDate: sermonDate ? new Date(sermonDate) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        isPublished: isPublished !== false, createdBy: uid,
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
      const { title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl, bibleReference, sermonDate, scheduledDate, isPublished } = req.body;
      res.json(await storage.updateChurchSermon(sermonId, {
        title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl,
        bibleReference, isPublished,
        sermonDate: sermonDate !== undefined ? (sermonDate ? new Date(sermonDate) : null) : undefined,
        scheduledDate: scheduledDate !== undefined ? (scheduledDate ? new Date(scheduledDate) : null) : undefined,
      }));
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
      const { title, body, isPinned, expiresAt, imageUrl, pdfUrl, externalLink } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
      res.status(201).json(await storage.createChurchAnnouncement({
        churchId: id, title: title.trim(), body: body.trim(),
        isPinned: !!isPinned, expiresAt: expiresAt ? new Date(expiresAt) : null,
        imageUrl: imageUrl?.trim() || null, pdfUrl: pdfUrl?.trim() || null,
        externalLink: externalLink?.trim() || null, createdBy: uid,
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
      const { title, body, isPinned, expiresAt, imageUrl, pdfUrl, externalLink } = req.body;
      res.json(await storage.updateChurchAnnouncement(annId, {
        title, body, isPinned,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined,
        pdfUrl: pdfUrl !== undefined ? (pdfUrl?.trim() || null) : undefined,
        externalLink: externalLink !== undefined ? (externalLink?.trim() || null) : undefined,
      }));
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
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member of this church" });
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
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
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
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
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
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
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

  // ── Pending Members Count ────────────────────────────────────────────────────
  app.get("/api/churches/:id/members/pending-count", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const count = await storage.getPendingMembersCount(churchId);
      res.json({ count });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Department Archive ────────────────────────────────────────────────────────
  app.post("/api/churches/departments/:deptId/archive", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const dept = await storage.getDepartment(deptId);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      const m = await storage.getChurchMember(dept.churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const deptMembers = await storage.getDepartmentMembers(deptId);
      const updated = await storage.archiveDepartment(deptId);
      storage.createAuditLog({ churchId: dept.churchId, departmentId: deptId, action: "department_archived", previousValue: dept.name, actorUid: uid, actorRole: m.role }).catch(() => {});
      // Targeted in-app notification: create an inbox thread for each active department member
      const closureDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      for (const dm of deptMembers) {
        const memberEmail = dm.member?.email;
        const memberName = dm.member?.displayName ?? dm.member?.email ?? "Member";
        if (memberEmail) {
          storage.createInboxThread(
            { userEmail: memberEmail, userName: memberName, subject: `Department Archived: ${dept.name}`, category: "General" },
            `Dear ${memberName},\n\nThe "${dept.name}" department of your church has been archived effective ${closureDate}. As a member of this department, your access to department activities will no longer be available.\n\nPlease reach out to church leadership if you have any questions.\n\nGod bless,\nChurch Leadership`
          ).catch(() => {});
        }
      }
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Church Deletion Requests ─────────────────────────────────────────────────
  app.post("/api/churches/:id/deletion-request", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.role !== "owner") return res.status(403).json({ message: "Only the church owner can request deletion" });
      const schema = z.object({
        reason: z.string().min(1),
        explanation: z.string().optional(),
        ownerEmail: z.string().email(),
        ownerName: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      const existing = await storage.getMyDeletionRequest(churchId, uid);
      if (existing && existing.status === "pending") return res.status(409).json({ message: "You already have a pending deletion request" });
      const request = await storage.createDeletionRequest({
        churchId,
        ownerUid: uid,
        ownerEmail: parsed.data.ownerEmail,
        ownerName: parsed.data.ownerName,
        reason: parsed.data.reason,
        explanation: parsed.data.explanation,
      });
      storage.createAuditLog({ churchId, action: "deletion_requested", actorUid: uid, actorRole: m.role, newValue: parsed.data.reason }).catch(() => {});
      res.json(request);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/churches/:id/deletion-request", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.role !== "owner") return res.status(403).json({ message: "Not authorized" });
      const request = await storage.getMyDeletionRequest(churchId, uid);
      res.json(request ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Admin: Church Deletion Requests ──────────────────────────────────────────
  app.get("/api/admin/church-deletion-requests", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const { status } = req.query;
      const requests = await storage.getDeletionRequests(typeof status === "string" ? status : undefined);
      res.json(requests);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/admin/church-deletion-requests/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const schema = z.object({ status: z.enum(["approved", "rejected", "info_requested"]), adminNote: z.string().optional().nullable() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const updated = await storage.updateDeletionRequestStatus(id, parsed.data.status, "admin", parsed.data.adminNote ?? undefined);
      storage.createAuditLog({ churchId: updated.churchId, action: `deletion_request_${parsed.data.status}`, newValue: parsed.data.adminNote ?? undefined, actorUid: "platform_admin" }).catch(() => {});
      res.json(updated);
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

  // ── Platform Governance: Applications ────────────────────────────────────────

  // GET pending review churches
  app.get("/api/admin/governance/applications", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const { platformStatus } = req.query;
      const status = typeof platformStatus === "string" ? platformStatus : "pending_review";
      const list = await storage.getChurchesByPlatformStatus(status);
      const enriched = await Promise.all(list.map(async (c) => {
        const members = await storage.getChurchMembers(c.id);
        return { ...c, memberCount: members.length };
      }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // POST approve/reject/request-info
  app.post("/api/admin/governance/applications/:id/review", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        action: z.enum(["approve", "reject", "request_info"]),
        note: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const { action, note } = parsed.data;
      // Require a reason when rejecting
      if (action === "reject" && !note?.trim()) return res.status(400).json({ message: "A reason is required when rejecting an application" });
      const platformStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending_review";
      const updated = await storage.updateChurchPlatformStatus(id, platformStatus, note, "platform_admin");
      storage.createAuditLog({ churchId: id, action: `platform_${action}`, newValue: note, actorUid: "platform_admin" }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Owner: submit draft org for platform review
  app.post("/api/churches/:id/submit-for-review", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      if (church.platformStatus !== "draft") return res.status(400).json({ message: `Cannot submit for review from status: ${church.platformStatus}` });
      const updated = await storage.updateChurchPlatformStatus(churchId, "pending_review", null, uid);
      // Record submission timestamp via audit log
      storage.createAuditLog({ churchId, action: "submitted_for_review", actorUid: uid }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // GET governance summary
  app.get("/api/admin/governance/summary", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try { res.json(await storage.getGovernanceSummary()); }
    catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Platform Governance: Compliance Cases ─────────────────────────────────────

  app.get("/api/admin/compliance-cases", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const churchId = req.query.churchId ? Number(req.query.churchId) : undefined;
      res.json(await storage.getComplianceCases(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/compliance-cases", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const schema = z.object({
        churchId: z.number(),
        category: z.enum(["content", "conduct", "financial", "technical", "other"]).default("other"),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        description: z.string().min(10),
        internalNotes: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const caseNumber = `CASE-${Date.now().toString(36).toUpperCase()}`;
      const created = await storage.createComplianceCase({ ...parsed.data, caseNumber, createdBy: "platform_admin", status: "open" });
      storage.createAuditLog({ churchId: parsed.data.churchId, action: "compliance_case_opened", newValue: caseNumber, actorUid: "platform_admin" }).catch(() => {});
      res.status(201).json(created);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/admin/compliance-cases/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const c = await storage.getComplianceCase(Number(req.params.id));
      if (!c) return res.status(404).json({ message: "Not found" });
      const responses = await storage.getComplianceCaseResponses(c.id);
      res.json({ ...c, responses });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/admin/compliance-cases/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        status: z.enum(["open", "investigating", "awaiting_response", "resolved", "closed"]).optional(),
        enforcementAction: z.enum(["no_action", "warning", "request_changes", "restriction", "suspension", "removal"]).optional().nullable(),
        enforcementReason: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      // Require reason for serious enforcement actions
      if (["suspension", "removal"].includes(parsed.data.enforcementAction ?? "") && !parsed.data.enforcementReason?.trim()) {
        return res.status(400).json({ message: "A reason is required for suspension or removal enforcement actions" });
      }
      const updated = await storage.updateComplianceCase(id, { ...parsed.data, enforcementAt: parsed.data.enforcementAction ? new Date() : undefined });

      // If enforcement action is suspension or removal, update church platform status
      if (parsed.data.enforcementAction === "suspension") {
        const c = await storage.getComplianceCase(id);
        if (c) await storage.updateChurchPlatformStatus(c.churchId, "suspended", parsed.data.enforcementReason ?? "Suspended due to compliance case", "platform_admin");
      }
      if (parsed.data.enforcementAction === "removal") {
        const c = await storage.getComplianceCase(id);
        if (c) await storage.updateChurchPlatformStatus(c.churchId, "archived", parsed.data.enforcementReason ?? "Removed due to compliance case", "platform_admin");
      }

      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Owner: add response to a compliance case
  app.post("/api/churches/:churchId/compliance-cases/:caseId/respond", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const caseId = Number(req.params.caseId);
      const churchId = Number(req.params.churchId);
      // Verify membership — platform governance channels are owner-only
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      // IDOR guard: verify case actually belongs to this church
      const complianceCase = await storage.getComplianceCase(caseId);
      if (!complianceCase || complianceCase.churchId !== churchId) return res.status(404).json({ message: "Case not found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const resp = await storage.createComplianceCaseResponse({ caseId, senderType: "owner", senderUid: uid, message: message.trim(), attachmentUrl: req.body.attachmentUrl ?? null });
      await storage.updateComplianceCase(caseId, { status: "investigating" });
      storage.createAuditLog({ churchId, action: "case_response_submitted", newValue: `caseId:${caseId}`, actorUid: uid }).catch(() => {});
      res.status(201).json(resp);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Admin: add response to a compliance case
  app.post("/api/admin/compliance-cases/:id/respond", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const caseId = Number(req.params.id);
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const resp = await storage.createComplianceCaseResponse({ caseId, senderType: "admin", senderUid: "platform_admin", message: message.trim() });
      await storage.updateComplianceCase(caseId, { status: "awaiting_response" });
      res.status(201).json(resp);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Owner: get compliance cases for their church (owner-only governance channel)
  app.get("/api/churches/:churchId/compliance-cases", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const cases = await storage.getComplianceCases(churchId);
      const enriched = await Promise.all(cases.map(async (c) => ({
        ...c, responses: await storage.getComplianceCaseResponses(c.id),
      })));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Platform Governance: Appeals ──────────────────────────────────────────────

  app.get("/api/admin/compliance-appeals", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try { res.json(await storage.getComplianceAppeals()); }
    catch { res.status(500).json({ message: "Server error" }); }
  });

  app.patch("/api/admin/compliance-appeals/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const schema = z.object({ status: z.enum(["accepted", "rejected"]), adminNote: z.string().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const updated = await storage.updateComplianceAppeal(id, { status: parsed.data.status, adminNote: parsed.data.adminNote ?? null, reviewedBy: "platform_admin", reviewedAt: new Date() });
      // If accepted, restore church to approved
      if (parsed.data.status === "accepted") {
        await storage.updateChurchPlatformStatus(updated.churchId, "approved", "Appeal accepted", "platform_admin");
      }
      storage.createAuditLog({ churchId: updated.churchId, action: `appeal_${parsed.data.status}`, newValue: parsed.data.adminNote, actorUid: "platform_admin" }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Owner: submit appeal (owner-only governance channel)
  app.post("/api/churches/:churchId/appeal", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const { message, caseId } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const appeal = await storage.createComplianceAppeal({ churchId, ownerUid: uid, message: message.trim(), caseId: caseId ?? null, status: "pending" });
      storage.createAuditLog({ churchId, action: "appeal_submitted", actorUid: uid }).catch(() => {});
      res.status(201).json(appeal);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/churches/:churchId/appeal", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      res.json(await storage.getComplianceAppeals(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Platform Admin↔Owner Messaging ───────────────────────────────────────────

  // Admin: get all platform threads
  app.get("/api/admin/platform-threads", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try { res.json(await storage.getPlatformAdminThreads()); }
    catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/admin/platform-threads/:id/messages", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const thread = await storage.getPlatformAdminThread(Number(req.params.id));
      if (!thread) return res.status(404).json({ message: "Not found" });
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadAdmin: false });
      res.json(await storage.getPlatformAdminMessages(thread.id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/platform-threads/:id/reply", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const thread = await storage.getPlatformAdminThread(Number(req.params.id));
      if (!thread) return res.status(404).json({ message: "Not found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createPlatformAdminMessage({ threadId: thread.id, senderType: "admin", senderUid: "platform_admin", message: message.trim() });
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadOwner: true, hasUnreadAdmin: false });
      res.status(201).json(msg);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Owner: get/create thread with platform admin (owner-only governance channel)
  app.get("/api/churches/:churchId/platform-thread", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const threads = await storage.getPlatformAdminThreads(churchId);
      res.json(threads[0] ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:churchId/platform-thread/start", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const { subject, message } = req.body;
      if (!subject?.trim() || !message?.trim()) return res.status(400).json({ message: "Subject and message required" });
      const existing = await storage.getPlatformAdminThreads(churchId);
      let thread = existing[0];
      if (!thread) {
        thread = await storage.createPlatformAdminThread({ churchId, ownerUid: uid, subject: subject.trim(), status: "open", hasUnreadAdmin: true, hasUnreadOwner: false });
      }
      const msg = await storage.createPlatformAdminMessage({ threadId: thread.id, senderType: "owner", senderUid: uid, message: message.trim() });
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadAdmin: true, hasUnreadOwner: false });
      res.status(201).json({ thread, msg });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/churches/:churchId/platform-thread/messages", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const threads = await storage.getPlatformAdminThreads(churchId);
      if (!threads[0]) return res.json([]);
      await storage.updatePlatformAdminThread(threads[0].id, { hasUnreadOwner: false });
      res.json(await storage.getPlatformAdminMessages(threads[0].id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/churches/:churchId/platform-thread/reply", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const threads = await storage.getPlatformAdminThreads(churchId);
      if (!threads[0]) return res.status(404).json({ message: "No thread found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createPlatformAdminMessage({ threadId: threads[0].id, senderType: "owner", senderUid: uid, message: message.trim() });
      await storage.updatePlatformAdminThread(threads[0].id, { hasUnreadAdmin: true, hasUnreadOwner: false });
      res.status(201).json(msg);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Platform Announcements ─────────────────────────────────────────────────

  app.get("/api/admin/platform-announcements", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try { res.json(await storage.getPlatformAnnouncements()); }
    catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/platform-announcements", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const schema = z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        targetType: z.enum(["everyone", "org_owners", "org_admins", "members_specific", "country", "language"]).default("everyone"),
        targetFilter: z.string().optional().nullable(),
        deliveryChannels: z.array(z.enum(["in_app", "inbox"])).default(["in_app"]),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const announcement = await storage.createPlatformAnnouncement({ ...parsed.data, createdBy: "platform_admin" });
      res.status(201).json(announcement);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/platform-announcements/:id/send", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const sent = await storage.sendPlatformAnnouncement(Number(req.params.id));
      res.json(sent);
    } catch { res.status(500).json({ message: "Server error" }); }
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

  // ── Church Branding (logo + banner + theme color) ─────────────────────────────
  app.patch("/api/churches/:id/branding", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl, bannerUrl, themeColor } = req.body;
      const update: Record<string, string | null> = {};
      if (logoUrl !== undefined) update.logoUrl = logoUrl?.trim() || null;
      if (bannerUrl !== undefined) update.bannerUrl = bannerUrl?.trim() || null;
      if (themeColor !== undefined) update.themeColor = themeColor?.trim() || null;
      res.json(await storage.updateChurchBranding(churchId, update));
    } catch { res.status(500).json({ message: "Failed to update branding" }); }
  });

  // ── Sermon Bookmarks ──────────────────────────────────────────────────────────
  app.post("/api/churches/:id/sermons/:sermonId/bookmark", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const isBookmarked = await storage.toggleSermonBookmark(sermonId, churchId, uid);
      res.json({ isBookmarked });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/churches/:id/bookmarks", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const sermonIds = await storage.getSermonBookmarks(churchId, uid);
      res.json({ sermonIds });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Sermon Notes ──────────────────────────────────────────────────────────────
  app.get("/api/churches/:id/sermons/:sermonId/note", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const note = await storage.getSermonNote(sermonId, uid);
      res.json({ body: note?.body ?? "" });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  app.put("/api/churches/:id/sermons/:sermonId/note", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const { body } = req.body;
      const note = await storage.upsertSermonNote(sermonId, churchId, uid, body ?? "");
      res.json(note);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Giving Reports ─────────────────────────────────────────────────────────────
  app.get("/api/churches/:id/giving/reports", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const txns = await storage.getChurchTransactions(churchId, 5000);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const completed = txns.filter(t => t.status === "completed");
      const sum = (arr: typeof completed) => ({
        gross: arr.reduce((s, t) => s + t.grossAmount, 0),
        fee: arr.reduce((s, t) => s + t.platformFeeAmount, 0),
        net: arr.reduce((s, t) => s + t.churchNetAmount, 0),
        count: arr.length,
      });
      const filterByDate = (d: Date) => completed.filter(t => t.createdAt && new Date(t.createdAt) >= d);
      res.json({
        today: sum(filterByDate(startOfDay)),
        week: sum(filterByDate(startOfWeek)),
        month: sum(filterByDate(startOfMonth)),
        year: sum(filterByDate(startOfYear)),
        all: sum(completed),
        recent: txns.slice(0, 20),
      });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ── Giving CSV Export ─────────────────────────────────────────────────────────
  app.get("/api/churches/:id/giving/export-csv", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const txns = await storage.getChurchTransactions(churchId, 5000);
      const header = "Date,Reference,Category,Donor,Email,Anonymous,Gross,Platform Fee,Net,Status";
      const fmt = (cents: number) => (cents / 100).toFixed(2);
      const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
      const rows = txns.map(t => [
        t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "",
        escape(t.reference),
        escape(t.categoryName),
        escape(t.isAnonymous ? "Anonymous" : t.donorName),
        escape(t.isAnonymous ? "" : t.donorEmail),
        t.isAnonymous ? "Yes" : "No",
        fmt(t.grossAmount),
        fmt(t.platformFeeAmount),
        fmt(t.churchNetAmount),
        t.status,
      ].join(",")).join("\n");
      const csv = header + "\n" + rows;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="giving-report-${churchId}.csv"`);
      res.send(csv);
    } catch { res.status(500).json({ message: "Server error" }); }
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

  // ── Church Departments ────────────────────────────────────────────────────────
  const deptAuth = async (req: any, deptId: number) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const uid = await verifyFirebaseToken(authHeader.slice(7));
    const dept = await storage.getDepartment(deptId);
    if (!dept) throw new Error("Not found");
    const churchMember = await storage.getChurchMember(dept.churchId, uid);
    if (!churchMember || churchMember.status !== "active") throw new Error("Not a church member");
    const deptMember = await storage.getMyDepartmentMembership(deptId, churchMember.id);
    const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
    const isChurchAdmin = ADMIN_ROLES.includes(churchMember.role ?? "");
    return { uid, churchMember, deptMember, dept, isChurchAdmin };
  };

  app.get("/api/churches/:churchId/departments", async (req, res) => {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.status !== "active") return res.status(403).json({ message: "Not a member" });
      const depts = await storage.getDepartments(churchId);
      const deptMembers = await Promise.all(depts.map(d => storage.getMyDepartmentMembership(d.id, member.id)));
      res.json(depts.map((d, i) => ({ ...d, myMembership: deptMembers[i] ?? null })));
    } catch (e: any) { res.status(500).json({ message: e.message ?? "Server error" }); }
  });

  app.post("/api/churches/:churchId/departments", async (req, res) => {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const member = await storage.getChurchMember(churchId, uid);
      const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"];
      if (!member || !ADMIN_ROLES.includes(member.role ?? "")) return res.status(403).json({ message: "Insufficient permissions" });
      const { name, type, description, logoUrl, bannerUrl } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      if (!description?.trim()) return res.status(400).json({ message: "Description is required" });
      const normalizedLogoUrl = logoUrl?.trim() || null;
      const normalizedBannerUrl = bannerUrl?.trim() || null;
      const isValidHttpsUrl = (v: string) => { try { const u = new URL(v); return u.protocol === "https:"; } catch { return false; } };
      if (normalizedLogoUrl && !isValidHttpsUrl(normalizedLogoUrl)) return res.status(400).json({ message: "Logo URL must be a valid https:// URL" });
      if (normalizedBannerUrl && !isValidHttpsUrl(normalizedBannerUrl)) return res.status(400).json({ message: "Banner URL must be a valid https:// URL" });
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const dept = await storage.createDepartment({ churchId, name: name.trim(), slug, type: type ?? "Custom", description: description.trim(), logoUrl: normalizedLogoUrl, bannerUrl: normalizedBannerUrl, inviteCode, isActive: true, createdBy: member.id });
      await storage.addDepartmentMember(dept.id, member.id, "leader");
      res.status(201).json(dept);
    } catch (e: any) { res.status(500).json({ message: e.message ?? "Server error" }); }
  });

  app.get("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { churchMember, deptMember, dept, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a department member" });
      const members = await storage.getDepartmentMembers(deptId);
      res.json({ ...dept, myMembership: deptMember ?? null, memberCount: members.length });
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 403).json({ message: e.message }); }
  });

  app.put("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember, dept } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { name, type, description, logoUrl, bannerUrl } = req.body;
      const updated = await storage.updateDepartment(deptId, { name, type, description, logoUrl, bannerUrl });
      if (dept) {
        const changes: string[] = [];
        if (name && name !== dept.name) changes.push(`name: "${dept.name}"→"${name}"`);
        if (type && type !== dept.type) changes.push(`type: "${dept.type}"→"${type}"`);
        if (description !== undefined && description !== dept.description) changes.push("description changed");
        if (logoUrl !== undefined && logoUrl !== dept.logoUrl) changes.push("logo changed");
        if (bannerUrl !== undefined && bannerUrl !== dept.bannerUrl) changes.push("banner changed");
        if (changes.length > 0) {
          storage.createAuditLog({ churchId: dept.churchId, departmentId: deptId, action: "department_edited", previousValue: dept.name, newValue: changes.join("; "), actorUid: churchMember.firebaseUid, actorRole: churchMember.role }).catch(() => {});
          // Notify all active department members of any relevant update
          const deptMembers = await storage.getDepartmentMembers(deptId);
          const changesSummary = changes.join(", ");
          for (const dm of deptMembers) {
            const memberEmail = dm.member?.email;
            const memberName = dm.member?.displayName ?? dm.member?.email ?? "Member";
            if (memberEmail) {
              storage.createInboxThread(
                { userEmail: memberEmail, userName: memberName, subject: `Department Updated: ${dept.name}`, category: "General" },
                `Dear ${memberName},\n\nThe "${dept.name}" department has been updated by church leadership. Changes: ${changesSummary}.\n\nIf you have any questions, please contact church leadership.\n\nGod bless,\nChurch Leadership`
              ).catch(() => {});
            }
          }
        }
      }
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/logo", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl } = req.body;
      if (!logoUrl || typeof logoUrl !== "string") return res.status(400).json({ message: "logoUrl is required" });
      const updated = await storage.updateDepartment(deptId, { logoUrl });
      res.json(updated);
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId/logo", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.updateDepartment(deptId, { logoUrl: null });
      res.json(updated);
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { isChurchAdmin } = await deptAuth(req, deptId);
      if (!isChurchAdmin) return res.status(403).json({ message: "Only church admins can delete departments" });
      await storage.deleteDepartment(deptId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/churches/departments/:deptId/members", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, dept } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const members = await storage.getDepartmentMembers(deptId);
      const profiles = await Promise.all(
        members.map(m => storage.getChurchMemberProfile(dept.churchId, m.member.firebaseUid ?? "").catch(() => null))
      );
      res.json(members.map((m, i) => ({
        ...m,
        member: { id: m.member.id, displayName: m.member.displayName, avatarUrl: profiles[i]?.photoUrl ?? null, role: m.member.role }
      })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/members", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, dept } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { churchMemberId, role } = req.body;
      const added = await storage.addDepartmentMember(deptId, parseInt(churchMemberId), role ?? "member");
      res.json(added);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId/members/:memberId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(deptId) || isNaN(memberId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader";
      const isSelf = churchMember.id === memberId;
      if (!isDeptLeader && !isChurchAdmin && !isSelf) return res.status(403).json({ message: "Not authorized" });
      await storage.removeDepartmentMember(deptId, memberId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/churches/departments/:deptId/members/:memberId/role", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(deptId) || isNaN(memberId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (deptMember?.role !== "leader" && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { role } = req.body;
      const updated = await storage.updateDepartmentMemberRole(deptId, memberId, role);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/join", async (req, res) => {
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const { inviteCode, email, displayName } = req.body;
      if (!inviteCode) return res.status(400).json({ message: "Invite code required" });
      const dept = await storage.getDepartmentByInviteCode(inviteCode.trim().toUpperCase());
      if (!dept || !dept.isActive) return res.status(404).json({ message: "Invalid or inactive invite code" });
      const church = await storage.getChurch(dept.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      // If user is not yet a church member, add them first
      let member = await storage.getChurchMember(dept.churchId, uid);
      if (!member) {
        const initialStatus = church.approvalMode === "auto_approve" ? "active" : "pending";
        member = await storage.addChurchMember({
          churchId: dept.churchId, firebaseUid: uid, email: email || "",
          displayName: displayName || null, role: "member", status: initialStatus,
          invitedGroupId: null, inviteCodeUsed: null,
        });
        if (initialStatus === "pending") {
          return res.json({ message: "Your church membership request is pending approval.", pending: true, church });
        }
      } else if (member.status !== "active") {
        return res.json({ message: "Your church membership is pending approval.", pending: true, church });
      }
      // Add to department (idempotent)
      const existing = await storage.getMyDepartmentMembership(dept.id, member.id);
      if (existing) return res.json({ message: "Already a member of this department", dept, church });
      const deptMember = await storage.addDepartmentMember(dept.id, member.id, "member");
      res.json({ message: "Joined department successfully", dept, deptMember, church });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/churches/departments/:deptId/posts", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const posts = await storage.getDepartmentPosts(deptId, type, 100);
      res.json(posts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/posts", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const { type, title, content, fileUrl, fileName } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const LEADER_ROLES = ["leader", "assistant_leader", "secretary"];
      if (type === "announcement" && !LEADER_ROLES.includes(deptMember?.role ?? "") && !isChurchAdmin) {
        return res.status(403).json({ message: "Only leaders can post announcements" });
      }
      const post = await storage.createDepartmentPost({ departmentId: deptId, authorMemberId: churchMember.id, type: type ?? "message", title, content: content.trim(), fileUrl, fileName, isPinned: false });
      res.status(201).json(post);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId/posts/:postId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const postId = parseInt(req.params.postId);
    if (isNaN(deptId) || isNaN(postId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const posts = await storage.getDepartmentPosts(deptId, undefined, 200);
      const post = posts.find(p => p.id === postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (post.authorMemberId !== churchMember.id && !isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentPost(postId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/churches/departments/:deptId/posts/:postId/pin", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const postId = parseInt(req.params.postId);
    if (isNaN(deptId) || isNaN(postId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.pinDepartmentPost(postId, req.body.isPinned === true);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/churches/departments/:deptId/events", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getDepartmentEvents(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/events", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can create events" });
      const { title, description, location, startDate, endDate, isAllDay } = req.body;
      if (!title?.trim() || !startDate) return res.status(400).json({ message: "Title and startDate required" });
      const event = await storage.createDepartmentEvent({ departmentId: deptId, createdBy: churchMember.id, title: title.trim(), description, location, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, isAllDay: isAllDay ?? false });
      res.status(201).json(event);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/churches/departments/:deptId/events/:eventId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const eventId = parseInt(req.params.eventId);
    if (isNaN(deptId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { title, description, location, startDate, endDate, isAllDay } = req.body;
      const updated = await storage.updateDepartmentEvent(eventId, { title, description, location, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isAllDay });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId/events/:eventId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const eventId = parseInt(req.params.eventId);
    if (isNaN(deptId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentEvent(eventId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/churches/departments/:deptId/tasks", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getDepartmentTasks(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/tasks", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can create tasks" });
      const { title, description, assignedTo, dueDate, priority } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      const task = await storage.createDepartmentTask({ departmentId: deptId, createdBy: churchMember.id, title: title.trim(), description, assignedTo: assignedTo ? parseInt(assignedTo) : undefined, dueDate: dueDate ? new Date(dueDate) : undefined, status: "pending", priority: priority ?? "normal" });
      res.status(201).json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/churches/departments/:deptId/tasks/:taskId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const taskId = parseInt(req.params.taskId);
    if (isNaN(deptId) || isNaN(taskId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const updated = await storage.updateDepartmentTask(taskId, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/churches/departments/:deptId/tasks/:taskId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const taskId = parseInt(req.params.taskId);
    if (isNaN(deptId) || isNaN(taskId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentTask(taskId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/churches/departments/:deptId/attendance", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can view attendance" });
      res.json(await storage.getDepartmentAttendance(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/churches/departments/:deptId/attendance", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { sessionDate, sessionTitle, attendeeIds } = req.body;
      if (!sessionDate || !Array.isArray(attendeeIds)) return res.status(400).json({ message: "sessionDate and attendeeIds[] required" });
      const session = await storage.createDepartmentAttendance({ departmentId: deptId, sessionDate: new Date(sessionDate), sessionTitle: sessionTitle ?? null, attendeeIds: attendeeIds.map(Number), createdBy: churchMember.id });
      res.status(201).json(session);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/churches/departments/:deptId/attendance/:sessionId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const sessionId = parseInt(req.params.sessionId);
    if (isNaN(deptId) || isNaN(sessionId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { attendeeIds } = req.body;
      const updated = await storage.updateDepartmentAttendance(sessionId, { attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(Number) : undefined });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Admin: Global Giving Platform Settings ────────────────────────────────────
  // Member: my giving history for a church
  app.get("/api/churches/:id/giving/my-history", async (req, res) => {
    const churchId = parseInt(req.params.id);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid church ID" });
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const { auth } = await import("./firebase-admin.js");
      const decoded = await auth.verifyIdToken(authHeader.slice(7));
      const uid = decoded.uid;
      const txns = await storage.getMyGivingHistory(churchId, uid, 50);
      res.json(txns);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Admin: seed default giving categories
  app.post("/api/churches/:id/giving/seed-categories", async (req, res) => {
    const churchId = parseInt(req.params.id);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid church ID" });
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const { auth } = await import("./firebase-admin.js");
      const decoded = await auth.verifyIdToken(authHeader.slice(7));
      const uid = decoded.uid;
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const member = await storage.getChurchMember(churchId, uid);
      const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
      if (!member || !ADMIN_ROLES.includes(member.role ?? "")) return res.status(403).json({ message: "Not authorized" });
      const cats = await storage.seedDefaultGivingCategories(churchId);
      res.json(cats);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // Super admin: all-church giving stats
  app.get("/api/admin/giving/stats", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const stats = await storage.getAllGivingStats();
      res.json(stats);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

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

  // ─────────────────────────────────────────────────────────────────────────
  // USER PROFILE ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  // GET  /api/user/profile  — fetch authenticated user's global profile
  app.get("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const profile = await storage.getUserProfile(uid);
      res.json(profile ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // PUT  /api/user/profile  — create/update authenticated user's profile
  app.put("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    const { displayName, email, country, profilePictureUrl, emailConsentMinistry, emailConsentNotifications } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    try {
      const profile = await storage.upsertUserProfile({
        firebaseUid: uid,
        email,
        displayName: displayName ?? null,
        country: country ?? null,
        profilePictureUrl: profilePictureUrl ?? null,
        emailConsentMinistry: !!emailConsentMinistry,
        emailConsentNotifications: !!emailConsentNotifications,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // PATCH /api/user/profile  — partial update (name, country, pic, prefs)
  app.patch("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const allowed: Record<string, any> = {};
      const fields = ["displayName", "country", "profilePictureUrl", "emailConsentMinistry", "emailConsentNotifications"];
      for (const f of fields) {
        if (f in req.body) allowed[f] = req.body[f];
      }
      const profile = await storage.updateUserProfile(uid, allowed);
      res.json(profile);
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // GET /api/user/profile/picture  — stream profile picture from object storage
  app.get("/api/user/profile/picture", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const profile = await storage.getUserProfile(uid);
      if (!profile?.profilePictureUrl) return res.status(404).json({ message: "No profile picture" });
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/index.js");
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(profile.profilePictureUrl);
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": (metadata.contentType as string) || "image/jpeg",
        "Cache-Control": "private, max-age=300",
      });
      if (metadata.size) res.set("Content-Length", String(metadata.size));
      const stream = file.createReadStream();
      stream.on("error", () => { if (!res.headersSent) res.status(500).end(); });
      stream.pipe(res);
    } catch (err: any) {
      if (err?.name === "ObjectNotFoundError") return res.status(404).json({ message: "Picture not found" });
      res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/user/activity  — record one activity entry per day (idempotent)
  app.post("/api/user/activity", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      await storage.recordUserActivity(uid);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN — CHURCH OVERSIGHT
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/admin/church-oversight  — per-church stats for admin
  app.get("/api/admin/church-oversight", requireAdmin, async (req, res) => {
    try {
      const [churches, summary] = await Promise.all([
        storage.getChurchOversightData(),
        storage.getChurchOversightSummary(),
      ]);
      res.json({ churches, summary });
    } catch (err) {
      console.error("Church oversight error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN — APP ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/admin/analytics  — DAU/WAU/MAU + user stats for admin
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAppAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("Analytics error:", err);
      res.status(500).json({ message: "Server error" });
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
