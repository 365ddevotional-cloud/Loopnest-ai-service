import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import {applyWorkspaceMigration} from '../server/migrations.mjs';
import {createWorkspaceService} from '../server/workspaces.mjs';
import {createGroupStudy} from '../server/group-study.mjs';
import {createMinistryTools} from '../server/ministry-tools.mjs';
import {registerWorkspaceRoutes} from '../server/workspace-routes.mjs';
let db,study,groups,org,other,church,lesson,draft,server,base;
const owner={uid:'study-owner',email:'study-owner@example.com',email_verified:true},member={uid:'study-member',email:'study-member@example.com',email_verified:true},outsider={uid:'study-other',email:'study-other@example.com',email_verified:true};
const content=(position=1)=>({title:'Learning together',position,body:'Read the passage together.',scripture:'John 15:1–11',reflectionPrompt:'How can you encourage someone?',published:true});
before(async()=>{
 db=new PGlite();
 for(const [index,file]of ['001_workspaces.sql','002_community.sql','003_ministry_tools.sql','004_private_group_study.sql'].entries()){
  const sql=await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8');assert.equal((await applyWorkspaceMigration(db,sql,index+1)).applied,true);assert.equal((await applyWorkspaceMigration(db,sql,index+1)).applied,false);
 }
 groups=createWorkspaceService(db);study=createGroupStudy(db);
 org=await groups.create(owner,{name:'Family study',slug:'family-study',kind:'group',groupType:'family',country:'US'});
 other=await groups.create(outsider,{name:'Another group',slug:'another-group',kind:'group',groupType:'discipleship',country:'NG'});
 church=await groups.create(owner,{name:'Study church',slug:'study-church',kind:'church',country:'US'});
 const invite=await groups.invite(owner,org.id,{email:member.email});await groups.join(member,invite.token);
 const app=express();app.use(express.json());registerWorkspaceRoutes(app,db,async token=>{const users={owner,member,outsider};if(!users[token])throw new Error('No token');return users[token];});app.use((_e,_q,res,_n)=>res.status(500).json({message:'Request failed'}));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${server.address().port}/api/workspaces`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
test('private groups expose ordered shared lessons without requiring financial setup',async()=>{
 lesson=await study.create(owner,org.id,content(2));draft=await study.create(owner,org.id,{...content(1),title:'Leader draft',published:false});
 const own=await study.list(owner,org.id);assert.equal(own[0].id,draft.id);assert.equal(own[1].id,lesson.id);assert.equal('body' in own[0],false);
 const visible=await study.list(member,org.id);assert.equal(visible.length,1);assert.equal(visible[0].completed,false);
 assert.equal((await study.detail(member,org.id,lesson.id)).body,content().body);
 await assert.rejects(study.detail(member,org.id,draft.id),{status:404});
 await assert.rejects(study.create(member,org.id,content()),{status:404});
 await assert.rejects(study.create(owner,church.id,content()),{status:404});
 await assert.rejects(study.list(outsider,org.id),{status:404});assert.deepEqual(await study.list(outsider,other.id),[]);
});
test('lessons reject unsafe links, forged scope and invalid ordering',async()=>{
 for(const change of [{resourceUrl:'javascript:alert(1)'},{resourceUrl:'https://name:secret@example.com'},{resourceUrl:'bad-link'},{organizationId:other.id},{createdBy:outsider.uid},{position:0},{position:1000}])assert.throws(()=>study.create(owner,org.id,{...content(),...change}),{status:400});
 await assert.rejects(study.detail(outsider,other.id,lesson.id),{status:404});
});
test('reflections and completion belong only to the signed-in member and reject stale saves',async()=>{
 const saved=await study.saveProgress(member,org.id,lesson.id,{completed:true,reflection:'My private reflection',version:0});assert.equal(saved.version,1);
 assert.equal((await study.list(member,org.id))[0].completed,true);
 assert.deepEqual(await study.progress(owner,org.id,lesson.id),{completed:false,reflection:'',version:0});
 assert.equal((await study.list(owner,org.id)).find(x=>x.id===lesson.id).completed,false);
 await assert.rejects(study.saveProgress(member,org.id,lesson.id,{completed:false,reflection:'Stale device',version:0}),{status:409});
 assert.throws(()=>study.saveProgress(owner,org.id,lesson.id,{completed:false,reflection:'Forged identity',version:0,uid:member.uid}),{status:400});
 await assert.rejects(study.progress(outsider,other.id,lesson.id),{status:404});
 assert.equal((await study.saveProgress(member,org.id,lesson.id,{completed:false,reflection:'Updated reflection',version:1})).version,2);
});
test('leaders edit, archive and restore lessons while preserving personal progress',async()=>{
 const updated=await study.update(owner,org.id,lesson.id,{version:1,data:{...content(3),title:'Revised lesson'}});assert.equal(updated.version,2);
 await assert.rejects(study.update(owner,org.id,lesson.id,{version:1,data:content()}),{status:409});
 await study.archive(owner,org.id,lesson.id,{version:2,archived:true});assert.equal((await study.list(member,org.id)).length,0);
 await assert.rejects(study.progress(member,org.id,lesson.id),{status:404});await assert.rejects(study.list(member,org.id,true),{status:404});
 assert.equal((await study.list(owner,org.id,true))[0].version,3);
 await study.archive(owner,org.id,lesson.id,{version:3,archived:false});assert.equal((await study.progress(member,org.id,lesson.id)).reflection,'Updated reflection');
});
test('HTTP study routes enforce authentication, drafts and private progress',async()=>{
 assert.equal((await fetch(`${base}/${org.id}/lessons`)).status,401);
 const list=await fetch(`${base}/${org.id}/lessons`,{headers:{Authorization:'Bearer member'}});assert.equal(list.status,200);assert.equal(list.headers.get('cache-control'),'no-store');assert.equal((await list.json()).length,1);
 const draftRequest=await fetch(`${base}/${org.id}/lessons/${draft.id}`,{headers:{Authorization:'Bearer member'}});assert.equal(draftRequest.status,404);
 const ownerProgress=await fetch(`${base}/${org.id}/lessons/${lesson.id}/progress`,{headers:{Authorization:'Bearer owner'}});assert.equal((await ownerProgress.json()).reflection,'');
});
test('member removal immediately denies group study and clears private progress',async()=>{
 await createMinistryTools(db).changeMember(owner,org.id,member.uid,{action:'removed'});
 await assert.rejects(study.list(member,org.id),{status:404});assert.equal((await db.query('SELECT count(*)::int AS n FROM ministrium.group_lesson_progress WHERE uid=$1',[member.uid])).rows[0].n,0);
});
test('meeting instants display across countries and reject nonexistent daylight-saving local times',()=>{
 const url=new URL('../client/group-time.mjs',import.meta.url).href;
 const script=`import assert from 'node:assert/strict';import {localMeetingInstant,meetingTime} from ${JSON.stringify(url)};assert.throws(()=>localMeetingInstant('2026-03-08T02:30'),/does not exist/);assert.equal(localMeetingInstant('2026-03-08T03:30'),'2026-03-08T08:30:00.000Z');assert.throws(()=>localMeetingInstant('2026-02-30T12:00'));const instant='2026-11-01T00:30:00.000Z';assert.notEqual(meetingTime(instant,'Africa/Lagos'),meetingTime(instant,'America/Chicago'));const parts=(zone)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));assert.equal(parts('Africa/Lagos').day,'01');assert.equal(parts('America/Chicago').day,'31');`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:'America/Chicago'},encoding:'utf8'});assert.equal(run.status,0,run.stderr);
});
