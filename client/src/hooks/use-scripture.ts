import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/TranslationContext";
import { fetchChapter } from "@/lib/bible-data";
import { parseScriptureReferences } from "@/lib/scripture-reference";
import type { BiblePassage, BibleTranslation } from "@shared/schema";

interface ScriptureResponse extends BiblePassage {
  isFallback?: boolean;
  requestedTranslation?: string;
}

export function useScripture(reference: string | undefined) {
  const { translation } = useTranslation();
  
  return useQuery<ScriptureResponse>({
    queryKey: ["/api/scripture", reference, translation],
    queryFn: async () => {
      if (!reference) throw new Error("No reference provided");
      const refs = parseScriptureReferences(reference);
      if (refs.length) {
        const chapters = await Promise.all(refs.map(r=>fetchChapter(r.bookId,r.chapter,translation)));
        if(chapters.every(Boolean)) {
          const actual=chapters.some(c=>c!.isFallback)?"KJV":translation;
          // A mixed-translation passage must be retried wholly in KJV and labeled honestly.
          const full=actual===translation?chapters:await Promise.all(refs.map(r=>fetchChapter(r.bookId,r.chapter,"KJV")));
          if(full.every(Boolean)) {
            const content=full.map((c,i)=>c!.verses.filter(v=>!refs[i].start||(v.verse>=refs[i].start!&&v.verse<=refs[i].end!)).map(v=>`${v.verse} ${v.text}`).join(" ")).join("\n");
            if(content) return {reference,translation:actual,content,isFallback:actual!==translation} as ScriptureResponse;
          }
        }
      }
      const params = new URLSearchParams({ reference, translation });
      const res = await fetch(`/api/scripture?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null as any;
        }
        throw new Error("Failed to fetch scripture");
      }
      return res.json();
    },
    enabled: !!reference,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}

export function useScriptureText(reference: string | undefined, fallbackText?: string): {
  text: string;
  translation: BibleTranslation;
  isLoading: boolean;
  isFallback: boolean;
} {
  const { translation } = useTranslation();
  const { data, isLoading } = useScripture(reference);
  
  return {
    text: data?.content || fallbackText || "",
    translation: (data?.translation || (fallbackText ? "KJV" : translation)) as BibleTranslation,
    isLoading,
    isFallback: data?.isFallback || !data?.content,
  };
}
