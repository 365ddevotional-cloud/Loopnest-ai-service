import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { defaultMusicPricing, musicPricingSchema, type MusicPricing } from "@shared/music-pricing";

const fields = [
  ["usdAudioCents", "Audio price (USD)"],
  ["usdVideoCents", "Video price (USD)"],
  ["ngnAudioKobo", "Audio price in Nigeria (NGN)"],
  ["ngnVideoKobo", "Video price in Nigeria (NGN)"],
] as const;

export default function MusicPricingAdmin() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<MusicPricing>({queryKey: ["/api/admin/music-pricing"]});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setPrices(Object.fromEntries(fields.map(([key]) => [key, (data[key] / 100).toFixed(2)])));
  }, [data]);

  async function save() {
    const converted = Object.fromEntries(fields.map(([key]) => [key, Math.round(Number(prices[key]) * 100)]));
    const parsed = musicPricingSchema.safeParse(converted);
    if (!parsed.success || fields.some(([key]) => !/^\d+(\.\d{1,2})?$/.test(prices[key] ?? ""))) {
      toast({title: "Enter valid prices", description: "Use up to two decimal places. USD prices must be at least $0.50.", variant: "destructive"});
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/admin/music-pricing", parsed.data);
      await queryClient.invalidateQueries({queryKey: ["/api/admin/music-pricing"]});
      await queryClient.invalidateQueries({queryKey: ["/api/music-pricing"]});
      toast({title: "Download prices saved"});
    } catch {
      toast({title: "Prices were not saved", description: "Please try again.", variant: "destructive"});
    } finally { setSaving(false); }
  }

  return <Card data-testid="music-pricing-admin">
    <CardHeader><CardTitle>Music Download Prices</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Set separate audio and video prices. These are one-time purchases, with no subscription. Buying multiple items uses the per-item price.</p>
      <p className="text-sm">Checkout is awaiting payment-provider setup. Saving prices does not activate charges or change today’s free downloads.</p>
      {error ? <p role="alert">Prices could not be loaded. Please refresh before editing.</p> : <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Input id={key} data-testid={`price-${key}`} type="number" step="0.01" min={key.startsWith("usd") ? "0.50" : "1"} value={prices[key] ?? ((defaultMusicPricing[key] / 100).toFixed(2))} disabled={isLoading || saving} onChange={e => setPrices({...prices, [key]: e.target.value})}/>
        </div>)}
      </div>}
      <Button onClick={save} disabled={isLoading || saving || !!error} data-testid="save-music-prices">{saving ? "Saving…" : "Save Download Prices"}</Button>
    </CardContent>
  </Card>;
}
