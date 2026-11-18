import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import type { ReaderParagraph } from '@shared/shop-audiobook';

type Edition = {id:string;product_id:string;title:string;reviewed:boolean;audio_reviewed:boolean;asset_sha256:string};
type Status = {sampleOnly?:boolean;configured:boolean;voice:string;characterBudget:number;reserved:number;editions:Edition[]};
export default function ShopAudiobookStudio() {
  const client=useQueryClient();
  const status=useQuery<Status>({queryKey:['/api/admin/ministry-shop/audiobooks']});
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [selected,setSelected]=useState<Edition>();
  const [paragraphs,setParagraphs]=useState<ReaderParagraph[]>([]);
  const [textReviewed,setTextReviewed]=useState(false);
  const [voiceReviewed,setVoiceReviewed]=useState(false);
  const [sample,setSample]=useState('');
  const [sampleId,setSampleId]=useState('');
  const refresh=()=>client.invalidateQueries({queryKey:['/api/admin/ministry-shop/audiobooks']});
  async function upload(file?:File) {
    if(!file)return; setBusy(true);setMessage('');
    try {
      if(file.size>1800000)throw new Error('The reader manuscript must be smaller than 1.8 MB.');
      const data=JSON.parse(await file.text());
      if(typeof data.productId!=='string')throw new Error('The manuscript needs a productId.');
      const response=await apiRequest('PUT',`/api/admin/ministry-shop/audiobooks/${encodeURIComponent(data.productId)}`,{assetSha256:data.assetSha256,paragraphs:data.paragraphs,reviewed:false});
      const result=await response.json();
      setMessage(`Private reader draft imported: ${result.paragraphs} passages. Review it below before release.`);await refresh();
    } catch(error){setMessage(error instanceof Error?error.message:'Import failed.');}finally{setBusy(false);}
  }
  async function choose(edition:Edition) {
    setBusy(true);setSample('');setSelected(undefined);setMessage('');
    try {
      const response=await apiRequest('GET',`/api/admin/ministry-shop/audiobooks/${edition.id}`);
      const data=await response.json();setSelected(edition);setParagraphs(data.paragraphs);
      setSampleId(data.paragraphs.find((p:ReaderParagraph)=>!p.heading)?.id??data.paragraphs[0]?.id??'');
      setTextReviewed(edition.reviewed);setVoiceReviewed(edition.audio_reviewed);
    } catch(error){setMessage(error instanceof Error?error.message:'Reader unavailable.');}finally{setBusy(false);}
  }
  async function preview() {
    if(!selected)return;setBusy(true);setMessage('');
    try {
      const response=await apiRequest('POST',`/api/admin/ministry-shop/audiobooks/${selected.id}/sample`,{paragraphId:sampleId});
      const data=await response.json();
      if(data.pending)setMessage('The sample is preparing. Wait a moment, then open this same sample again.');else setSample(data.url);
    }catch(error){setMessage(error instanceof Error?error.message:'Sample unavailable.');}finally{setBusy(false);}
  }
  async function release() {
    if(!selected)return;setBusy(true);setMessage('');
    try {
      await apiRequest('POST',`/api/admin/ministry-shop/audiobooks/${selected.id}/review`,{textReviewed,voiceReviewed});
      setMessage(voiceReviewed?'Reader and audiobook approved. Audio offers appear only when the provider and spending limit are configured.':'Reader approved. Audiobook sales remain off for this edition.');await refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Review could not save.');}finally{setBusy(false);}
  }
  return <section className="space-y-4 rounded-2xl border p-4 sm:p-6" aria-labelledby="audiobook-studio-heading">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-orange-500">365 Shop Studio</p><h3 id="audiobook-studio-heading" className="mt-1 text-2xl font-bold">Book reader and audiobook</h3><p className="mt-2 text-sm text-muted-foreground">Import a paragraph manuscript matching the verified PDF. Review the text, audition the voice, then enable the audiobook. The PDF and previous purchases stay intact.</p></div>
    {status.isError && <p role="alert">Audio configuration could not load. Try refreshing.</p>}
    {status.data && <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-semibold">{status.data.configured?(status.data.sampleOnly?'Voice sample mode — audiobook sales are off':'Narration service configured'):'Audiobook sales are off — narration service not configured'}</p><p>{status.data.voice} · One-time audio upgrade: $2.99 USD</p><p>{Number(status.data.reserved).toLocaleString()} of {status.data.characterBudget.toLocaleString()} characters reserved. The cap covers all editions and does not reset automatically.</p></div>}
    <details><summary className="cursor-pointer font-semibold">Narration setup and cost controls</summary><div className="mt-3 space-y-2 text-sm text-muted-foreground"><p>Set SHOP_AUDIO_GOOGLE_SERVICE_ACCOUNT_JSON securely in Railway for a Google Cloud project with Text-to-Speech enabled. Set SHOP_AUDIO_CHARACTER_BUDGET to an explicitly approved total character limit and SHOP_AUDIO_ENABLED=true. For the initial voice test, also set SHOP_AUDIO_SAMPLE_ONLY=true and use a total character budget of 2,000. Sample mode keeps audiobook checkout off. Never paste credentials into a manuscript.</p><p>The service uses one fixed English US male voice. Each passage is generated once and stored privately for repeat listening. Failed generation needs review before any paid retry. Additional voices and subscriptions are not enabled.</p><p>At the current planning rate of $30 per million characters, a limit of 100,000 characters represents approximately $3 of synthesis, before any applicable credits, tax, storage or delivery. Verify current provider pricing when setting the limit.</p></div></details>
    <label className="block text-sm font-medium">Import reader manuscript (.json)<input className="mt-2 block w-full text-sm" type="file" accept=".json,application/json" disabled={busy} onChange={e=>void upload(e.target.files?.[0])} /></label>
    <p className="text-xs text-muted-foreground">Format: productId, assetSha256, paragraphs [{'{'}id, text, heading?, page?{'}'}]. Keep paragraphs below 4,500 UTF-8 bytes. Imports remain private until reviewed.</p>
    <label className="block text-sm font-semibold">Reader edition<select value={selected?.id??''} className="mt-2 block min-h-11 w-full rounded border bg-background p-2" disabled={busy} onChange={e=>{const item=status.data?.editions.find(x=>x.id===e.target.value);if(item)void choose(item);}}><option value="">Choose an imported edition</option>{status.data?.editions.map(e=><option value={e.id} key={e.id}>{e.title} — {e.audio_reviewed?'Audio approved':e.reviewed?'Reader approved':'Private draft'}</option>)}</select></label>
    {selected && <div className="space-y-4 border-t pt-4">
      <div className="max-h-[500px] space-y-4 overflow-y-auto rounded-lg border p-4 text-lg leading-8">{paragraphs.map(p=><p key={p.id} className={p.heading?'font-bold':''}>{p.page && <span className="mr-2 text-xs text-muted-foreground">p.{p.page}</span>}{p.text}</p>)}</div>
      <label className="block text-sm font-medium">Audition a passage<select value={sampleId} className="mt-2 block min-h-11 w-full rounded border bg-background p-2" onChange={e=>{setSampleId(e.target.value);setSample('');setVoiceReviewed(false);}}>{paragraphs.map(p=><option key={p.id} value={p.id}>{p.text.slice(0,100)}</option>)}</select></label>
      <Button variant="outline" disabled={busy || !status.data?.configured} onClick={()=>void preview()}>Generate or open this voice sample</Button>
      <p className="text-xs text-muted-foreground">Generating a new sample uses the approved synthesis budget. Opening its saved recording does not regenerate it.</p>
      {sample && <audio controls src={sample} className="w-full" />}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={textReviewed} onChange={e=>setTextReviewed(e.target.checked)} />I checked the complete reader text against this PDF, including chapters, Scripture and paragraph order.</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={voiceReviewed} disabled={!status.data?.configured} onChange={e=>setVoiceReviewed(e.target.checked)} />I auditioned this voice and approve selling this edition with narration.</label>
      <Button disabled={busy || !textReviewed} onClick={()=>void release()}>Save release review</Button>
    </div>}
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
  </section>;
}
