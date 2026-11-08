import test from 'node:test';
import assert from 'node:assert/strict';
import {isChurchApi,isBlockedFinance,runtimeMode} from '../server/policy.mjs';
test('isolates the church API from devotional, music and global admin endpoints',()=>{
 for(const path of ['/api/churches','/api/churches/3/members','/api/public/churches/example','/api/church-invite/ABC-1234','/api/user/profile'])assert.equal(isChurchApi(path),true,path);
 for(const path of ['/api/churches-evil','/api/music','/api/devotionals','/api/admin/churches','/api/admin/giving/transactions','/api/user/library'])assert.equal(isChurchApi(path),false,path);
});
test('blocks inherited checkout, webhook, confirmation and bank-account operations',()=>{
 for(const path of ['/api/church-giving-webhook','/api/churches/slug/example/giving/create-session','/api/churches/slug/example/giving/confirm','/api/churches/3/payout-config'])assert.equal(isBlockedFinance(path),true,path);
 assert.equal(isBlockedFinance('/api/churches/3/giving/settings','POST'),true);
 assert.equal(isBlockedFinance('/api/churches/3/giving/reports'),false);
});
test('does not adopt a parent production database or silently enable persistence',()=>{
 assert.equal(runtimeMode({DATABASE_URL:'postgres://parent'}),'preview');
 assert.throws(()=>runtimeMode({MINISTRIUM_DATABASE_URL:'postgres://new'}),/Confirm/);
 assert.throws(()=>runtimeMode({MINISTRIUM_DATABASE_URL:'postgres://new',MINISTRIUM_DATABASE_CONFIRMED:'standalone'}),/MINISTRIUM_FIREBASE_PROJECT_ID/);
 assert.throws(()=>runtimeMode({DATABASE_URL:'postgres://parent',MINISTRIUM_DATABASE_URL:'postgres://parent',MINISTRIUM_DATABASE_CONFIRMED:'standalone',MINISTRIUM_FIREBASE_PROJECT_ID:'test'}),/reuse/);
 assert.equal(runtimeMode({MINISTRIUM_DATABASE_URL:'postgres://new',MINISTRIUM_DATABASE_CONFIRMED:'standalone',MINISTRIUM_FIREBASE_PROJECT_ID:'test'}),'workspace');
});
