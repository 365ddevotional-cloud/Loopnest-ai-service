import {resolveFirebaseWebConfig} from '../config/firebase-web.mjs';
export function frontendIdentity(env){
 const config=resolveFirebaseWebConfig(env);
 const projectId=config.projectId;
 if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))throw new Error('Invalid frontend Firebase project ID.');
 if(!/^[a-z0-9.-]+$/i.test(config.authDomain))throw new Error('Firebase auth domain must be a hostname, without a URL path.');
 return {configured:true,projectId};
}
export function assertWorkspaceIdentity(env,builtIdentity){
 if(!builtIdentity?.configured||builtIdentity.projectId!==env.MINISTRIUM_FIREBASE_PROJECT_ID)throw new Error('Build the frontend with the same dedicated Firebase project as the server.');
 if(env.FIREBASE_AUTH_EMULATOR_HOST)throw new Error('Firebase emulator configuration is not supported in the deployed workspace runtime.');
}
export function stagingReadiness(env){
 const required=['MINISTRIUM_DATABASE_URL','MINISTRIUM_DATABASE_CONFIRMED','MINISTRIUM_FIREBASE_PROJECT_ID'];
 const missing=required.filter(key=>!env[key]);
 if(missing.length)return {ready:false,missing};
 if(env.MINISTRIUM_DATABASE_CONFIRMED!=='standalone')throw new Error('Confirm the dedicated database before deployment.');
 const url=new URL(env.MINISTRIUM_DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('A PostgreSQL connection is required.');
 if(env.DATABASE_URL){const parent=new URL(env.DATABASE_URL);if(parent.hostname===url.hostname&&parent.port===url.port&&parent.pathname===url.pathname)throw new Error('The devotional database cannot be reused for Ministrium.');}
 assertWorkspaceIdentity(env,frontendIdentity(env));
 return {ready:true,missing:[]};
}
