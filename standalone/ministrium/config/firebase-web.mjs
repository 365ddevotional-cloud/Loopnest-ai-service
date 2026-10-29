// Firebase web-app identifiers supplied by the project owner. These are public
// client configuration values, not a service-account key or database credential.
export const ministriumFirebaseWeb = Object.freeze({
  apiKey: 'AIzaSyDrhLaz9UBm3n3kqHDTQ4XpyYUCGF1qFRU',
  authDomain: 'ministrium-425f9.firebaseapp.com',
  projectId: 'ministrium-425f9',
  storageBucket: 'ministrium-425f9.firebasestorage.app',
  messagingSenderId: '192624290326',
  appId: '1:192624290326:web:9f95b8f033735497e9e337',
});
const fields={apiKey:'API_KEY',authDomain:'AUTH_DOMAIN',projectId:'PROJECT_ID',appId:'APP_ID'};
export function resolveFirebaseWebConfig(env){
  const overrides=Object.fromEntries(Object.entries(fields).map(([field,key])=>[field,env[`VITE_MINISTRIUM_FIREBASE_${key}`]]));
  const present=Object.values(overrides).filter(Boolean).length;
  if(present===0)return {...ministriumFirebaseWeb};
  if(present!==4)throw new Error('Supply all four VITE_MINISTRIUM_FIREBASE_* settings, or leave all unset to use the registered Ministrium project.');
  // An alternate project must never inherit storage/messaging identifiers from Ministrium.
  return overrides;
}
