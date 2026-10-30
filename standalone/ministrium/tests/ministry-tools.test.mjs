import {workspaceMigrations} from '../server/migration-list.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import {createWorkspaceService} from '../server/workspaces.mjs';
import {createMinistryTools} from '../server/ministry-tools.mjs';
import {applyWorkspaceMigration} from '../server/migrations.mjs';
import {registerWorkspaceRoutes} from '../server/workspace-routes.mjs';
let db,service,workspaces,org,other,sermon,draft,department,server,base;
const owner={uid:'tools-owner',email:'tools-owner@example.com',email_verified:true},member={uid:'tools-member',email:'tools-member@example.com',email_verified:true},otherOwner={uid:'tools-other',email:'tools-other@example.com',email_verified:true};
const field=(kind,title='Test resource')=>({kind,title,body:'Ministry details',...(kind==='event'?{startsAt:new Date(Date.now()+86400000).toISOString()}:{} )});
before(async()=>{
 db=new PGlite();
 for(const [version,file] of workspaceMigrations.entries()){
  const sql=await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8');assert.equal((await applyWorkspaceMigration(db,sql,version+1)).applied,true);assert.equal((await applyWorkspaceMigration(db,sql,version+1)).applied,false);
 }
 workspaces=createWorkspaceService(db);service=createMinistryTools(db);
 const input=slug=>({name:'Tools Church',slug,kind:'church',country:'US',city:'Houston'});
 org=await workspaces.create(owner,input('tools-church'));other=await workspaces.create(otherOwner,input('other-church'));
 const invitation=await workspaces.invite(owner,org.id,{email:member.email});await workspaces.join(member,invitation.token);
 const app=express();app.use(express.json());registerWorkspaceRoutes(app,db,async token=>{const users={owner,member,other:otherOwner};if(!users[token])throw new Error('No identity');return users[token];});
 app.use((_error,_req,res,_next)=>res.status(500).json({message:'Request failed'}));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${server.address().port}/api/workspaces`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
test('leaders publish each church tool; members only read shared resources in their workspace',async()=>{
 for(const kind of ['sermon','announcement','event','department']){
  const item=await service.create(owner,org.id,field(kind));assert.equal(item.kind,kind);
  assert.equal((await service.list(member,org.id,kind)).length,1);
  await assert.rejects(service.create(member,org.id,field(kind)),{status:404});
  await assert.rejects(service.list(otherOwner,org.id,kind),{status:404});
  assert.deepEqual(await service.list(otherOwner,other.id,kind),[]);
  if(kind==='sermon')sermon=item;if(kind==='department')department=item;
 }
 draft=await service.create(owner,org.id,{...field('sermon','Leader draft'),published:false});
 assert.equal((await service.list(owner,org.id,'sermon')).length,2);assert.equal((await service.list(member,org.id,'sermon')).length,1);
 await assert.rejects(service.study(member,org.id,draft.id),{status:404});
});
test('strict payloads reject forged scope, unsafe URLs, missing event dates and type changes',async()=>{
 for(const data of [{...field('sermon'),organizationId:other.id},{...field('sermon'),createdBy:otherOwner.uid},{...field('sermon'),link:'javascript:alert(1)'},{...field('sermon'),link:'https://user:password@example.com'},{...field('sermon'),link:'bad-link'},{kind:'event',title:'No date'}])assert.throws(()=>service.create(owner,org.id,data),{status:400});
 await assert.rejects(service.update(owner,org.id,sermon.id,{version:1,data:field('department')}),{status:400});
});
test('resource editing uses versions; archive hides content and can be restored by leaders',async()=>{
 const updated=await service.update(owner,org.id,sermon.id,{version:sermon.version,data:{...field('sermon','Updated teaching'),speaker:'Test pastor',scripture:'John 15',link:'https://example.com/teaching'}});assert.equal(updated.version,2);sermon=updated;
 await assert.rejects(service.update(owner,org.id,sermon.id,{version:1,data:field('sermon')}),{status:409});
 await assert.rejects(service.archive(otherOwner,other.id,sermon.id,{version:2}),{status:409});
 await service.archive(owner,org.id,sermon.id,{version:2});
 assert.equal((await service.list(member,org.id,'sermon')).length,0);await assert.rejects(service.study(member,org.id,sermon.id),{status:404});
 const archived=await service.list(owner,org.id,'sermon',true);assert.equal(archived[0].version,3);
 await assert.rejects(service.list(member,org.id,'sermon',true),{status:404});
 await service.restore(owner,org.id,sermon.id,{version:3});sermon.version=4;
 assert.equal((await service.list(member,org.id,'sermon')).length,1);
});
test('sermon notes and bookmarks stay private, including from leaders',async()=>{
 await service.saveStudy(member,org.id,sermon.id,{notes:'Personal member reflection',bookmarked:true});
 assert.deepEqual(await service.study(member,org.id,sermon.id),{notes:'Personal member reflection',bookmarked:true});
 assert.deepEqual(await service.study(owner,org.id,sermon.id),{notes:'',bookmarked:false});
 await assert.rejects(service.study(otherOwner,other.id,sermon.id),{status:404});
 assert.throws(()=>service.saveStudy(owner,org.id,sermon.id,{notes:'Read another person',bookmarked:false,uid:member.uid}),{status:400});
 await assert.rejects(service.saveStudy(member,org.id,department.id,{notes:'Wrong type',bookmarked:false}),{status:404});
});
test('department membership is scoped, idempotent, and only leaders see team emails',async()=>{
 await service.joinDepartment(member,org.id,department.id,{joined:true});await service.joinDepartment(member,org.id,department.id,{joined:true});
 const item=(await service.list(member,org.id,'department'))[0];assert.equal(item.memberCount,1);assert.equal(item.joined,true);
 assert.equal((await service.departmentMembers(owner,org.id,department.id))[0].email,member.email);
 await assert.rejects(service.departmentMembers(member,org.id,department.id),{status:404});
 await assert.rejects(service.joinDepartment(otherOwner,other.id,department.id,{joined:true}),{status:404});
 await service.joinDepartment(member,org.id,department.id,{joined:false});assert.equal((await service.list(member,org.id,'department'))[0].memberCount,0);
});
test('only the owner appoints admins; owner remains protected and changes are audited',async()=>{
 await assert.rejects(service.changeMember(member,org.id,member.uid,{action:'admin'}),{status:404});
 await assert.rejects(service.changeMember(otherOwner,other.id,member.uid,{action:'admin'}),{status:404});
 await assert.rejects(service.changeMember(owner,org.id,owner.uid,{action:'removed'}),{status:409});
 await service.changeMember(owner,org.id,member.uid,{action:'admin'});
 const posted=await service.create(member,org.id,field('announcement','Admin announcement'));assert.ok(posted.id);
 await assert.rejects(service.changeMember(member,org.id,owner.uid,{action:'member'}),{status:404});
 await assert.rejects(service.audit(member,org.id),{status:404});
 await service.changeMember(owner,org.id,member.uid,{action:'member'});await assert.rejects(service.create(member,org.id,field('announcement')),{status:404});
 const audit=await service.audit(owner,org.id);assert.equal(audit.length,2);assert.equal(audit[0].target,member.email);
});
test('HTTP tool boundaries reject unauthenticated access and members cannot publish',async()=>{
 const url=`${base}/${org.id}/resources?kind=sermon`;
 assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer other'}})).status,404);
 const response=await fetch(url,{headers:{Authorization:'Bearer member'}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).length,1);
 assert.equal((await fetch(`${base}/${org.id}/resources`,{method:'POST',headers:{Authorization:'Bearer member','Content-Type':'application/json'},body:JSON.stringify(field('sermon'))})).status,404);
});
test('removal ends access and clears private study/team membership; unused invitations are revoked',async()=>{
 await service.joinDepartment(member,org.id,department.id,{joined:true});
 const invitation=await workspaces.invite(owner,org.id,{email:member.email});
 await service.changeMember(owner,org.id,member.uid,{action:'removed'});
 await assert.rejects(service.list(member,org.id,'sermon'),{status:404});
 await assert.rejects(workspaces.join(member,invitation.token),{status:404});
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ministrium.sermon_study WHERE uid=$1',[member.uid])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ministrium.department_members WHERE uid=$1',[member.uid])).rows[0].n,0);
 assert.equal((await service.audit(owner,org.id))[0].action,'removed');
});
