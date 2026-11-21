import { useRef } from "react";
import { auth } from "@/lib/firebase";

// One start per open edition and spoken language, including multipart recordings.
export function useListeningStats(kind: "school" | "devotional", id?: number | string) {
  const seen = useRef({ edition: id, languages: new Set<string>() });
  if (seen.current.edition !== id) seen.current = { edition: id, languages: new Set() };
  const edition = seen.current;
  return (language: string) => {
    if (!id || edition.languages.has(language)) return;
    edition.languages.add(language);
    void (async () => {
      await auth.authStateReady();
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/audio-listening", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: JSON.stringify({ kind, language }),
      });
    })().catch(() => {}); // Listening continues if analytics are offline.
  };
}
