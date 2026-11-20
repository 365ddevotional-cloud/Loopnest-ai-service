import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {DevotionalRecordingStudio} from '@/components/DevotionalRecordingStudio';
import type { ContentTranslationReview as Review, TranslationText, TranslationDraftLanguage } from '@shared/content-translation-review';

const languages: Record<TranslationDraftLanguage, string> = {
  es: 'Spanish', fr: 'French', yo: 'Yoruba', pcm: 'Nigerian Pidgin', ha: 'Hausa', ig: 'Igbo',
};
function TextColumn({ text, lang, heading }: { text: TranslationText; lang: string; heading: string }) {
  return <article lang={lang} className="min-w-0 space-y-4 rounded-lg border p-4 break-words">
    <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
    <h4 className="text-xl font-bold">{text.title}</h4>
    <div className="whitespace-pre-wrap leading-relaxed">{text.content}</div>
    <h4 className="font-semibold">Prayer points</h4>
    <ol className="list-decimal space-y-2 pl-6">{text.prayerPoints.map((p, i) => <li key={i}>{p}</li>)}</ol>
    <h4 className="font-semibold">Faith declarations</h4>
    <ol className="list-decimal space-y-2 pl-6">{text.faithDeclarations.map((p, i) => <li key={i}>{p}</li>)}</ol>
    {text.christianQuotes && <><h4 className="font-semibold">Quotation</h4><p className="whitespace-pre-wrap">{text.christianQuotes}</p></>}
    {text.propheticDeclaration && <><h4 className="font-semibold">Prophetic declaration</h4><p>{text.propheticDeclaration}</p></>}
  </article>;
}
export function ContentTranslationReview() {
  const [language, setLanguage] = useState<TranslationDraftLanguage>('es');
  const review = useQuery<Review[]>({
    queryKey: ['/api/admin/content-translations'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/content-translations')).json(),
    retry: false,
  });
  return <section aria-label="Content translation review" className="space-y-5 rounded-lg border bg-card p-4 sm:p-6">
    <h2 className="text-2xl font-bold">Content translations</h2>
    <p>Compare saved translations with the English source and check each batch’s publication status. Paid translation generation is off.</p>
    <p className="text-sm text-muted-foreground">Check accuracy, natural wording, theology, Scripture references and paragraph order with a fluent speaker. Review does not translate the selected Bible edition, publish books or generate narration.</p>
    <label className="block font-semibold">Draft language
      <select className="mt-1 block w-full rounded border bg-background p-2 sm:max-w-xs" value={language} onChange={e => setLanguage(e.target.value as TranslationDraftLanguage)}>
        {Object.entries(languages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {review.isLoading && <p role="status">Loading private drafts…</p>}
    {review.isError && <p role="alert">Drafts could not be loaded. Check your admin sign-in and refresh. No drafts were published.</p>}
    {review.data?.length === 0 && <p>No draft batches are available.</p>}
    {review.data?.map(batch => {
      const draft = batch.drafts.find(d => d.language === language);
      if (!draft) return null;
      return <div key={batch.batchId} className="space-y-4">
        <h3 className="text-lg font-semibold">{batch.source.date} · {batch.source.title}</h3>
        <p role="status">{batch.publicAvailability === 'published' ? 'Published · Saved translation' : batch.publicAvailability === 'source-changed' ? 'Publication held · Source changed' : 'Not published · Language review pending · Ministry review pending'}</p>
        {batch.publicationApproval && <p>Approved for publication by {batch.publicationApproval.approvedBy} on {batch.publicationApproval.approvedOn}. Independent language review is not recorded.</p>}
        {(!batch.sourceAvailable || !batch.sourceMatches) && <p role="alert" className="rounded border border-red-400 p-3">{batch.sourceAvailable ? 'The English source has changed. These drafts must be refreshed and reviewed again.' : 'The English source is missing or deleted. This batch cannot be released.'}</p>}
        {batch.sourceMatches && <p className="text-sm">The saved English source matches the current devotional.</p>}
        <details><summary className="cursor-pointer">Source verification</summary><p className="break-all text-xs">SHA-256: {batch.sourceHash}</p></details>
        <div className="rounded border p-3"><h4 className="font-semibold">Original Scripture — unchanged</h4><p>{batch.source.scriptureReference}</p><blockquote lang="en" className="mt-2">{batch.source.scriptureText}</blockquote></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextColumn text={batch.source} lang="en" heading="English source" />
          {draft && <TextColumn text={draft} lang={language} heading={`${languages[language]} — ${batch.publicAvailability === 'published' ? 'approved for publication' : 'prepared translation'}`} />}
        </div>
        {batch.sourceMatches && batch.publicAvailability==='published' && <DevotionalRecordingStudio key={`${batch.batchId}:${language}`} id={batch.source.id} language={language} />}
      </div>;
    })}
    <p className="rounded border p-3 text-sm">Translation text is read-only. Publication requires a recorded approval covering the exact English source and translated text. Recordings have their own audition and publication controls. A text correction requires a new recording review.</p>
  </section>;
}

