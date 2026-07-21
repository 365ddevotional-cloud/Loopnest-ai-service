import { getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Reuse the app already initialised by client/src/lib/firebase.ts
// to avoid "Firebase: Firebase App named '[DEFAULT]' already exists" error.
const app = getApps().length > 0 ? getApp() : (() => { throw new Error("Firebase not initialised"); })();
export const auth = getAuth(app);
