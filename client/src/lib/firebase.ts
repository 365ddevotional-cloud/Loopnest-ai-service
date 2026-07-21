import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Correct Firebase client config for the loopnest-app project.
// These values are public by design (they ship in the browser bundle).
// Security is enforced by Firebase Security Rules, not by keeping these secret.
// Environment variables override the defaults if they hold valid values.
const DEFAULTS = {
  apiKey:            "AIzaSyCN38VKLB-cSDVfQ3EQOLmKA4j5NnROeeo",
  authDomain:        "loopnest-app.firebaseapp.com",
  projectId:         "loopnest-app",
  storageBucket:     "loopnest-app.firebasestorage.app",
  messagingSenderId: "341786649615",
  appId:             "1:341786649615:web:4bf2cdde4f63b2fe3daf7a",
};

function resolve(envVal: string | undefined, defaultVal: string): string {
  if (!envVal || envVal.trim() === "") return defaultVal;
  // Reject obviously wrong values (e.g. appId format in projectId slot)
  if (envVal.startsWith("1:") && envVal.includes(":web:") && defaultVal === DEFAULTS.projectId) {
    return defaultVal;
  }
  // authDomain must contain a dot — bare slug is incomplete
  if (defaultVal === DEFAULTS.authDomain && !envVal.includes(".")) {
    return defaultVal;
  }
  return envVal;
}

const firebaseConfig = {
  apiKey:            resolve(import.meta.env.VITE_FIREBASE_API_KEY,    DEFAULTS.apiKey),
  authDomain:        resolve(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, DEFAULTS.authDomain),
  projectId:         resolve(import.meta.env.VITE_FIREBASE_PROJECT_ID,  DEFAULTS.projectId),
  storageBucket:     DEFAULTS.storageBucket,
  messagingSenderId: DEFAULTS.messagingSenderId,
  appId:             resolve(import.meta.env.VITE_FIREBASE_APP_ID,      DEFAULTS.appId),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
