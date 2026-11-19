import { useEffect, useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
export function FeedbackReplies({ initialCode = '' }: {
    initialCode?: string;
}) {
    const { user } = useUser();
    const cache = useQueryClient();
    const instance = useId();
    const [revision, setRevision] = useState(0);
    const [code, setCode] = useState(initialCode), [selected, setSelected] = useState<number | null>(null), [opened, setOpened] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
    useEffect(() => { setSelected(null); setOpened(false); cache.removeQueries({ queryKey: ['feedback-private'] }); }, [user?.uid]);
    useEffect(() => { if (initialCode) {
        setCode(initialCode);
        setOpened(true);
    } }, [initialCode]);
    async function call(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
        if (!res.ok)
            throw new Error('Conversation unavailable. Check your sign-in or private recovery code.');
        return res.json();
    }
    const list = useQuery<any[]>({ queryKey: ['feedback-private', 'list', user?.uid], enabled: !!user, queryFn: () => call('/api/feedback-conversations'), refetchInterval: 300000 });
    const valid = /^(\d+)\.([A-Za-z0-9_-]{43})$/.exec(code.trim());
    const id = selected ?? (valid ? Number(valid[1]) : null);
    const credentials = selected ? {} : { token: valid?.[2] };
    const thread = useQuery<any>({ queryKey: ['feedback-private', 'thread', user?.uid, instance, id, opened, revision], gcTime: 0, enabled: !!id && (!!selected || opened), queryFn: () => call(`/api/feedback-conversations/${id}/read`, credentials) });
    useEffect(() => {
        if (thread.data && !thread.isError) void cache.invalidateQueries({queryKey:['feedback-private','list']});
    }, [thread.data]);
    async function action(kind: string) { try {
        setError('');
        await call(`/api/feedback-conversations/${id}/${kind}`, { ...credentials, message });
        setMessage('');
        if (kind === 'revoke') {
            setSelected(null);
            setOpened(false);
        }
        await cache.invalidateQueries({ queryKey: ['feedback-private'] });
    }
    catch (e) {
        setError((e as Error).message);
    } }
    return <section aria-label="Private feedback replies" className="space-y-3 rounded border p-4">
 <h2 className="font-serif text-xl font-bold">My feedback replies</h2>
 {user && <div>{list.isError && <p role="alert">Unable to load your feedback.</p>}{list.data?.map(t => <Button variant="outline" key={t.id} onClick={() => { setSelected(t.id); setOpened(true); void cache.invalidateQueries({queryKey:['feedback-private','thread']}); }}>{t.feedback_type} · {t.status}{t.unread ? ' · New reply' : ''}</Button>)}</div>}
 <label className="block">Private recovery code<Input value={code} autoComplete="off" onChange={e => { setRevision(n => n + 1); setCode(e.target.value); setOpened(false); setSelected(null); }}/></label>
 <Button variant="outline" disabled={!valid} onClick={() => {setOpened(true);void cache.invalidateQueries({queryKey:['feedback-private','thread']});}}>Open private replies</Button>
 <p className="text-sm">Guest access expires after one year or when revoked. Save your private code outside this browser. Losing it may prevent recovery. No guest push notification is promised.</p>
 {(thread.isError || error) && <p role="alert">{error || 'Conversation unavailable. Check your recovery code or sign-in.'}</p>}
 {(!!selected || opened) && thread.data && !thread.isFetching && !thread.isError && <div className="space-y-3"><p><strong>Your feedback:</strong> {thread.data.original.message}</p><p>Status: {thread.data.original.status}</p>{thread.data.messages.map((m: any) => <p key={m.id} className="whitespace-pre-wrap"><strong>{m.sender === 'ministry' ? 'Ministry' : 'You'}:</strong> {m.message}</p>)}
 {thread.data.original.status !== 'closed' && <><label>Follow-up message<Textarea maxLength={10000} value={message} onChange={e => setMessage(e.target.value)}/></label><Button disabled={!message.trim()} onClick={() => action('reply')}>Send follow-up</Button></>}
 <Button variant="outline" onClick={() => { if (window.confirm('Disable access and stop replies for this conversation?'))
            void action('revoke'); }}>Stop replies and revoke access</Button>
 </div>}
 </section>;
}
