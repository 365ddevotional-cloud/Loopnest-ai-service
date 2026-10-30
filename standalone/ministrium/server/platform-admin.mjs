import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {WorkspaceError} from './workspaces.mjs';
const uuid=z.string().uuid(),text=(min,max)=>z.string().trim().min(min).max(max);
const reportInput=z.object({organizationId:uuid,targetType:z.enum(['message','prayer','resource','lesson','product']),targetId:uuid,reason:text(10,1000),shareReportedItem:z.literal(true)}).strict();
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)throw new WorkspaceError(400,'Check the report or administration fields.');return r.data;}
export function platformOwnerConfig(env){const email=env.MINISTRIUM_PLATFORM_OWNER_EMAIL?.trim().toLowerCase()??'';if(email&&!z.string().email().safeParse(email).success)throw new Error('Set a valid platform owner email.');return {ownerEmail:email};}
export function createPlatformAdmin(db,config={ownerEmail:''},commerceStatus=()=>({mode:'disabled',livePaymentsEnabled:false})){
 function verified(user){if(!user?.uid||!user.email||user.email_verified!==true)throw new WorkspaceError(401,'Sign in with your verified account.');}
 async function audit(tx,user,action,org,report,reason){await tx.query('INSERT INTO ministrium.platform_audit(id,actor_uid,action,organization_id,report_id,reason) VALUES ($1,$2,$3,$4,$5,$6)',[randomUUID(),user.uid,action,org??null,report??null,reason]);}
 async function access(user){verified(user);return db.transaction(async tx=>{
  let owner=(await tx.query('SELECT uid FROM ministrium.platform_owner WHERE singleton=1')).rows[0];
  if(!owner&&config.ownerEmail&&user.email.toLowerCase()===config.ownerEmail){
   await tx.query('INSERT INTO ministrium.identities(uid,email) VALUES ($1,$2) ON CONFLICT (uid) DO UPDATE SET email=$2',[user.uid,user.email.toLowerCase()]);
   const inserted=await tx.query('INSERT INTO ministrium.platform_owner(singleton,uid) VALUES (1,$1) ON CONFLICT DO NOTHING RETURNING uid',[user.uid]);
   owner=(await tx.query('SELECT uid FROM ministrium.platform_owner WHERE singleton=1')).rows[0];
   if(inserted.rows.length)await audit(tx,user,'owner_bound',null,null,'Verified configured owner bound permanently to this Firebase UID.');
  }
  return owner?.uid===user.uid;
 });}
 async function administrator(user,fn){if(!await access(user))throw new WorkspaceError(403,'Platform administration is restricted to the platform owner.');return fn();}
 const page=(after)=>after?parse(uuid,after):null;
 const reportCols='r.id,r.organization_id AS "organizationId",o.name AS "organizationName",r.target_type AS "targetType",r.target_id AS "targetId",r.excerpt,r.reason,r.status,r.resolution,r.version,r.created_at AS "createdAt",r.resolved_at AS "resolvedAt"';
 return {
  access:async user=>({isAdmin:await access(user)}),
  overview:user=>administrator(user,async()=>{const c=(await db.query("SELECT (SELECT count(*)::int FROM ministrium.organizations) AS workspaces,(SELECT count(*)::int FROM ministrium.organizations WHERE suspended_at IS NOT NULL) AS suspended,(SELECT count(*)::int FROM ministrium.identities) AS accounts,(SELECT count(*)::int FROM ministrium.memberships) AS memberships,(SELECT count(*)::int FROM ministrium.moderation_reports WHERE status='open') AS \"openReports\",(SELECT count(*)::int FROM ministrium.orders) AS orders,(SELECT count(*)::int FROM ministrium.migrations) AS migrations")).rows[0];return {counts:c,payments:commerceStatus(),policy:{privateReflectionsVisible:false,basicGroupsFree:true}};}),
  workspaces:(user,after)=>administrator(user,async()=>{const cursor=page(after),rows=(await db.query('SELECT id,name,slug,kind,country,(suspended_at IS NOT NULL) AS suspended,moderation_version AS version,created_at AS "createdAt" FROM ministrium.organizations WHERE ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT 51',[cursor])).rows;return {items:rows.slice(0,50),next:rows.length>50?rows[49].id:null};}),
  suspend:(user,orgId,input)=>{const org=parse(uuid,orgId),d=parse(z.object({version:z.number().int().positive(),suspended:z.boolean(),reason:text(10,1000),confirm:z.literal(true)}).strict(),input);return administrator(user,()=>db.transaction(async tx=>{const r=await tx.query('UPDATE ministrium.organizations SET suspended_at=CASE WHEN $1 THEN now() ELSE NULL END,moderation_version=moderation_version+1 WHERE id=$2 AND moderation_version=$3 RETURNING id,moderation_version AS version,(suspended_at IS NOT NULL) AS suspended',[d.suspended,org,d.version]);if(!r.rows.length)throw new WorkspaceError(409,'Workspace status changed. Refresh before applying.');await audit(tx,user,d.suspended?'workspace_suspended':'workspace_restored',org,null,d.reason);return r.rows[0];}));},
  reports:(user,closed=false,after)=>administrator(user,async()=>{const cursor=page(after);const rows=(await db.query(`SELECT ${reportCols} FROM ministrium.moderation_reports r JOIN ministrium.organizations o ON o.id=r.organization_id WHERE (r.status<>'open')=$1 AND ($2::uuid IS NULL OR r.id>$2) ORDER BY r.id LIMIT 51`,[closed,cursor])).rows;return {items:rows.slice(0,50),next:rows.length>50?rows[49].id:null};}),
  resolve:(user,id,input)=>{const report=parse(uuid,id),d=parse(z.object({version:z.number().int().positive(),status:z.enum(['resolved','dismissed']),resolution:text(10,1000)}).strict(),input);return administrator(user,()=>db.transaction(async tx=>{const row=(await tx.query('UPDATE ministrium.moderation_reports SET status=$1,resolution=$2,version=version+1,resolved_at=now() WHERE id=$3 AND version=$4 AND status=$5 RETURNING organization_id',[d.status,d.resolution,report,d.version,'open'])).rows[0];if(!row)throw new WorkspaceError(409,'Report changed or already closed. Refresh before resolving.');await audit(tx,user,`report_${d.status}`,row.organization_id,report,d.resolution);return {status:d.status};}));},
  audit:(user,after)=>administrator(user,async()=>{const cursor=page(after),rows=(await db.query('SELECT id,action,organization_id AS "organizationId",report_id AS "reportId",reason,created_at AS "createdAt" FROM ministrium.platform_audit WHERE ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT 51',[cursor])).rows;return {items:rows.slice(0,50),next:rows.length>50?rows[49].id:null};}),
  submitReport:(user,input)=>{verified(user);const d=parse(reportInput,input);return db.transaction(async tx=>{
   const org=(await tx.query('SELECT id,suspended_at FROM ministrium.organizations WHERE id=$1 FOR UPDATE',[d.organizationId])).rows[0];if(!org||org.suspended_at)throw new WorkspaceError(404,'Reported item unavailable.');
   const role=(await tx.query('SELECT role FROM ministrium.memberships WHERE organization_id=$1 AND uid=$2',[org.id,user.uid])).rows[0]?.role;
   if(d.targetType!=='product'&&!role)throw new WorkspaceError(404,'Reported item unavailable.');
   // Fixed mapping: no client table/column names can enter the query.
   const queries={message:'SELECT body AS excerpt FROM ministrium.messages WHERE organization_id=$1 AND id=$2',prayer:"SELECT title||E'\\n'||body AS excerpt FROM ministrium.prayer_requests WHERE organization_id=$1 AND id=$2",resource:"SELECT title||E'\\n'||body AS excerpt FROM ministrium.resources WHERE organization_id=$1 AND id=$2 AND archived=false AND (published OR $3)",lesson:"SELECT title||E'\\n'||body AS excerpt FROM ministrium.group_lessons WHERE organization_id=$1 AND id=$2 AND archived=false AND (published OR $3)",product:"SELECT title||E'\\n'||description AS excerpt FROM ministrium.products WHERE organization_id=$1 AND id=$2 AND archived=false AND published=true"};
   const row=(await tx.query(queries[d.targetType],['resource','lesson'].includes(d.targetType)?[org.id,d.targetId,role==='owner'||role==='admin']:[org.id,d.targetId])).rows[0];if(!row)throw new WorkspaceError(404,'Reported item unavailable.');
   await tx.query('INSERT INTO ministrium.identities(uid,email) VALUES ($1,$2) ON CONFLICT (uid) DO UPDATE SET email=$2',[user.uid,user.email.toLowerCase()]);await tx.query('SELECT uid FROM ministrium.identities WHERE uid=$1 FOR UPDATE',[user.uid]);
   const duplicate=(await tx.query("SELECT id FROM ministrium.moderation_reports WHERE reporter_uid=$1 AND target_type=$2 AND target_id=$3 AND status='open'",[user.uid,d.targetType,d.targetId])).rows[0];if(duplicate)return {id:duplicate.id,status:'open'};
   if((await tx.query("SELECT count(*)::int AS n FROM ministrium.moderation_reports WHERE reporter_uid=$1 AND (status='open' OR created_at>now()-interval '1 day')",[user.uid])).rows[0].n>=10)throw new WorkspaceError(429,'Please wait before submitting more reports.');
   const id=randomUUID();await tx.query('INSERT INTO ministrium.moderation_reports(id,organization_id,reporter_uid,target_type,target_id,excerpt,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)',[id,org.id,user.uid,d.targetType,d.targetId,String(row.excerpt).slice(0,4500),d.reason]);return {id,status:'open'};
  });},
  myReports:async user=>{verified(user);return (await db.query('SELECT id,target_type AS "targetType",target_id AS "targetId",status,created_at AS "createdAt",resolved_at AS "resolvedAt" FROM ministrium.moderation_reports WHERE reporter_uid=$1 ORDER BY created_at DESC,id LIMIT 50',[user.uid])).rows;},
 };
}
