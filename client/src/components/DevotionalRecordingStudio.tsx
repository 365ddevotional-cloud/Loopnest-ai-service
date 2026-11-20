import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';

type RecordingStatus={version:string;script:string;storageReady:boolean;generationEnabled:boolean;generationProvider?:string;generationVoice?:string;generationDailyCharacterLimit?:number;recording:null|{audioHash:string;published:boolean;bytes:number;provider?:string;audioPath:string}};
export function DevotionalRecordingStudio({id,language}:{id:number;language:string}) {
  const path=`/api/admin/devotional-recordings/${id}/${language}`;
  const status=useQuery<RecordingStatus>({queryKey:[path],queryFn:async()=>(await apiRequest('GET',path)).json(),retry:false});
  const [file,setFile]=useState<File|null>(null);
  const [reviewed,setReviewed]=useState(false),[rights,setRights]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function action(upload:boolean|'generate') {
    if(!status.data)return;
    setBusy(true);setMessage('');
    try {
      if(upload==='generate') {
        await apiRequest('POST',`${path}/generate`,{version:status.data.version,replacePrivate:!!status.data.recording});
        setReviewed(false);setRights(false);setMessage('Google Sola recording saved privately. Listen to the full recording before publishing.');
      } else if(upload) {
        if(!file || file.size>20*1024*1024)throw new Error('Choose an MP3 or PCM WAV recording up to 20 MB.');
        const response=await fetch(`${path}?version=${status.data.version}`,{method:'POST',credentials:'include',headers:{'Content-Type':file.name.toLowerCase().endsWith('.wav')?'audio/wav':'audio/mpeg'},body:file});
        if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(error?.message || 'Upload failed. Your existing recording is retained.');}
        setReviewed(false);setRights(false);setMessage('Saved privately. Listen and review before publication.');
      } else {
        await apiRequest('PATCH',path,{version:status.data.version,audioHash:status.data.recording?.audioHash,published:!status.data.recording?.published,reviewed,rightsConfirmed:rights});
        setMessage(status.data.recording?.published?'Recording unpublished.':'Reviewed recording published.');
      }
      await status.refetch();
    }catch(error){setMessage(error instanceof Error?error.message:'The recording could not be saved.');}
    finally{setBusy(false);}
  }
  const data=status.data;
  return <section aria-label="Saved devotional recording" className="space-y-3 rounded border p-4">
    <h4 className="font-semibold">Saved recording · {language}</h4>
    <p className="text-sm">Save one recording for everyone to replay. Listener playback never generates audio. Upload an MP3 or Google PCM WAV you have permission to publish; no microphone access is needed.</p>
    <p className="text-sm">John 8:12 uses the approved Biblica Open Yoruba or Igbo Bible wording for those narration languages. Other Scripture quotations retain the original source text until verified. Listen to the entire recording, check pronunciation and confirm it matches the script before publishing.</p>
    {status.isLoading && <p role="status">Checking saved recording…</p>}
    {status.isError && <p role="alert">Recording status could not be loaded. Refresh your admin session.</p>}
    {data && <>
      <p className="text-sm">Google Sola · {data.generationEnabled?`Enabled, daily allowance ${data.generationDailyCharacterLimit?.toLocaleString()} characters.`:'Generation off until a server API key, verified free-tier project and daily allowance are configured.'}</p>
      {data.generationEnabled && !data.recording?.published && data.recording?.provider!=='google-sola' && <button type="button" className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy||!data.storageReady} onClick={()=>void action('generate')}>{data.recording?'Generate private Sola replacement':'Generate private Sola recording'}</button>}
      <p role="status">{!data.storageReady?'Private storage is unavailable.':data.recording?(data.recording.published?'Published recording':'Private recording · Review pending'):'No recording saved yet.'}</p>
      <details><summary className="cursor-pointer">Recording script · {data.script.length.toLocaleString()} characters</summary><textarea readOnly aria-label="Recording script" className="mt-2 min-h-48 w-full rounded border bg-background p-3" value={data.script} /></details>
      {data.recording && <audio key={data.recording.audioHash} controls preload="none" src={data.recording.audioPath} className="w-full" aria-label="Audition saved recording" />}
      {!data.recording?.published && <>
        <label className="block text-sm">MP3 or 24 kHz mono PCM WAV file, up to 20 MB<input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" disabled={busy||!data.storageReady} className="mt-2 block w-full text-sm" onChange={e=>setFile(e.target.files?.[0]??null)} /></label>
        <button type="button" disabled={!file||busy||!data.storageReady} className="rounded border px-3 py-2 disabled:opacity-50" onClick={()=>void action(true)}>Upload private recording</button>
      </>}
      {data.recording && <>
        {!data.recording.published && <>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} />I listened to the complete recording and approve its wording and pronunciation.</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} />I have permission to publish this recording, including any voice-provider license.</label>
        </>}
        <button type="button" disabled={busy||(!data.recording.published&&(!reviewed||!rights))} className="rounded border px-3 py-2 disabled:opacity-50" onClick={()=>void action(false)}>{data.recording.published?'Unpublish recording':'Publish reviewed recording'}</button>
      </>}
    </>}
    {busy && <p role="status">Saving…</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}

