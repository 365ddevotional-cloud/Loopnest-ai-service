import {createFirebaseVerifier} from './firebase-verifier.mjs';
const verify=createFirebaseVerifier({projectId:()=>process.env.MINISTRIUM_FIREBASE_PROJECT_ID});
export const auth={verifyIdToken:async(token:string):Promise<{uid:string;[key:string]:any}>=>verify(token)};
