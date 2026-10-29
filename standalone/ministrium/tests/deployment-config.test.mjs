import test from 'node:test';
import assert from 'node:assert/strict';
import {frontendIdentity,assertWorkspaceIdentity,stagingReadiness} from '../server/deployment-config.mjs';
const configured={MINISTRIUM_DATABASE_URL:'postgres://ministrium:example@dedicated:5432/ministrium',MINISTRIUM_DATABASE_CONFIRMED:'standalone',MINISTRIUM_FIREBASE_PROJECT_ID:'ministrium-test',VITE_MINISTRIUM_FIREBASE_API_KEY:'test-public-key',VITE_MINISTRIUM_FIREBASE_AUTH_DOMAIN:'ministrium-test.firebaseapp.com',VITE_MINISTRIUM_FIREBASE_PROJECT_ID:'ministrium-test',VITE_MINISTRIUM_FIREBASE_APP_ID:'test-public-app-id'};
test('staging reports missing names and requires a complete, matching identity configuration',()=>{
 const missing=stagingReadiness({});assert.equal(missing.ready,false);assert.ok(missing.missing.includes('MINISTRIUM_DATABASE_URL'));
 assert.deepEqual(stagingReadiness(configured),{ready:true,missing:[]});
 assert.deepEqual(frontendIdentity({}),{configured:false,projectId:null});
 assert.throws(()=>frontendIdentity({VITE_MINISTRIUM_FIREBASE_API_KEY:'partial'}),/all four/);
 assert.throws(()=>stagingReadiness({...configured,VITE_MINISTRIUM_FIREBASE_PROJECT_ID:'another-project'}),/same dedicated Firebase/);
 assert.throws(()=>assertWorkspaceIdentity(configured,{configured:false,projectId:null}),/Build the frontend/);
});
test('rejects shared database identity even if credentials or query options differ',()=>{
 assert.throws(()=>stagingReadiness({...configured,DATABASE_URL:'postgresql://other:password@dedicated:5432/ministrium?sslmode=require'}),/cannot be reused/);
 assert.throws(()=>stagingReadiness({...configured,MINISTRIUM_DATABASE_URL:'https://example.invalid/db'}),/PostgreSQL/);
 assert.throws(()=>stagingReadiness({...configured,FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099'}),/emulator/);
});
