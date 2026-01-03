import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendPrayerReplyNotification } from "./sendgrid";
import { sendSmsNotification, isValidE164PhoneNumber } from "./twilio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // GET Today's Devotional
  app.get(api.devotionals.getToday.path, async (req, res) => {
    // Ideally, we get today's date in 'YYYY-MM-DD' format
    const today = new Date().toISOString().split("T")[0];
    let devotional = await storage.getDevotionalByDate(today);
    
    // If no devotional for today, fallback to the latest one
    if (!devotional) {
      devotional = await storage.getLatestDevotional();
    }

    if (!devotional) {
      return res.status(404).json({ message: "No devotionals found." });
    }
    
    res.json(devotional);
  });

  // GET Devotional by specific Date
  app.get(api.devotionals.getByDate.path, async (req, res) => {
    const date = req.params.date;
    const devotional = await storage.getDevotionalByDate(date);
    if (!devotional) {
      return res.status(404).json({ message: "Devotional not found for this date" });
    }
    res.json(devotional);
  });

  // GET All Devotionals (Archive)
  app.get(api.devotionals.list.path, async (req, res) => {
    const list = await storage.getDevotionals();
    res.json(list);
  });

  // POST Create Devotional
  app.post(api.devotionals.create.path, async (req, res) => {
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

  // DELETE Devotional
  app.delete(api.devotionals.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    await storage.deleteDevotional(id);
    res.status(204).send();
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

  app.get(api.prayerRequests.list.path, async (req, res) => {
    const requests = await storage.getPrayerRequests();
    res.json(requests);
  });

  app.get(api.prayerRequests.getReplies.path, async (req, res) => {
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

  // Update prayer request status
  app.patch(api.prayerRequests.updateStatus.path, async (req, res) => {
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

  // Update prayer request category
  app.patch("/api/prayer-requests/:id/category", async (req, res) => {
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

  // Get thread messages
  app.get(api.prayerRequests.getThread.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const messages = await storage.getThreadMessages(id);
    res.json(messages);
  });

  // Add thread message
  app.post(api.prayerRequests.addThreadMessage.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const { message, senderType } = req.body;
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

  app.post(api.autoReplyTemplates.upsert.path, async (req, res) => {
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

  // Prayer Attachment Routes
  app.get("/api/prayer-requests/:id/attachments", async (req, res) => {
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

  // Seed Data if empty
  await seedDatabase();
  await seedAutoReplyTemplates();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getDevotionals();
  if (existing.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    
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
