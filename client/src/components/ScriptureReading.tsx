import { useState } from "react";
import { TranslationSelector } from "./TranslationSelector";
import { useScriptureText } from "@/hooks/use-scripture";
import { useTranslation } from "@/contexts/TranslationContext";
import { findScriptureReferences } from "@/lib/scripture-reference";
export function ScriptureReading({ reference }: {
    reference: string;
}) {
    const { translation: preferred } = useTranslation();
    const { text, translation, isLoading, isFallback } = useScriptureText(reference);
    return <section aria-label={`Scripture ${reference}`} className="space-y-2 rounded-md border p-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><strong>{reference} · {translation}</strong><TranslationSelector /></div>
  {isLoading ? <p>Loading Scripture…</p> : text ? <p className="whitespace-pre-wrap leading-relaxed">{text}</p> : <p>Passage unavailable. Please try the Bible reader.</p>}
  {isFallback && preferred !== "KJV" && <p role="status" className="text-sm">{preferred} is unavailable for this passage. Showing KJV where available.</p>}
 </section>;
}
export function ScriptureLinks({ text }: {
    text: string;
}) {
    const [selected, setSelected] = useState("");
    const refs = findScriptureReferences(text);
    return <section aria-label="Read in my Bible version" className="space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Read in my Bible version</h3><TranslationSelector /></div>
 <p className="text-sm text-muted-foreground">Original quotations and teaching remain unchanged.</p>
 <div className="flex flex-wrap gap-2">{refs.map(r => <button type="button" className="rounded border px-2 py-1 text-sm" key={r} onClick={() => setSelected(selected === r ? "" : r)} aria-expanded={selected === r}>{r}</button>)}</div>
 {selected && <ScriptureReading reference={selected}/>}
 </section>;
}
