import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { formatMusicPrice } from "@shared/music-regions";
import { useDeviceMusicCountry } from "./MusicPurchasePanel";

type Price = { amount: number; currency: string; country: string; ready: boolean };
type ShopPrices = { country?: string; products: Record<string, Price> };

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
  const { user, getIdToken } = useUser();
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
  if (!user) return <Button asChild className="mt-4"><Link href="/signin">Sign in to buy</Link></Button>;
  return (
    <div className="mt-5 space-y-3">
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input className="mt-1" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
        I understand that my download window is two hours from payment.
      </label>
      <Button disabled={!accepted || purchase.isPending} onClick={() => purchase.mutate()}>
        {purchase.isPending ? "Opening Stripe…" : `Buy for ${formatMusicPrice(price.amount, price.currency)}`}
      </Button>
      {purchase.error && <p role="alert" className="text-sm text-destructive">{purchase.error.message}</p>}
    </div>
  );
}

export function MinistryShopPurchases() {
  const { user, getIdToken } = useUser();
  const [selection, setSelection] = useState<string>();
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(() => {
    setSelection(undefined);
    setLinks([]);
    setError("");
  }, [user?.uid]);
  const purchases = useQuery<{sessionId: string; title: string; status: string}[]>({
    queryKey: ["ministry-shop-purchases", user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to see your shop purchases.");
      return shopRequest("/api/ministry-shop/purchases", token);
    },
  });
  async function openDownloads(sessionId: string) {
    setWorking(true);
    setLinks([]);
    setError("");
    setSelection(sessionId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to access downloads.");
      const result = await shopRequest<{files: typeof links}>("/api/ministry-shop/download", token, { sessionId });
      setLinks(result.files);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">← Back to 365 Ministry Shop</Link>
      <h1 className="font-serif text-3xl font-bold">Shop purchases</h1>
      {!user && <Button asChild><Link href="/signin">Sign in</Link></Button>}
      {user && purchases.isLoading && <p>Loading purchases…</p>}
      {purchases.error && <p role="alert">{purchases.error.message}</p>}
      {purchases.data?.length === 0 && <p className="text-muted-foreground">There are no shop purchases in your download window.</p>}
      {purchases.data?.map(order => (
        <section className="space-y-3 rounded-xl border p-4" key={order.sessionId}>
          <h2 className="font-semibold">{order.title}</h2>
          <Button variant="outline" disabled={working} onClick={() => void openDownloads(order.sessionId)}>
            {working && selection === order.sessionId ? "Checking payment…" : "Get download links"}
          </Button>
          {selection === order.sessionId && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {selection === order.sessionId && links.length > 0 && <ul className="space-y-1">
            {links.map(file => <li key={file.url}><a href={file.url} className="text-primary underline">{file.name}</a></li>)}
          </ul>}
        </section>
      ))}
    </main>
  );
}
