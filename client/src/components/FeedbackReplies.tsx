import { useI18n } from "@/hooks/useI18n";
import { useEffect, useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
export function FeedbackReplies({ initialCode = '' }: {
    initialCode?: string;
}) {
    const {t}=useI18n();
    const statuses:Record<string,string>={new:t("ui_state_new"),in_progress:t("ui_state_in_progress"),answered:t("ui_state_answered"),closed:t("ui_state_closed")};
    const getNewReplyLabel=t("ui_newReply");
    const categories:Record<string,string>={app_design:t("ui_appDesign"),content_quality:t("ui_contentQuality"),feature_request:t("ui_featureRequest"),bug_issue:t("ui_bugIssue"),other:t("ui_other")};
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
            throw new Error(t('ui_conversationUnavailable'));
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
    return <section aria-label={t("ui_myReplies")} className="space-y-3 rounded border p-4">
 <h2 className="font-serif text-xl font-bold">{t("ui_myReplies")}</h2>
 {user && <div>{list.isError && <p role="alert">{t("ui_loadFeedbackError")}</p>}{list.data?.map(t => <Button variant="outline" key={t.id} onClick={() => { setSelected(t.id); setOpened(true); void cache.invalidateQueries({queryKey:['feedback-private','thread']}); }}>{categories[t.feedback_type]||t.feedback_type} · {statuses[t.status]||t.status}{t.unread ? " · "+getNewReplyLabel : ""}</Button>)}</div>}
 <label className="block">{t("ui_privateCode")}<Input value={code} autoComplete="off" onChange={e => { setRevision(n => n + 1); setCode(e.target.value); setOpened(false); setSelected(null); }}/></label>
 <Button variant="outline" disabled={!valid} onClick={() => {setOpened(true);void cache.invalidateQueries({queryKey:['feedback-private','thread']});}}>{t("ui_openReplies")}</Button>
 <p className="text-sm">{t("ui_guestExpiry")}</p>
 {(thread.isError || error) && <p role="alert">{error || t('ui_conversationUnavailable')}</p>}
 {(!!selected || opened) && thread.data && !thread.isFetching && !thread.isError && <div className="space-y-3"><p><strong>{t("ui_yourFeedback")}</strong> {thread.data.original.message}</p><p>{t("ui_status")}: {statuses[thread.data.original.status]||thread.data.original.status}</p>{thread.data.messages.map((m: any) => <p key={m.id} className="whitespace-pre-wrap"><strong>{m.sender === 'ministry' ? t('ui_ministry') : t('ui_you')}:</strong> {m.message}</p>)}
 {thread.data.original.status !== 'closed' && <><label>{t("ui_followUp")}<Textarea maxLength={10000} value={message} onChange={e => setMessage(e.target.value)}/></label><Button disabled={!message.trim()} onClick={() => action('reply')}>{t("ui_sendFollowUp")}</Button></>}
 <Button variant="outline" onClick={() => { if (window.confirm(t('ui_confirmRevoke')))
            void action('revoke'); }}>{t("ui_stopReplies")}</Button>
 </div>}
 </section>;
}
