import { useUser } from "./UserContext";
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { BibleTranslation } from "@shared/schema";
const STORAGE_KEY = "devotional.preferredTranslation";
const DEFAULT_TRANSLATION: BibleTranslation = "KJV";
interface TranslationContextType {
    translation: BibleTranslation;
    setTranslation: (translation: BibleTranslation) => void;
    translationLabel: string;
}
const TRANSLATION_LABELS: Record<BibleTranslation, string> = {
    KJV: "King James Version",
    WEB: "World English Bible",
    ASV: "American Standard Version",
    DRB: "Douay-Rheims Bible",
};
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);
export function TranslationProvider({ children }: {
    children: ReactNode;
}) {
    const [translation, setTranslationState] = useState<BibleTranslation>(() => {
        if (typeof window === "undefined")
            return DEFAULT_TRANSLATION;
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        }
        catch { }
        if (stored && ["KJV", "WEB", "ASV", "DRB"].includes(stored)) {
            return stored as BibleTranslation;
        }
        return DEFAULT_TRANSLATION;
    });
    const { user, loading } = useUser();
    const revision = useRef(0);
    const saves = useRef(Promise.resolve());
    useEffect(() => {
        if (loading)
            return;
        let active = true;
        const before = revision.current;
        const key = user ? `${STORAGE_KEY}:${user.uid}` : STORAGE_KEY;
        try {
            const local = localStorage.getItem(key);
            setTranslationState(local && ["KJV", "WEB", "ASV", "DRB"].includes(local) ? local as BibleTranslation : DEFAULT_TRANSLATION);
        }
        catch { }
        if (user)
            void (async () => {
                try {
                    const token = await user.getIdToken();
                    const res = await fetch("/api/user/bible-preference", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
                    if (!res.ok)
                        return;
                    const data = await res.json();
                    if (active && revision.current === before && ["KJV", "WEB", "ASV", "DRB"].includes(data.translation)) {
                        setTranslationState(data.translation);
                        try {
                            localStorage.setItem(key, data.translation);
                        }
                        catch { }
                    }
                }
                catch { }
            })();
        return () => { active = false; };
    }, [user?.uid, loading]);
    const setTranslation = (newTranslation: BibleTranslation) => {
        revision.current++;
        setTranslationState(newTranslation);
        try {
            localStorage.setItem(user ? `${STORAGE_KEY}:${user.uid}` : STORAGE_KEY, newTranslation);
        }
        catch { }
        if (user)
            saves.current = saves.current.catch(() => { }).then(async () => { try {
                const token = await user.getIdToken();
                await fetch("/api/user/bible-preference", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ translation: newTranslation }) });
            }
            catch { } });
    };
    const translationLabel = TRANSLATION_LABELS[translation];
    return (<TranslationContext.Provider value={{ translation, setTranslation, translationLabel }}>
      {children}
    </TranslationContext.Provider>);
}
export function useTranslation() {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error("useTranslation must be used within a TranslationProvider");
    }
    return context;
}
export { TRANSLATION_LABELS };
