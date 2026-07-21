import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase client configuration for the loopnest-app project.
// These values are public by design — they are compiled into the browser bundle
// and security is enforced by Firebase Security Rules, not by keeping them hidden.
//
// NOTE: The VITE_FIREBASE_* Replit secrets currently contain stale/incorrect
// values that cannot be overwritten programmatically. Until the stale secrets
// are deleted and replaced with the correct ones, the config below is
// authoritative and the env vars are intentionally ignored.
const firebaseConfig = {
  apiKey:            "AIzaSyCN38VKLB-cSDVfQ3EQOLmKA4j5NnROeeo",
  authDomain:        "loopnest-app.firebaseapp.com",
  projectId:         "loopnest-app",
  storageBucket:     "loopnest-app.firebasestorage.app",
  messagingSenderId: "341786649615",
  appId:             "1:341786649615:web:4bf2cdde4f63b2fe3daf7a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
