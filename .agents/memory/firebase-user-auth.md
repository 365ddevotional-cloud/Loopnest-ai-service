---
name: Firebase User Auth Architecture
description: How Firebase user accounts (email/password) are integrated alongside the existing admin session auth.
---

## Rule
The app has two separate auth systems that must never be conflated:
1. **Admin auth** — express-session + `ADMIN_PASSWORD` env var, checked via `req.session.isAdmin`, middleware: `requireAdmin`. Managed in `AuthContext.tsx`.
2. **User accounts** — Firebase email/password auth. Token passed as `Authorization: Bearer <idToken>` header. Middleware: `requireUser` in routes.ts. Managed in `UserContext.tsx`.

## Firebase App Init
- LoopNest eagerly initializes the Firebase default app at module load time (via `loopnest/firebase.ts`).
- Main app's `client/src/lib/firebase.ts` uses `getApps().length === 0 ? initializeApp(...) : getApp()` to safely reuse the already-initialized default app.

## Token Verification (server-side)
- Uses `google-auth-library` v10 `OAuth2Client.verifySignedJwtWithCertsAsync`.
- Certs fetched from: `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` (cached 1 hour).
- Audience: `VITE_FIREBASE_PROJECT_ID`, Issuer: `https://securetoken.google.com/${projectId}`.
- Returns `payload.sub` (Firebase UID) on success.

**Why:** Admin and user auth are orthogonal. Admin accesses the dashboard; users save songs/favorites. Keeping them separate prevents privilege escalation and simplifies reasoning about access control.
