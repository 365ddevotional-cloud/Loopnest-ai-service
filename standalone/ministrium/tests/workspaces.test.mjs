import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import {createWorkspaceService} from '../server/workspaces.mjs';
import {registerWorkspaceRoutes} from '../server/workspace-routes.mjs';
let pg,service,appServer,base;
const owner={uid:'owner',email:'owner@example.com',email_verified:true};
const outsider={uid:'outsider',email:'outsider@example.com',email_verified:true};
const member={uid:'member',email:'member@example.com',email_verified:true};
const input=(slug)=>({name:'Grace Community',slug,kind:'both',country:'US',city:'Houston'});
before(async()=>{
 pg=new PGlite();
 await pg.exec(await readFile(new URL('../migrations/001_workspaces.sql',import.meta.url),'utf8'));
 service=createWorkspaceService(pg);
 const app=express();app.use(express.json());
 registerWorkspaceRoutes(app,pg,async token=>{
  const users={owner,outsider,member,unverified:{...owner,email_verified:false}};
  if(!users[token])throw new Error('Invalid token');return users[token];
 });
 app.use((error,_req,res,_next)=>res.status(500).json({message:error.message}));
 appServer=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 base=`http://127.0.0.1:${appServer.address().port}`;
});
after(async()=>{await new Promise(resolve=>appServer.close(resolve));await pg.close();});

test('creates the owner atomically and limits tenant data to memberships',async()=>{
 const org=await service.create(owner,input('tenant-a'));
 assert.equal(org.role,'owner');assert.equal(org.kind,'both');
 assert.equal((await service.list(owner)).length,1);
 assert.deepEqual(await service.list(outsider),[]);
 await assert.rejects(service.detail(outsider,org.id),{status:404});
 await assert.rejects(service.members(outsider,org.id),{status:404});
 await assert.rejects(service.create(owner,{...input('forged-role'),role:'admin'}),{status:400});
 await assert.rejects(service.create(owner,input('tenant-a')),{status:409});
 const count=await pg.query('SELECT count(*)::int AS n FROM ministrium.organizations');assert.equal(count.rows[0].n,1);
});

test('invitations use hashed single-use tokens bound to a verified email',async()=>{
 const org=(await service.list(owner))[0];
 await assert.rejects(service.invite(outsider,org.id,{email:member.email}),{status:404});
 const invite=await service.invite(owner,org.id,{email:'MEMBER@example.com'});
 const persisted=(await pg.query('SELECT token_hash FROM ministrium.invitations WHERE id=$1',[invite.id])).rows[0];
 assert.notEqual(persisted.token_hash,invite.token);
 assert.equal(persisted.token_hash,createHash('sha256').update(invite.token).digest('hex'));
 assert.equal('token' in (await service.invitations(owner,org.id))[0],false);
 await assert.rejects(service.join(outsider,invite.token),{status:404});
 const joined=await service.join(member,invite.token);assert.equal(joined.organizationId,org.id);
 assert.equal((await service.detail(member,org.id)).role,'member');
 await assert.rejects(service.join(member,invite.token),{status:404});
 await assert.rejects(service.invite(member,org.id,{email:'friend@example.com'}),{status:404});
 await assert.rejects(service.members(member,org.id),{status:404});
});

test('expired and revoked invites fail; cross-workspace revocation is rejected',async()=>{
 const first=(await service.list(owner))[0], second=await service.create(outsider,input('tenant-b'));
 const invite=await service.invite(owner,first.id,{email:'next@example.com'});
 await assert.rejects(service.revoke(outsider,second.id,invite.id),{status:404});
 await service.revoke(owner,first.id,invite.id);
 await assert.rejects(service.join({uid:'next',email:'next@example.com'},invite.token),{status:404});
 const expired=await service.invite(owner,first.id,{email:'next@example.com'});
 await pg.query("UPDATE ministrium.invitations SET created_at=now()-interval '8 days', expires_at=now()-interval '1 day' WHERE id=$1",[expired.id]);
 await assert.rejects(service.join({uid:'next',email:'next@example.com'},expired.token),{status:404});
});

test('existing owner role survives an invitation to the same workspace',async()=>{
 const org=(await service.list(owner))[0];
 const invite=await service.invite(owner,org.id,{email:owner.email});
 await service.join(owner,invite.token);
 assert.equal((await service.detail(owner,org.id)).role,'owner');
});

test('HTTP boundary rejects missing/unverified identity and ignores client identity claims',async()=>{
 for(const token of [null,'invalid','unverified']){
  const r=await fetch(`${base}/api/workspaces`,{headers:token?{Authorization:`Bearer ${token}`}:{}});assert.equal(r.status,401);
 }
 const response=await fetch(`${base}/api/workspaces`,{method:'POST',headers:{Authorization:'Bearer outsider','Content-Type':'application/json'},body:JSON.stringify({...input('forged-owner'),uid:'owner'})});assert.equal(response.status,400);
 const org=(await service.list(owner))[0];
 const denied=await fetch(`${base}/api/workspaces/${org.id}/members`,{headers:{Authorization:'Bearer outsider'}});assert.equal(denied.status,404);assert.equal(denied.headers.get('cache-control'),'no-store');
 const good=await fetch(`${base}/api/workspaces`,{headers:{Authorization:'Bearer owner'}});assert.equal(good.status,200);assert.equal((await good.json())[0].id,org.id);
});

test('creation quota is enforced and failed creation leaves no partial organization',async()=>{
 const limited={uid:'limited',email:'limited@example.com'};
 for(let i=0;i<5;i++)await service.create(limited,input(`limited-${i}`));
 await assert.rejects(service.create(limited,input('limited-six')),{status:409});
 assert.equal((await service.list(limited)).length,5);
});

test('simultaneous invitation acceptance creates only one membership',async()=>{
 const org=(await service.list(owner))[0];
 const person={uid:'simultaneous',email:'simultaneous@example.com'};
 const invite=await service.invite(owner,org.id,{email:person.email});
 const results=await Promise.allSettled([service.join(person,invite.token),service.join(person,invite.token)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await service.list(person)).length,1);
});

test('family, prayer and discipleship groups stand alone and remain private',async()=>{
 const leader={uid:'family-leader',email:'family-leader@example.com'};
 for(const groupType of ['family','prayer','discipleship']){
  const group=await service.create(leader,{...input(`group-${groupType}`),kind:'group',groupType});
  assert.equal(group.kind,'group');assert.equal(group.groupType,groupType);
  assert.equal((await service.detail(leader,group.id)).groupType,groupType);
  await assert.rejects(service.detail(outsider,group.id),{status:404});
 }
 await assert.rejects(service.create(leader,{...input('missing-purpose'),kind:'group'}),{status:400});
 await assert.rejects(service.create(leader,{...input('incorrect-purpose'),groupType:'family'}),{status:400});
});
