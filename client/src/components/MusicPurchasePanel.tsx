import { auth } from "@/lib/firebase";
import { getMusicProduct } from "../../../shared/music-products";
import { useEffect, useId, useState } from "react";
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
  const { user, getIdToken, signUserOut, loading, emailVerified } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const emailInputId = useId();
  const [confirmedEmail, setConfirmedEmail] = useState(user?.email ?? "");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  useEffect(() => { setConfirmedEmail(user?.email ?? ""); setPolicyAccepted(false); }, [user?.uid, user?.email, productId]);
  async function changeAccount() {
    await signUserOut();
    setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`);
  }
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
    if (!emailVerified) { setLocation(`/sign-in?return=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!confirmedEmail.trim() || confirmedEmail.trim().toLowerCase() !== user.email?.toLowerCase()) {
      toast({ title: "Confirm your email", description: "Enter the email of your signed-in account, or choose Use another account.", variant: "destructive" });
      return;
    }
    if (!freeAccess && !policyAccepted) {
      toast({ title: "Confirm the download window", description: "Please confirm that you will download your files within two hours after payment." });
      return;
    }
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
        body: JSON.stringify({ productId, email: confirmedEmail.trim(), downloadPolicyAccepted: policyAccepted }) });
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
    {user ? <div className="space-y-2">
      <label htmlFor={emailInputId} className="block text-sm font-semibold">Confirm your account email</label>
      <input id={emailInputId} type="email" autoComplete="email" required value={confirmedEmail} onChange={e => setConfirmedEmail(e.target.value)} className="w-full rounded-md border bg-background p-3 text-foreground" />
      <p className="text-sm">Signed in as {user.email}. Return with this same account to access your downloads.</p>
      <Button variant="outline" disabled={busy} onClick={changeAccount}>Use another account</Button>
      {!emailVerified && <p role="status">Verify your email before buying. The button below takes you to email verification.</p>}
    </div> : <p className="text-sm font-semibold">Sign in or create an account with your email before paying, so your downloads are linked to you.</p>}
    {!freeAccess && <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">Download every purchased file within 2 hours after payment. You can retry during those 2 hours. Afterward, download access disappears from your account. Files already saved on your device remain yours.</p>
      {user && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} /><span>I confirm this is my email and understand the two-hour download window.</span></label>}
    </div>}
    {catalog?.mode === "test" && <p className="text-sm font-semibold">Test checkout only. Live purchases are not enabled.</p>}
    {!product?.ready && !freeAccess && <p className="text-sm" role="status">{error ? "Purchase options could not be loaded. Please refresh." : isLoading ? "Loading purchase options…" : "Paid downloads are coming soon. Listen and watch for free now."}</p>}
    {freeAccess && <p className="text-sm">Your verified account has lifetime free download access.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={loading || busy || (!product?.ready && !freeAccess) || (!!user && emailVerified && !freeAccess && !policyAccepted)} onClick={buy} data-testid={`buy-${productId}`}>
        {busy ? "Preparing…" : !user ? "Sign In to Buy" : !emailVerified ? "Verify Email Before Buying" : freeAccess ? "Download Free" : five ? "Buy Five Songs — $2.99" : productId === "heaven-reigns-bundle" ? "Buy Bundle — $1.89" : "Buy Track — $0.89"}
      </Button>
      <Link href="/music/purchases" className="text-sm underline">My Music Purchases</Link>
    </div>
    {downloads.map(d => <a key={d.title + d.url} href={d.url} className="block underline">Download {d.title}</a>)}
  </section>;
}

