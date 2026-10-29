import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
const config={apiKey:import.meta.env.VITE_MH_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_MH_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_MH_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_MH_FIREBASE_APP_ID};
export const authConfigured=Object.values(config).every(Boolean);
export const auth=authConfigured?getAuth(initializeApp(config,'ministryharbor')):null;
