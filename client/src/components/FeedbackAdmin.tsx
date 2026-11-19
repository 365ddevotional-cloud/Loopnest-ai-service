import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
export function FeedbackAdmin() {
    const cache = useQueryClient();
    const [selected, setSelected] = useState<any>(null), [reply, setReply] = useState(''), [status, setStatus] = useState('all'), [category, setCategory] = useState('all'), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
    const list = useQuery<any[]>({ queryKey: ['feedback-admin'], queryFn: async () => { const r = await apiRequest('GET', '/api/admin/feedback-conversations'); return r.json(); } });
    const detail = useQuery<any>({ queryKey: ['feedback-admin', selected?.id], enabled: !!selected, queryFn: async () => { const r = await apiRequest('GET', `/api/admin/feedback-conversations/${selected.id}`); return r.json(); } });
    async function send(path: string, body: any, method = 'POST') { setBusy(true); try {
        const r = await apiRequest(method, `/api/admin/feedback-conversations/${selected.id}/${path}`, body);
        const data = await r.json();
        setNotice(data.emailStatus === 'failed' ? 'Saved in app. Email delivery failed; do not resend the in-app message.' : 'Saved.');
        setReply('');
        await cache.invalidateQueries({ queryKey: ['feedback-admin'] });
        if (path === 'delete')
            setSelected(null);
    }
    catch {
        setNotice('Could not complete the action. Please refresh and check before retrying.');
    }
    finally {
        setBusy(false);
    } }
    return <section aria-label="Feedback administration" className="space-y-3 mb-8"><h2 className="text-xl font-bold">Feedback and private replies</h2><p>Earlier anonymous feedback without a reply channel cannot be delivered retroactively.</p>
 <label>Status <select value={status} onChange={e => setStatus(e.target.value)}>{['all', 'new', 'in_progress', 'answered', 'closed'].map(s => <option key={s}>{s}</option>)}</select></label>
 <label>Category <select value={category} onChange={e => setCategory(e.target.value)}>{['all', 'app_design', 'content_quality', 'feature_request', 'bug_issue', 'other'].map(s => <option key={s}>{s}</option>)}</select></label>
 {list.isError && <p role="alert">Feedback could not be loaded.</p>}
 <div className="max-h-64 overflow-auto">{list.data?.filter(t => (status === 'all' || t.status === status) && (category === 'all' || t.feedback_type === category)).map(t => <button className="block w-full border-b p-2 text-left" key={t.id} onClick={() => { setSelected(t); setReply(''); setNotice(''); }}>{t.feedback_type} · {t.status} · {t.signed_in ? 'Account-linked' : 'Anonymous / guest'} · {t.replies_enabled && !t.revoked ? 'Replies enabled' : 'No reply channel'}</button>)}</div>
 {selected && <div className="space-y-3"><p className="whitespace-pre-wrap">{selected.message}</p>{detail.data?.messages.map((m: any) => <p className="whitespace-pre-wrap" key={m.id}><strong>{m.sender}:</strong> {m.message}</p>)}
 <label>Conversation status <select value={list.data?.find(t => t.id === selected.id)?.status ?? selected.status} onChange={e => void send('status', { status: e.target.value }, 'PATCH')}>{['new', 'in_progress', 'answered', 'closed'].map(s => <option key={s}>{s}</option>)}</select></label>
 {selected.replies_enabled && !selected.revoked && <><label>Ministry reply<Textarea maxLength={10000} value={reply} onChange={e => setReply(e.target.value)}/></label><Button disabled={busy || !reply.trim()} onClick={() => send('reply', { message: reply })}>Send private reply{selected.email_consent ? ' and consented email' : ''}</Button></>}
 <Button variant="outline" disabled={busy} onClick={() => { if (window.confirm('Permanently delete this feedback and its replies? This cannot be undone.'))
            void send('delete', {}); }}>Delete conversation permanently</Button>
 </div>}{notice && <p role="status">{notice}</p>}</section>;
}
