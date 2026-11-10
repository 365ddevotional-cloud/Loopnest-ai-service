import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { formatMusicPrice } from "@shared/music-regions";
import { useDeviceMusicCountry } from "./MusicPurchasePanel";

type Price = { amount: number; currency: string; country: string; ready: boolean; usdFallback?: boolean };
type ShopPrices = { country?: string; products: Record<string, Price> };

export function formatShopPrice(price: Price) {
  const amount = formatMusicPrice(price.amount, price.currency);
  return price.usdFallback ? `${amount} USD` : amount;
}

const inAndroidApp = () => typeof window !== "undefined" && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;

export function useShopPrices() {
  const { deviceCountry, locationResolved, retryDeviceLocation } = useDeviceMusicCountry();
  const query = useQuery<ShopPrices>({
    queryKey: ["ministry-shop-prices", deviceCountry],
    enabled: locationResolved,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deviceCountry) params.set("country", deviceCountry);
      return shopRequest<ShopPrices>(`/api/ministry-shop/prices?${params}`);
    },
  });
  return { ...query, locationResolved, retryDeviceLocation };
}

async function shopRequest<T>(path: string, token?: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) throw new Error(data?.message ?? "The shop is temporarily unavailable.");
  return data as T;
}

export function ShopCheckout({ productId, price }: { productId: string; price?: Price }) {
  const { user, emailVerified, getIdToken } = useUser();
  const [accepted, setAccepted] = useState(false);
  const purchase = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token || !price || !accepted || inAndroidApp()) throw new Error("Checkout is unavailable.");
      return shopRequest<{checkoutUrl?: string; purchaseUrl?: string}>("/api/ministry-shop/checkout", token, {
        productId, country: price.country, amount: price.amount, currency: price.currency, acceptedDownloadPolicy: accepted,
      });
    },
    onSuccess: result => {
      const target = result.checkoutUrl ?? result.purchaseUrl;
      if (target) window.location.assign(target);
    },
  });

  if (inAndroidApp()) return <p className="mt-4 text-sm text-muted-foreground">Browse the collection here. Your completed purchases are available in Shop purchases.</p>;
  if (!price?.ready) return <p className="mt-4 text-sm text-muted-foreground">Checkout is currently unavailable for this item in your currency.</p>;
  const currencyNotice = price.usdFallback && <p className="text-sm text-muted-foreground">Your card will be charged in US dollars. Your bank may charge a currency conversion fee.</p>;
  if (!user || !emailVerified) return (
    <div className="mt-4 space-y-2">
      {currencyNotice}
      <Button asChild><Link href={`/signin?return=${encodeURIComponent(`/shop/${productId}`)}`}>{user ? "Verify email to buy" : "Sign in to buy"}</Link></Button>
    </div>
  );
  return (
    <div className="mt-5 space-y-3">
      {currencyNotice}
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input className="mt-1" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
        I understand that my download window is two hours from payment.
      </label>
      <Button disabled={!accepted || purchase.isPending} onClick={() => purchase.mutate()}>
        {purchase.isPending ? "Opening Stripe…" : `Buy for ${formatShopPrice(price)}`}
      </Button>
      {purchase.error && <p role="alert" className="text-sm text-destructive">{purchase.error.message}</p>}
    </div>
  );
}

type ShopPurchase = { sessionId: string; title: string; status: string; downloadExpiresAt: string | null };

export function MinistryShopPurchases() {
  const { user, loading } = useUser();
  const returnTo = window.location.pathname + window.location.search;
  const returnedSession = new URLSearchParams(window.location.search).get("session_id");

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">← Back to 365 Ministry Shop</Link>
      <h1 className="font-serif text-3xl font-bold">Shop purchases</h1>
      {loading ? <p>Loading account…</p> : user ? (
        <ShopPurchaseList key={user.uid} uid={user.uid} returnedSession={returnedSession} />
      ) : (
        <Button asChild><Link href={`/signin?return=${encodeURIComponent(returnTo)}`}>Sign in to view purchases</Link></Button>
      )}
    </main>
  );
}

function ShopPurchaseList({ uid, returnedSession }: { uid: string; returnedSession: string | null }) {
  const { getIdToken } = useUser();
  const purchases = useQuery<ShopPurchase[]>({
    queryKey: ["ministry-shop-purchases", uid],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to see your shop purchases.");
      return shopRequest("/api/ministry-shop/purchases", token);
    },
  });
  const download = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to access downloads.");
      return shopRequest<{ files: { name: string; url: string }[] }>("/api/ministry-shop/download", token, { sessionId });
    },
  });
  const orders = purchases.data ?? [];
  const returnedOrder = orders.find(order => order.sessionId === returnedSession);
  const visibleOrders = returnedOrder ? [returnedOrder, ...orders.filter(order => order !== returnedOrder)] : orders;

  return (
    <>
      {purchases.isLoading && <p>Loading purchases…</p>}
      {purchases.error && <p role="alert">{purchases.error.message}</p>}
      {purchases.data && !returnedOrder && returnedSession && (
        <p className="text-muted-foreground">This order is not listed. Use the account you checked out with, or refresh purchases if you just paid.</p>
      )}
      {purchases.data && !visibleOrders.length && <p className="text-muted-foreground">There are no shop purchases on this account.</p>}
      {(purchases.error || (returnedSession && !returnedOrder && purchases.data)) && (
        <Button variant="outline" disabled={purchases.isFetching} onClick={() => void purchases.refetch()}>Refresh purchases</Button>
      )}
      {visibleOrders.map(order => {
        const expired = !!order.downloadExpiresAt && Date.parse(order.downloadExpiresAt) <= Date.now();
        const selected = download.variables === order.sessionId;
        return (
          <section className="space-y-3 rounded-xl border p-4" key={order.sessionId}>
            <h2 className="font-semibold">{order.title}</h2>
            {expired ? <p className="text-sm text-muted-foreground">Your two-hour download window has ended.</p> : (
              <>
                {order.status === "pending" && <p className="text-sm text-muted-foreground">If you just paid, check your payment to get your files.</p>}
                <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate(order.sessionId)}>
                  {selected && download.isPending ? "Checking payment…" : "Get download links"}
                </Button>
                {selected && download.error && <p role="alert" className="text-sm text-destructive">{download.error.message}</p>}
                {selected && download.data && <ul className="space-y-1">
                  {download.data.files.map(file => <li key={file.url}><a href={file.url} className="text-primary underline">{file.name}</a></li>)}
                </ul>}
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
