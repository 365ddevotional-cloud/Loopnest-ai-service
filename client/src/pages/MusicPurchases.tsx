import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

type Purchase = { sessionId: string; productId: string; title: string; status: string; amountCents: number; createdAt: string; downloadExpiresAt: string | null };
export default function MusicPurchases() {
  const { user, loading, getIdToken } = useUser();
  const queryClient = useQueryClient();
  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  const cancelled = new URLSearchParams(window.location.search).has("cancelled");
  const [message, setMessage] = useState("");
  const [downloads, setDownloads] = useState<{ title: string; url: string }[]>([]);
  const [downloadsExpireAt, setDownloadsExpireAt] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setDownloads([]); setDownloadsExpireAt(null); }, [user?.uid]);
  const visiblePurchases = (purchasesData: Purchase[] | undefined) => (purchasesData ?? []).filter(p => !p.downloadExpiresAt || new Date(p.downloadExpiresAt).getTime() > clock);
  const activeDownloads = !downloadsExpireAt || new Date(downloadsExpireAt).getTime() > clock;
  const [downloading, setDownloading] = useState<string | null>(null);
  async function request(path: string, body?: object) {
    const token = await getIdToken();
    if (!token) throw new Error("Please sign in to the account used for checkout.");
    const response = await fetch(path, { method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "Your purchase could not be verified.");
    return result;
  }
  const purchases = useQuery<Purchase[]>({ queryKey: ["music-purchases", user?.uid], enabled: !!user,
    queryFn: () => request("/api/music-commerce/purchases") });
  const confirm = useMutation({ mutationFn: (id: string) => request("/api/music-commerce/confirm", { sessionId: id }),
    onSuccess: () => { setMessage("Payment confirmed. Your download is ready."); queryClient.invalidateQueries({ queryKey: ["music-purchases"] }); },
    onError: err => setMessage((err as Error).message) });
  useEffect(() => {
    if (user && sessionId) confirm.mutate(sessionId);
  }, [user?.uid, sessionId]);
  async function download(purchase: Purchase) {
    setDownloading(purchase.sessionId); setMessage("");
    try {
      const result = await request("/api/music-commerce/download", { sessionId: purchase.sessionId });
      if (result.downloads) { setDownloads(result.downloads); setDownloadsExpireAt(result.downloadExpiresAt ?? null); }
      else window.location.assign(result.downloadUrl);
    } catch (err) { setMessage((err as Error).message); }
    finally { setDownloading(null); }
  }
  return <main className="max-w-2xl mx-auto px-4 py-8 space-y-5" data-testid="music-purchases">
    <Link href="/music" className="underline">Back to Music</Link>
    <h1 className="font-serif text-3xl font-bold">My Music Purchases</h1>
    <p className="text-muted-foreground">{user ? `Signed in as ${user.email}. Your purchases belong to this account.` : "Sign in to the same email account you used before checkout."}</p>
    <p className="text-sm">For new purchases, download all files within two hours after payment. You can retry within that window. Expired downloads disappear here. Keep the files you save on your device.</p>
    {cancelled && <p role="status">Checkout was cancelled. No download access was granted.</p>}
    {message && <p role="status" className="rounded-lg border p-3">{message}</p>}
    {user && activeDownloads && downloads.map(d => <a key={d.title + d.url} href={d.url} className="block underline">Download {d.title}</a>)}
    {downloads.length > 0 && activeDownloads && <p className="text-sm">If a temporary link stops working during your download window, get your download links again below.</p>}
    {downloads.length > 0 && !activeDownloads && <p role="status">Your two-hour download window has ended.</p>}
    {confirm.isPending && <p role="status">Verifying your payment…</p>}
    {loading ? <p>Loading…</p> : !user ? <Button asChild><Link href={`/sign-in?return=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Sign In to View Purchases</Link></Button> : <>
      {purchases.isLoading && <p>Loading purchases…</p>}
      {purchases.error && <p role="alert">Purchases could not be loaded. Please refresh.</p>}
      {purchases.isSuccess && visiblePurchases(purchases.data).length === 0 && <p>You have no available music downloads. Expired downloads no longer appear here.</p>}
      {visiblePurchases(purchases.data).map(purchase => <article key={purchase.sessionId} className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">{purchase.title}</h2>
        <p className="text-sm">${(purchase.amountCents / 100).toFixed(2)} USD · {purchase.status === "paid" ? "Paid" : purchase.status === "pending" ? "Awaiting payment confirmation" : purchase.status === "revoked" ? "Download access revoked" : "Checkout expired"}</p>
        {purchase.downloadExpiresAt && <p className="text-sm font-semibold" role="status">Download before {new Date(purchase.downloadExpiresAt).toLocaleString()} · {Math.max(1, Math.ceil((new Date(purchase.downloadExpiresAt).getTime() - clock) / 60000))} minutes remaining</p>}
        {purchase.status === "paid" ? <Button disabled={!!downloading} onClick={() => download(purchase)}>{downloading === purchase.sessionId ? "Preparing download…" : purchase.productId.startsWith("five:") ? "Get Five MP3 Downloads" : purchase.productId === "heaven-reigns-bundle" ? "Download All Three (ZIP)" : "Download MP3"}</Button> : purchase.status === "pending" ? <Button variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate(purchase.sessionId)}>Check Payment</Button> : null}
      </article>)}
    </>}
  </main>;
}

