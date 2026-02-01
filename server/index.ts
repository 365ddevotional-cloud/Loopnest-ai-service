import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
// Seeding is now manual - run with: npx tsx server/seed-devotionals.ts or npx tsx server/seed-scripture.ts
// import { seedAllDevotionals } from "./seed-devotionals";
// import { seedBiblePassages, seedScripturesFromDevotionals } from "./seed-scripture";
const app = express();

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn(
    "WARNING: SESSION_SECRET not set. Using default for development only.",
  );
}

// Trust proxy for Replit's infrastructure (required for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: sessionSecret || "dev-only-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

// Serve PWA assets from client/public BEFORE routes (production fix)
app.use(express.static(path.join(process.cwd(), "client", "public")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seeding is now manual to prevent production crashes
  // Run: npx tsx server/seed-devotionals.ts
  // Run: npx tsx server/seed-scripture.ts

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development, serve static files in production
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  } else {
    serveStatic(app);
  }
})();

const port = parseInt(process.env.PORT || "5000", 10);

httpServer.listen(
  {
    port,
    host: "0.0.0.0",
  },
  () => {
    log(`serving on port ${port}`);
  },
);