import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {z} from 'zod';

export class WorkspaceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const text = (min, max) => z.string().trim().min(min).max(max);
const reserved = new Set(['admin','api','start','workspace','workspaces','signin','preview','church','support','ministrium']);
const organizationInput = z.object({
  name: text(2,100),
  slug: text(3,48).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).refine(s => !reserved.has(s)),
  kind: z.enum(['church','ministry','both','group']),
  groupType:z.enum(['family','prayer','discipleship']).nullable().default(null),
  country: z.string().regex(/^[A-Z]{2}$/),
  city: text(0,100).default(''),
}).strict().refine(d=>d.kind==='group'?d.groupType!==null:d.groupType===null);
const invitationInput = z.object({email:z.string().trim().toLowerCase().email().max(254)}).strict();
const uuid = z.string().uuid();
const tokenInput = z.string().regex(/^[a-f0-9]{64}$/);
const hash = token => createHash('sha256').update(token).digest('hex');
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new WorkspaceError(400,'Check the submitted fields and try again.');
  return result.data;
}
function identity(principal) {
  // Only the verified token adapter supplies principals; never read them from a request body.
  if (!principal?.uid || principal.uid.length > 128 || !z.string().email().safeParse(principal.email).success) {
    throw new WorkspaceError(401,'Sign in with a verified email address.');
  }
  return {...principal,email:principal.email.toLowerCase()};
}
async function saveIdentity(tx, user) {
  await tx.query('INSERT INTO ministrium.identities(uid,email) VALUES ($1,$2) ON CONFLICT(uid) DO UPDATE SET email=EXCLUDED.email',[user.uid,user.email]);
}
async function membership(tx, id, user, manage = false) {
  const {rows} = await tx.query('SELECT role FROM ministrium.memberships WHERE organization_id=$1 AND uid=$2',[id,user.uid]);
  if (!rows.length || (manage && !['owner','admin'].includes(rows[0].role))) throw new WorkspaceError(404,'Workspace not found or unavailable to your account.');
  return rows[0].role;
}

export function createWorkspaceService(db) {
  return {
    async list(principal) {
      const user=identity(principal);
      return (await db.query('SELECT o.id,o.name,o.slug,o.kind,o.group_type AS "groupType",o.country,o.city,m.role FROM ministrium.organizations o JOIN ministrium.memberships m ON m.organization_id=o.id WHERE m.uid=$1 ORDER BY o.created_at DESC',[user.uid])).rows;
    },
    async create(principal, input) {
      const user=identity(principal), data=parse(organizationInput,input);
      try {
        return await db.transaction(async tx => {
          await saveIdentity(tx,user);
          // Serialize creations for this identity to enforce the no-cost pilot quota.
          await tx.query('SELECT uid FROM ministrium.identities WHERE uid=$1 FOR UPDATE',[user.uid]);
          const count=await tx.query('SELECT count(*)::int AS total FROM ministrium.organizations WHERE created_by=$1',[user.uid]);
          if(count.rows[0].total>=5)throw new WorkspaceError(409,'The pilot supports up to five organizations per account.');
          const {rows}=await tx.query('INSERT INTO ministrium.organizations(id,name,slug,kind,group_type,country,city,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,slug,kind,group_type AS "groupType",country,city',[randomUUID(),data.name,data.slug,data.kind,data.groupType,data.country,data.city,user.uid]);
          await tx.query("INSERT INTO ministrium.memberships(organization_id,uid,role) VALUES ($1,$2,'owner')",[rows[0].id,user.uid]);
          return {...rows[0],role:'owner'};
        });
      } catch(error) {
        if(error.code==='23505')throw new WorkspaceError(409,'That ministry address is already in use. Choose another.');
        throw error;
      }
    },
    async detail(principal, organizationId) {
      const user=identity(principal), id=parse(uuid,organizationId);
      return db.transaction(async tx=>{
        const role=await membership(tx,id,user);
        const {rows}=await tx.query('SELECT id,name,slug,kind,group_type AS "groupType",country,city FROM ministrium.organizations WHERE id=$1',[id]);
        return {...rows[0],role};
      });
    },
    async members(principal, organizationId) {
      const user=identity(principal), id=parse(uuid,organizationId);
      return db.transaction(async tx=>{
        await membership(tx,id,user,true);
        return (await tx.query('SELECT i.email,m.role,m.created_at FROM ministrium.memberships m JOIN ministrium.identities i ON i.uid=m.uid WHERE m.organization_id=$1 ORDER BY m.created_at LIMIT 200',[id])).rows;
      });
    },
    async invite(principal, organizationId, input) {
      const user=identity(principal), id=parse(uuid,organizationId), data=parse(invitationInput,input);
      return db.transaction(async tx=>{
        await membership(tx,id,user,true);
        const token=randomBytes(32).toString('hex');
        const {rows}=await tx.query("INSERT INTO ministrium.invitations(id,organization_id,email,token_hash,created_by,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id,email,expires_at",[randomUUID(),id,data.email,hash(token),user.uid]);
        // Return the bearer secret once. No raw token is persisted or logged.
        return {...rows[0],token};
      });
    },
    async invitations(principal, organizationId) {
      const user=identity(principal), id=parse(uuid,organizationId);
      return db.transaction(async tx=>{
        await membership(tx,id,user,true);
        return (await tx.query('SELECT id,email,expires_at,accepted_at,revoked_at FROM ministrium.invitations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',[id])).rows;
      });
    },
    async revoke(principal, organizationId, invitationId) {
      const user=identity(principal), id=parse(uuid,organizationId), inviteId=parse(uuid,invitationId);
      return db.transaction(async tx=>{
        await membership(tx,id,user,true);
        const {rows}=await tx.query('UPDATE ministrium.invitations SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id',[inviteId,id]);
        if(!rows.length)throw new WorkspaceError(404,'Invitation not found or already used.');
        return {revoked:true};
      });
    },
    async join(principal, tokenValue) {
      const user=identity(principal), token=parse(tokenInput,tokenValue);
      return db.transaction(async tx=>{
        await saveIdentity(tx,user);
        // Atomic consumption prevents replay and simultaneous double use.
        const {rows}=await tx.query('UPDATE ministrium.invitations SET accepted_by=$1,accepted_at=now() WHERE token_hash=$2 AND email=$3 AND expires_at>now() AND accepted_at IS NULL AND revoked_at IS NULL RETURNING organization_id',[user.uid,hash(token),user.email]);
        if(!rows.length)throw new WorkspaceError(404,'Invitation unavailable. Check the invited email, expiry, or ask for a new invitation.');
        await tx.query("INSERT INTO ministrium.memberships(organization_id,uid,role) VALUES ($1,$2,'member') ON CONFLICT (organization_id,uid) DO NOTHING",[rows[0].organization_id,user.uid]);
        return {organizationId:rows[0].organization_id};
      });
    },
  };
}
