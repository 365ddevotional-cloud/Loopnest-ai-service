import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMusicPrice } from "../../../shared/music-regions";
import MusicPurchasePanel, { MusicCountryPicker, useMusicCatalog } from "./MusicPurchasePanel";
export default function FiveSongCollection() {
  const { data: catalog, error: priceError, refetch: refreshPrice, isFetching: refreshingPrice, selectedCountry, setSelectedCountry } = useMusicCatalog();
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem("music-five-selection-v1") ?? "[]");
      return Array.isArray(saved) ? Array.from(new Set(saved.filter((s): s is string => typeof s === "string"))).slice(0, 5) : [];
    } catch { return []; }
  });
  const { data, isLoading, error } = useQuery<{ slug: string; title: string; audioUrl?: string; isActive: boolean }[]>({ queryKey: ["/api/songs/library"] });
  const songs = (data ?? []).filter(s => s.isActive && /^\/objects\/uploads\/[a-f0-9-]{36}$/.test(s.audioUrl ?? ""));
  useEffect(() => {
    try { sessionStorage.setItem("music-five-selection-v1", JSON.stringify(selected)); } catch {}
  }, [selected]);
  useEffect(() => {
    if (!data) return;
    const available = new Set(data.filter(s => s.isActive && /^\/objects\/uploads\/[a-f0-9-]{36}$/.test(s.audioUrl ?? "")).map(s => s.slug));
    setSelected(current => current.every(slug => available.has(slug)) ? current : current.filter(slug => available.has(slug)));
  }, [data]);
  return <section className="rounded-xl border p-4 space-y-3" data-testid="five-song-collection">
    <h2 className="font-serif text-2xl font-semibold">Choose any five songs — {catalog?.fiveSongOffer ? formatMusicPrice(catalog.fiveSongOffer.cents, catalog.currency) : priceError ? "Price unavailable" : "Loading price…"}</h2>
    {catalog && <p className="text-sm text-muted-foreground">Local price for {catalog.countryName} · {catalog.currency}</p>}
    <MusicCountryPicker catalog={catalog} selectedCountry={selectedCountry} onChange={country => setSelectedCountry(country)} />
    <button type="button" className="text-sm underline" disabled={refreshingPrice} onClick={() => void refreshPrice()}>{refreshingPrice ? "Checking local price…" : "Refresh local price"}</button>
    {priceError && <p role="status">{priceError.message}</p>}
    <p className="text-sm">Select five different tracks. Tracks from a bundle count individually; a three-track bundle counts as three songs.</p>
    <p role="status">{selected.length} of 5 selected</p>
    {selected.length > 0 && <p className="text-sm text-muted-foreground">Selected: {selected.map(slug => songs.find(s => s.slug === slug)?.title ?? slug).join(", ")}</p>}
    {isLoading && <p>Loading songs…</p>}{error && <p>Song selection could not be loaded. Please refresh.</p>}
    <div className="max-h-64 overflow-y-auto space-y-2">{songs.map(s => <label key={s.slug} className="flex gap-2 items-center"><input type="checkbox" checked={selected.includes(s.slug)} disabled={selected.length === 5 && !selected.includes(s.slug)} onChange={e => setSelected(current => e.target.checked ? [...current, s.slug] : current.filter(x => x !== s.slug))}/><span>{s.title}</span></label>)}</div>
    {selected.length === 5 && <MusicPurchasePanel key={[...selected].sort().join(",")} productId={"five:" + [...selected].sort().join(",")}/>}
  </section>;
}
