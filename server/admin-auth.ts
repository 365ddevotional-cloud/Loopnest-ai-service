import { auth } from "./firebase-admin";
import type { Express, Request, Response } from "express";

function establishAdminSession(req: Request, res: Response) {
  req.session.regenerate((error) => {
    if (error) return res.status(503).json({ success: false, message: "Admin session unavailable" });
    req.session.isAdmin = true;
    // Do not report success until the shared session store has saved the login.
    req.session.save((error) => {
      if (error) {
        req.session.destroy(() => {});
        return res.status(503).json({ success: false, message: "Admin session could not be saved" });
      }
      res.json({ success: true, message: "Login successful" });
    });
  });
}

export function registerAdminAuth(app: Express, password: string | undefined) {
  app.use("/api/auth", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.post("/api/auth/login", (req, res) => {
    if (!password) return res.status(503).json({ success: false, message: "Admin login not configured" });
    if (req.body.password !== password) return res.status(401).json({ success: false, message: "Invalid password" });
    establishAdminSession(req, res);
  });
  app.post("/api/auth/backup-admin", async (req, res) => {
    const allowed = process.env.BACKUP_ADMIN_EMAIL?.trim().toLowerCase();
    const token = req.get("authorization")?.match(/^Bearer ([^ ]+)$/i)?.[1];
    if (!allowed || !token) return res.sendStatus(401);
    try {
      const identity = await auth.verifyIdToken(token);
      if (!identity.uid || identity.email_verified !== true || identity.email?.toLowerCase() !== allowed) {
        return res.sendStatus(403);
      }
      establishAdminSession(req, res);
    } catch {
      return res.sendStatus(401);
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid", { path: "/" });
      res.json({ success: true, message: "Logged out" });
    });
  });
  app.get("/api/auth/check", (req, res) => res.json({ isAdmin: !!req.session?.isAdmin }));
}
