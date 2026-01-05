import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/TranslationContext";
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
    translation: (data?.isFallback ? "KJV" : translation) as BibleTranslation,
    isLoading,
    isFallback: data?.isFallback || !data?.content,
  };
}
