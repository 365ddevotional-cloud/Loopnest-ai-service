import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {applyWorkspaceMigration} from '../server/migrations.mjs';
import {createWorkspaceService} from '../server/workspaces.mjs';
import {createCommunityService} from '../server/community.mjs';
let db,community,org,second;
const owner={uid:'leader',email:'leader@example.com'},member={uid:'participant',email:'participant@example.com'},outsider={uid:'other',email:'other@example.com'};
before(async()=>{
 db=new PGlite();
 for(const [index,name]of ['001_workspaces.sql','002_community.sql'].entries()){
  const sql=await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8');
  assert.equal((await applyWorkspaceMigration(db,sql,index+1)).applied,true);
  assert.equal((await applyWorkspaceMigration(db,sql,index+1)).applied,false);
 }
 const workspaces=createWorkspaceService(db);
 const input=slug=>({name:'Family circle',slug,kind:'group',groupType:'family',country:'US',city:'Houston'});
 org=await workspaces.create(owner,input('family-circle'));second=await workspaces.create(outsider,input('other-circle'));
 const invite=await workspaces.invite(owner,org.id,{email:member.email});await workspaces.join(member,invite.token);
 community=createCommunityService(db);
});
after(async()=>{await db.close();});
test('conversation uses verified author and isolates communities',async()=>{
 const posted=await community.postMessage(member,org.id,{authorName:'Family member',body:'Please pray with me.'});
 assert.equal(posted.authorUid,member.uid);
 assert.equal((await community.messages(owner,org.id))[0].body,'Please pray with me.');
 assert.deepEqual(await community.messages(outsider,second.id),[]);
 await assert.rejects(community.messages(outsider,org.id),{status:404});
 await assert.throws(()=>community.postMessage(member,org.id,{authorName:'Member',body:'Forged',authorUid:owner.uid}),{status:400});
 await assert.rejects(community.postMessage(member,second.id,{authorName:'Member',body:'Outside'}),{status:404});
});
test('only prayer author or leaders can change answered status within their community',async()=>{
 const request=await community.postPrayer(owner,org.id,{authorName:'Leader',title:'Our family',body:'Peace and wisdom.'});
 await assert.rejects(community.answerPrayer(member,org.id,request.id,{answered:true}),{status:404});
 await assert.rejects(community.answerPrayer(outsider,second.id,request.id,{answered:true}),{status:404});
 assert.equal((await community.answerPrayer(owner,org.id,request.id,{answered:true})).answered,true);
 const own=await community.postPrayer(member,org.id,{authorName:'Member',title:'Thanksgiving',body:'Grateful for support.'});
 assert.equal((await community.answerPrayer(member,org.id,own.id,{answered:true})).answered,true);
 assert.equal((await community.prayers(owner,org.id)).length,2);
});
test('gatherings require leaders and valid time zones and safe existing meeting links',async()=>{
 const input={title:'Family prayer',startsAt:new Date(Date.now()+86400000).toISOString(),timezone:'America/Chicago',meetingUrl:'https://example.com/prayer'};
 await assert.rejects(community.schedule(member,org.id,input),{status:404});
 for(const change of [{meetingUrl:'not a URL'},{timezone:'Invalid/Zone'},{meetingUrl:'javascript:alert(1)'},{meetingUrl:'https://user:password@example.com'}])await assert.throws(()=>community.schedule(owner,org.id,{...input,...change}),{status:400});
 const saved=await community.schedule(owner,org.id,input);
 assert.equal(new Date(saved.startsAt).toISOString(),input.startsAt);
 assert.equal((await community.gatherings(member,org.id))[0].meetingUrl,input.meetingUrl);
 assert.deepEqual(await community.gatherings(outsider,second.id),[]);
 await assert.rejects(community.gatherings(outsider,org.id),{status:404});
});
