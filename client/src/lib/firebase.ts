import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "";
const rawProjectId  = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";

// Normalise authDomain: if the stored value has no dot it is just the project slug;
// append .firebaseapp.com so Firebase Auth can reach the correct endpoint.
const authDomain = rawAuthDomain.includes(".")
  ? rawAuthDomain
  : `${rawAuthDomain}.firebaseapp.com`;

// Guard against the projectId slot accidentally containing an App-ID string
// (format "1:NNNN:web:HEX"). If that happens, fall back to the auth-domain
// prefix which is the actual project slug.
const projectId = rawProjectId.startsWith("1:") || rawProjectId.includes(":web:")
  ? rawAuthDomain.split(".")[0]
  : rawProjectId;

const firebaseConfig = {
  apiKey:    import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId,
  appId:     import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
