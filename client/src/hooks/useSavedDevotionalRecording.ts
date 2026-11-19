import {useQuery} from '@tanstack/react-query';
import {devotionalRecordingSnapshot, type RecordingText} from '@shared/devotional-recording';

export function useSavedDevotionalRecording(devotional:RecordingText, language:string) {
  const snapshot=devotionalRecordingSnapshot(devotional,language);
  return useQuery<{available:boolean;audioPath?:string}>({
    queryKey:['saved-devotional-recording',snapshot], retry:false, staleTime:60_000,
    queryFn:async()=>{
      const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
      const version=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
      const path=`/api/devotional-recordings/${devotional.id}/${language}/${version}`;
      const response=await fetch(path,{credentials:'include'});
      if(!response.ok)throw new Error('Saved recording unavailable');
      const data=await response.json();
      // Never load a provider URL or an arbitrary media path from this response.
      return data.available===true && data.audioPath===`${path}/audio`
        ? {available:true,audioPath:data.audioPath} : {available:false};
    },
  });
}
