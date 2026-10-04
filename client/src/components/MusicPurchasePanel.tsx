import { auth } from "@/lib/firebase";
import { getMusicProduct } from "../../../shared/music-products";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

export type MusicCatalog = { mode: string; fiveSongOffer?: { cents: number; ready: boolean }; products: { id: string; title: string; cents: number; slugs: string[]; ready: boolean }[] };
export function useMusicCatalog() {
  return useQuery<MusicCatalog>({ queryKey: ["/api/music-commerce/catalog"], staleTime: 30000,
    queryFn: async () => { const response = await fetch("/api/music-commerce/catalog");
      if (!response.ok) throw new Error("Purchase options could not be loaded."); return response.json(); } });
}
export default function MusicPurchasePanel({ productId }: { productId: string }) {
  const { data: catalog, isLoading, error } = useMusicCatalog();
  const { user, getIdToken, signUserOut, loading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { data: access } = useQuery<{ lifetimeFreeDownloads: boolean }>({
    queryKey: ["music-download-access", user?.uid], enabled: !!user,
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch("/api/user/download-access", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Download access could not be checked."); return response.json();
    },
  });
  const freeAccess = access?.lifetimeFreeDownloads === true;
  const five = productId.startsWith("five:");
  const product = five ? (getMusicProduct(productId) ? { ...getMusicProduct(productId)!, ready: catalog?.fiveSongOffer?.ready === true } : undefined) : catalog?.products.find(p => p.id === productId);
  const [downloads, setDownloads] = useState<{ title: string; url: string }[]>([]);
  async function buy() {
    if (!user) { setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`); return; }
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        await signUserOut();
        setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const response = await fetch("/api/music-commerce/checkout", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId }) });
      if (response.status === 401) {
        await signUserOut();
        toast({ title: "Please sign in again", description: "Your selected songs have been saved." });
        setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Checkout could not be opened.");
      if (result.purchaseUrl === "/music/purchases") { setLocation(result.purchaseUrl); return; }
      if (result.downloads) { setDownloads(result.downloads); return; }
      if (result.downloadUrl) { window.location.assign(result.downloadUrl); return; }
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Checkout could not be opened.");
      window.location.assign(url.href);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-token-expired" || code === "auth/invalid-user-token" || code === "auth/user-disabled") {
        await signUserOut();
        toast({ title: "Please sign in again", description: "Your selected songs have been saved." });
        setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`);
      } else {
        toast({ title: "Checkout unavailable", description: (err as Error).message, variant: "destructive" });
      }
    }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3" data-testid={`purchase-${productId}`}>
    <h3 className="font-semibold">{five ? "Download your five songs — $2.99" : productId === "heaven-reigns-bundle" ? "Download all three tracks — $1.89" : "Download this track — $0.89"}</h3>
    <p className="text-sm text-muted-foreground">{five ? "Five distinct tracks of your choice, including tracks from bundles. Download each MP3 below after purchase." : productId === "heaven-reigns-bundle" ? "Original, Instrumental, and Remix MP3s in one ZIP." : "One MP3 track."} One-time purchase in USD. No subscription.</p>
    {catalog?.mode === "test" && <p className="text-sm font-semibold">Test checkout only. Live purchases are not enabled.</p>}
    {!product?.ready && !freeAccess && <p className="text-sm" role="status">{error ? "Purchase options could not be loaded. Please refresh." : isLoading ? "Loading purchase options…" : "Paid downloads are coming soon. Listen and watch for free now."}</p>}
    {freeAccess && <p className="text-sm">Your verified account has lifetime free download access.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={loading || busy || (!product?.ready && !freeAccess)} onClick={buy} data-testid={`buy-${productId}`}>
        {busy ? "Preparing…" : freeAccess ? "Download Free" : five ? "Buy Five Songs — $2.99" : productId === "heaven-reigns-bundle" ? "Buy Bundle — $1.89" : "Buy Track — $0.89"}
      </Button>
      <Link href="/music/purchases" className="text-sm underline">My Music Purchases</Link>
    </div>
    {downloads.map(d => <a key={d.title + d.url} href={d.url} className="block underline">Download {d.title}</a>)}
  </section>;
}
