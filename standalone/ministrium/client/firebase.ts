import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {resolveFirebaseWebConfig} from '../config/firebase-web.mjs';
const config=resolveFirebaseWebConfig(import.meta.env);
export const authConfigured=Object.values(config).every(Boolean);
export const auth=authConfigured?getAuth(initializeApp(config,'ministrium')):null;
