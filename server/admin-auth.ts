import type { Express } from "express";

export function registerAdminAuth(app: Express, password: string | undefined) {
  app.use("/api/auth", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.post("/api/auth/login", (req, res) => {
    if (!password) return res.status(503).json({ success: false, message: "Admin login not configured" });
    if (req.body.password !== password) return res.status(401).json({ success: false, message: "Invalid password" });
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
