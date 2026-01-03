import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  // Seed Data if empty
  await seedDatabase();

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
