import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendPrayerReplyNotification, sendContactMessageNotification, sendContactAutoReply, sendGeneralInquiryNotification, sendFeedbackNotification, sendPartnershipNotification } from "./sendgrid";
import { sendSmsNotification, isValidE164PhoneNumber } from "./twilio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getTodayDateString, isFutureDate, isPastDate } from "./date-utils";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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
  app.get(api.devotionals.getToday.path, async (req, res) => {
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayDateString();
    const isAdmin = !!req.session?.isAdmin;
    let devotional = await storage.getDevotionalByDate(today);
    
    // If no devotional for today, fallback to the latest available one
    // Note: getDevotionals() returns items sorted by date descending (newest first)
    if (!devotional) {
      const all = await storage.getDevotionals();
      if (isAdmin) {
        // Admin sees the latest devotional regardless of date
        devotional = all.length > 0 ? all[0] : undefined;
      } else {
        // Non-admin only sees past/present devotionals - find the first non-future one
        // Use client's date for comparison if provided
        devotional = all.find(d => d.date <= today);
      }
    }

    if (!devotional) {
      return res.status(404).json({ message: "No devotionals found." });
    }
    
    res.json(devotional);
  });

  // GET Devotional by specific Date
  // Non-admin users cannot access future devotionals
  // Accepts optional clientDate query param for client timezone support
  app.get(api.devotionals.getByDate.path, async (req, res) => {
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
    res.json(devotional);
  });

  // GET All Devotionals (Archive)
  // Non-admin users only see past and present devotionals
  // Accepts optional clientDate query param for client timezone support
  app.get(api.devotionals.list.path, async (req, res) => {
    const list = await storage.getDevotionals();
    const clientDate = typeof req.query.clientDate === 'string' ? req.query.clientDate : null;
    const today = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayDateString();
    const isAdmin = !!req.session?.isAdmin;
    
    if (isAdmin) {
      res.json(list);
    } else {
      // Filter out future devotionals for non-admin users based on client's date
      const filteredList = list.filter(d => d.date <= today);
      res.json(filteredList);
    }
  });

  // POST Create Devotional (Admin only)
  app.post(api.devotionals.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.devotionals.create.input.parse(req.body);
      
      // Check if one exists for this date
      const existing = await storage.getDevotionalByDate(input.date);
      if (existing) {
        return res.status(400).json({ message: "A devotional already exists for this date." });
      }

      const devotional = await storage.createDevotional(input);
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
  app.delete(api.devotionals.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
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
    
    await storage.deleteDevotional(id);
    res.status(204).send();
  });

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

  // Get thread messages (Admin only)
  app.get(api.prayerRequests.getThread.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
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

  // Object Storage Routes
  registerObjectStorageRoutes(app);

  // Prayer Attachment Routes (Admin only)
  app.get("/api/prayer-requests/:id/attachments", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
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

  // Seed Data if empty
  await seedDatabase();
  await seedAutoReplyTemplates();

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
      author: "Rev. Moses Afolabi"
    });

    console.log("Database seeded with initial devotional.");
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
