import type { Express, Request, RequestHandler } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export const conversationDDL = `
CREATE TABLE IF NOT EXISTS bible_preferences (
 firebase_uid text PRIMARY KEY, translation text NOT NULL CHECK(translation IN ('KJV','WEB','ASV','DRB')),
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS feedback_conversations (
 feedback_id integer PRIMARY KEY REFERENCES feedback_messages(id), firebase_uid text,
 token_hash text, replies_enabled boolean NOT NULL DEFAULT false, email_consent boolean NOT NULL DEFAULT false,
 unread boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL DEFAULT (now()+interval '365 days'),
 revoked boolean NOT NULL DEFAULT false);
CREATE INDEX IF NOT EXISTS feedback_conversations_uid ON feedback_conversations(firebase_uid);
CREATE TABLE IF NOT EXISTS feedback_conversation_replies (
 id bigserial PRIMARY KEY, feedback_id integer NOT NULL REFERENCES feedback_conversations(feedback_id) ON DELETE CASCADE,
 sender text NOT NULL CHECK(sender IN ('subscriber','ministry')), message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());`;
export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex');
export function validGuestToken(token: unknown, hash: string | null) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || !hash || !/^[a-f0-9]{64}$/.test(hash))
        return false;
    return timingSafeEqual(Buffer.from(tokenDigest(token), 'hex'), Buffer.from(hash, 'hex'));
}
export const submissionSchema = z.object({ name: z.string().trim().max(120).optional(), email: z.union([z.string().email().max(254), z.literal('')]).optional(), feedbackType: z.enum(['app_design', 'content_quality', 'feature_request', 'bug_issue', 'other']), message: z.string().trim().min(10).max(10000), receiveReplies: z.boolean().default(false), emailConsent: z.boolean().default(false) }).strict().refine(d => !d.emailConsent || (d.receiveReplies && !!d.email), { message: 'Email replies require an email address and reply consent.' });
type Query = (sql: string, values?: any[]) => Promise<{
    rows: any[];
    rowCount?: number | null;
}>;
export function registerFeedbackConversations(app: Express, deps: {
    query: Query;
    transaction: <T>(fn: (query: Query) => Promise<T>) => Promise<T>;
    verifyToken: (token: string) => Promise<{
        uid: string;
    }>;
    requireAdmin: RequestHandler;
    notify: (data: any) => Promise<unknown>;
    emailReply: (to: string, message: string) => Promise<void>;
}) {
    const buckets = new Map<string, {
        count: number;
        until: number;
    }>();
    const limit: RequestHandler = (req, res, next) => {
        const now = Date.now(), key = req.ip ?? 'unknown';
        if (buckets.size > 10000)
            for (const [k, v] of buckets)
                if (v.until < now)
                    buckets.delete(k);
        const b = buckets.get(key);
        if (b && b.until > now) {
            if (++b.count > 60) {
                res.status(429).json({ message: 'Please wait before trying again.' });
                return;
            }
        }
        else {
            if (buckets.size >= 10000) {
                res.status(429).json({ message: 'Please try again later.' });
                return;
            }
            buckets.set(key, { count: 1, until: now + 3600000 });
        }
        next();
    };
    const route = (fn: (req: Request, res: any) => Promise<any>): RequestHandler => async (req, res) => {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        try {
            await fn(req, res);
        }
        catch (e) {
            if (e instanceof z.ZodError) {
                res.status(400).json({ message: e.errors[0].message });
                return;
            }
            res.status((e as any).status ?? 500).json({ message: (e as any).status ? 'Conversation unavailable.' : 'Unable to complete request. Please try again.' });
        }
    };
    const uid = async (req: Request, required = false) => {
        const h = req.headers.authorization;
        if (!h) {
            if (required)
                throw { status: 401 };
            return null;
        }
        if (!h.startsWith('Bearer '))
            throw { status: 401 };
        try {
            return (await deps.verifyToken(h.slice(7))).uid;
        }
        catch {
            throw { status: 401 };
        }
    };
    const idOf = (req: Request) => z.coerce.number().int().positive().parse(req.params.id);
    const access = async (req: Request) => {
        const id = idOf(req), user = await uid(req);
        const c = (await deps.query('SELECT * FROM feedback_conversations WHERE feedback_id=$1', [id])).rows[0];
        if (!c || !c.replies_enabled || c.revoked || new Date(c.expires_at).getTime() < Date.now())
            throw { status: 404 };
        if (c.firebase_uid ? c.firebase_uid !== user : !validGuestToken(req.body?.token, c.token_hash))
            throw { status: 404 };
        return c;
    };
    app.get('/api/user/bible-preference', route(async (req, res) => { const user = await uid(req, true); res.json((await deps.query('SELECT translation FROM bible_preferences WHERE firebase_uid=$1', [user])).rows[0] ?? { translation: null }); }));
    app.put('/api/user/bible-preference', route(async (req, res) => { const user = await uid(req, true); const t = z.enum(['KJV', 'WEB', 'ASV', 'DRB']).parse(req.body.translation); await deps.query('INSERT INTO bible_preferences(firebase_uid,translation) VALUES($1,$2) ON CONFLICT(firebase_uid) DO UPDATE SET translation=$2,updated_at=now()', [user, t]); res.json({ translation: t }); }));
    app.post('/api/feedback', limit, route(async (req, res) => {
        const d = submissionSchema.parse(req.body), user = await uid(req);
        const token = d.receiveReplies && !user ? randomBytes(32).toString('base64url') : null;
        const feedback = await deps.transaction(async (q) => {
            const row = (await q('INSERT INTO feedback_messages(name,email,feedback_type,message,status) VALUES($1,$2,$3,$4,\'new\') RETURNING id', [d.name || null, d.email || null, d.feedbackType, d.message])).rows[0];
            await q('INSERT INTO feedback_conversations(feedback_id,firebase_uid,token_hash,replies_enabled,email_consent) VALUES($1,$2,$3,$4,$5)', [row.id, d.receiveReplies ? user : null, token ? tokenDigest(token) : null, d.receiveReplies, d.emailConsent]);
            return row;
        });
        void deps.notify(d).catch(() => { });
        res.status(201).json({ id: feedback.id, receiveReplies: d.receiveReplies, token, expiresInDays: 365 });
    }));
    app.get('/api/feedback-conversations', limit, route(async (req, res) => { const user = await uid(req, true); res.json((await deps.query(`SELECT f.id,f.feedback_type,f.status,f.created_at,c.unread FROM feedback_messages f JOIN feedback_conversations c ON c.feedback_id=f.id WHERE c.firebase_uid=$1 AND c.replies_enabled=true AND c.revoked=false AND c.expires_at>now() ORDER BY f.created_at DESC LIMIT 100`, [user])).rows); }));
    app.post('/api/feedback-conversations/:id/read', limit, route(async (req, res) => { await access(req); const id = idOf(req); const original = (await deps.query('SELECT id,feedback_type,message,status,created_at FROM feedback_messages WHERE id=$1', [id])).rows[0]; const messages = (await deps.query('SELECT id,sender,message,created_at FROM feedback_conversation_replies WHERE feedback_id=$1 ORDER BY id', [id])).rows; await deps.query('UPDATE feedback_conversations SET unread=false WHERE feedback_id=$1', [id]); res.json({ original, messages }); }));
    app.post('/api/feedback-conversations/:id/reply', limit, route(async (req, res) => { await access(req); const message = z.string().trim().min(1).max(10000).parse(req.body.message), id = idOf(req); await deps.transaction(async (q) => { const f = (await q('SELECT status FROM feedback_messages WHERE id=$1 FOR UPDATE', [id])).rows[0]; if (f.status === 'closed')
        throw { status: 409 }; await q("INSERT INTO feedback_conversation_replies(feedback_id,sender,message) VALUES($1,'subscriber',$2)", [id, message]); await q("UPDATE feedback_messages SET status='in_progress' WHERE id=$1", [id]); }); res.status(201).json({ ok: true }); }));
    app.post('/api/feedback-conversations/:id/revoke', limit, route(async (req, res) => { await access(req); await deps.query('UPDATE feedback_conversations SET revoked=true,token_hash=NULL,replies_enabled=false WHERE feedback_id=$1', [idOf(req)]); res.json({ ok: true }); }));
    app.get('/api/admin/feedback-conversations', deps.requireAdmin, route(async (req, res) => { res.json((await deps.query(`SELECT f.*,COALESCE(c.replies_enabled,false) AS replies_enabled,COALESCE(c.revoked,false) AS revoked,c.firebase_uid IS NOT NULL AS signed_in,c.expires_at,c.email_consent FROM feedback_messages f LEFT JOIN feedback_conversations c ON c.feedback_id=f.id ORDER BY f.created_at DESC LIMIT 200`)).rows); }));
    app.get('/api/admin/feedback-conversations/:id', deps.requireAdmin, route(async (req, res) => { const id = idOf(req); res.json({ messages: (await deps.query('SELECT id,sender,message,created_at FROM feedback_conversation_replies WHERE feedback_id=$1 ORDER BY id', [id])).rows }); }));
    app.post('/api/admin/feedback-conversations/:id/reply', deps.requireAdmin, route(async (req, res) => {
        const id = idOf(req), message = z.string().trim().min(1).max(10000).parse(req.body.message);
        const c = await deps.transaction(async (q) => { const c = (await q('SELECT c.*,f.email,f.status FROM feedback_conversations c JOIN feedback_messages f ON f.id=c.feedback_id WHERE feedback_id=$1 FOR UPDATE', [id])).rows[0]; if (!c || !c.replies_enabled || c.revoked || c.status === 'closed' || new Date(c.expires_at).getTime() < Date.now())
            throw { status: 409 }; await q("INSERT INTO feedback_conversation_replies(feedback_id,sender,message) VALUES($1,'ministry',$2)", [id, message]); await q('UPDATE feedback_conversations SET unread=true WHERE feedback_id=$1', [id]); await q("UPDATE feedback_messages SET status='answered' WHERE id=$1", [id]); return c; });
        let emailStatus = 'not_requested';
        if (c.email_consent && c.email) {
            try {
                await deps.emailReply(c.email, message);
                emailStatus = 'sent';
            }
            catch {
                emailStatus = 'failed';
            }
        }
        res.status(201).json({ ok: true, emailStatus });
    }));
    app.patch('/api/admin/feedback-conversations/:id/status', deps.requireAdmin, route(async (req, res) => { const status = z.enum(['new', 'in_progress', 'answered', 'closed']).parse(req.body.status); await deps.query('UPDATE feedback_messages SET status=$2 WHERE id=$1', [idOf(req), status]); res.json({ ok: true }); }));
    app.post('/api/admin/feedback-conversations/:id/delete', deps.requireAdmin, route(async (req, res) => { const id = idOf(req); await deps.transaction(async (q) => { await q('DELETE FROM feedback_conversation_replies WHERE feedback_id=$1', [id]); await q('DELETE FROM feedback_conversations WHERE feedback_id=$1', [id]); await q('DELETE FROM feedback_messages WHERE id=$1', [id]); }); res.json({ ok: true }); }));
}
