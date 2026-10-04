import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MusicPurchasePanel from "./MusicPurchasePanel";
export default function FiveSongCollection() {
  const [selected, setSelected] = useState<string[]>([]);
  const { data, isLoading, error } = useQuery<{ slug: string; title: string; audioUrl?: string; isActive: boolean }[]>({ queryKey: ["/api/songs/library"] });
  const songs = (data ?? []).filter(s => s.isActive && /^\/objects\/uploads\/[a-f0-9-]{36}$/.test(s.audioUrl ?? ""));
  return <section className="rounded-xl border p-4 space-y-3" data-testid="five-song-collection">
    <h2 className="font-serif text-lg font-semibold">Choose any five songs — $2.99</h2>
    <p className="text-sm">Select five different tracks. Tracks from a bundle count individually; a three-track bundle counts as three songs.</p>
    <p role="status">{selected.length} of 5 selected</p>
    {isLoading && <p>Loading songs…</p>}{error && <p>Song selection could not be loaded. Please refresh.</p>}
    <div className="max-h-64 overflow-y-auto space-y-2">{songs.map(s => <label key={s.slug} className="flex gap-2 items-center"><input type="checkbox" checked={selected.includes(s.slug)} disabled={selected.length === 5 && !selected.includes(s.slug)} onChange={e => setSelected(current => e.target.checked ? [...current, s.slug] : current.filter(x => x !== s.slug))}/><span>{s.title}</span></label>)}</div>
    {selected.length === 5 && <MusicPurchasePanel key={[...selected].sort().join(",")} productId={"five:" + [...selected].sort().join(",")}/>}
  </section>;
}
