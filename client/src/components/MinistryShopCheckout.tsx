import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import {audioOwnership} from "@shared/shop-audiobook";
import { isAndroidReader } from "@/lib/android-reader";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { formatMusicPrice } from "@shared/music-regions";
import { useDeviceMusicCountry } from "./MusicPurchasePanel";

type Price = { audioEditionId?: string; audioAmount?: number; readListenAmount?: number; amount: number; currency: string; country: string; ready: boolean; usdFallback?: boolean };
type ShopPrices = { country?: string; products: Record<string, Price> };

export function formatShopPrice(price: Price) {
  const amount = formatMusicPrice(price.amount, price.currency);
  return price.usdFallback ? `${amount} USD` : amount;
}

export function useShopPrices() {
  const androidReader = isAndroidReader();
  const { deviceCountry, locationResolved, retryDeviceLocation } = useDeviceMusicCountry();
  const query = useQuery<ShopPrices>({
    queryKey: ["ministry-shop-prices", deviceCountry],
    enabled: locationResolved && !androidReader,
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
  useI18n();
  const { user, emailVerified, getIdToken } = useUser();
  const [accepted, setAccepted] = useState(false);
  const [choice,setChoice]=useState<"ebook"|"read-listen">("ebook");
  const ownership=useQuery<ShopPurchase[]>({queryKey:["ministry-shop-purchases",user?.uid],enabled:!!user && !!emailVerified && !!price?.audioEditionId && !isAndroidReader(),queryFn:async()=>{
    const token=await getIdToken();if(!token)throw new Error("Sign in to view purchases.");return shopRequest("/api/ministry-shop/purchases",token);
  }});
  const {ownedBook,ownedAudio}=audioOwnership(productId,price?.audioEditionId,ownership.data);
  const purchaseKind=ownedBook ? "audio" : choice;
  const selectedPrice = price && {...price,amount:purchaseKind === "audio" ? price.audioAmount ?? price.amount : purchaseKind === "read-listen" ? price.readListenAmount ?? price.amount : price.amount};
  const purchase = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token || !price || !accepted || isAndroidReader()) throw new Error("Checkout is unavailable.");
      return shopRequest<{checkoutUrl?: string; purchaseUrl?: string}>("/api/ministry-shop/checkout", token, {
        productId, country: price.country, amount: selectedPrice!.amount, currency: price.currency, acceptedDownloadPolicy: accepted, purchaseKind, ...(ownedBook ? {bookSessionId:ownedBook.sessionId}:{}),
      });
    },
    onSuccess: result => {
      const target = result.checkoutUrl ?? result.purchaseUrl;
      if (target) window.location.assign(target);
    },
  });

  if (isAndroidReader()) return <p className="mt-4 text-sm text-muted-foreground">{tx("Browse the collection here. Your completed purchases are available in Shop purchases.")}</p>;
  if (!price?.ready) return <p className="mt-4 text-sm text-muted-foreground">{tx("Checkout is currently unavailable for this item in your currency.")}</p>;
  const currencyNotice = price.usdFallback && <p className="text-sm text-muted-foreground">{tx("Your card will be charged in US dollars. Your bank may charge a currency conversion fee.")}</p>;
  if (!user || !emailVerified) return (
    <div className="mt-4 space-y-2">
      {currencyNotice}
      <Button asChild><Link href={`/signin?return=${encodeURIComponent(`/shop/${productId}`)}`}>{user ? tx("Verify email to buy") : tx("Sign in to buy")}</Link></Button>
    </div>
  );
  return (
    <div className="mt-5 space-y-3">
      {currencyNotice}
      {ownedBook ? <div className="space-y-2 rounded-lg border p-3"><p className="text-sm font-semibold">{tx("You already own this book.")}</p><Button asChild variant="outline"><Link href={`/shop/read/${ownedBook.readerEditionId}`}>{ownedAudio?tx("Read and listen"):tx("Read your book")}</Link></Button>{!ownedAudio && <p className="text-sm">{tx("Add the audiobook for")} {formatShopPrice({...price,amount:price.audioAmount!})} {tx("once.")}</p>}</div> : price.audioAmount && price.readListenAmount && <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 font-semibold">{tx("Choose your edition")}</legend>
        {(["ebook","read-listen"] as const).map(kind=><label key={kind} className="flex items-center gap-2 text-sm"><input type="radio" name={`shop-edition-${productId}`} value={kind} checked={choice===kind} onChange={()=>{setChoice(kind);setAccepted(false);}} />{kind==="ebook"?tx("Read — eBook"):tx("Read + Listen")} · {formatShopPrice({...price,amount:kind==="read-listen"?price.readListenAmount!:price.amount})}</label>)}
      </fieldset>}
      {price.audioAmount && <p className="text-xs text-muted-foreground">{tx("Audiobook: digitally narrated in English, US male voice. One payment, repeat listening in your account. No monthly subscription.")}</p>}
      {!(ownedBook && ownedAudio) && <>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input className="mt-1" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
        {purchaseKind === "audio" ? tx("I understand this is an in-app audiobook upgrade for a book I already purchased, using this same account.") : purchaseKind === "read-listen" ? tx("I understand that my PDF download window is two hours from payment. Audiobook listening has no two-hour limit.") : tx("I understand that my download window is two hours from payment.")}
      </label>
      <Button disabled={!accepted || purchase.isPending || ownership.isLoading} onClick={() => purchase.mutate()}>
        {purchase.isPending ? tx("Opening Stripe…") : tx(ownedBook ? "Add audiobook for {price}" : "Buy for {price}", {price: formatShopPrice(selectedPrice!)})}
      </Button>
      {purchase.error && <p role="alert" className="text-sm text-destructive">{purchase.error.message}</p>}
      </>}
    </div>
  );
}

type ShopPurchase = { productId:string; readerEditionId?:string; purchaseKind?:string; sessionId: string; title: string; status: string; downloadExpiresAt: string | null };

export function MinistryShopPurchases() {
  useI18n();
  const { user, loading } = useUser();
  const returnTo = window.location.pathname + window.location.search;
  const returnedSession = new URLSearchParams(window.location.search).get("session_id");

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">{tx("← Back to 365 Ministry Shop")}</Link>
      <h1 className="font-serif text-3xl font-bold">{tx("Shop purchases")}</h1>
      {loading ? <p>{tx("Loading account…")}</p> : user ? (
        <ShopPurchaseList key={user.uid} uid={user.uid} returnedSession={returnedSession} />
      ) : (
        <Button asChild><Link href={`/signin?return=${encodeURIComponent(returnTo)}`}>{tx("Sign in to view purchases")}</Link></Button>
      )}
    </main>
  );
}

function ShopPurchaseList({ uid, returnedSession }: { uid: string; returnedSession: string | null }) {
  useI18n();
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
      {purchases.isLoading && <p>{tx("Loading purchases…")}</p>}
      {purchases.error && <p role="alert">{purchases.error.message}</p>}
      {purchases.data && !returnedOrder && returnedSession && (
        <p className="text-muted-foreground">{tx("This order is not listed. Use the account you checked out with, or refresh purchases if you just paid.")}</p>
      )}
      {purchases.data && !visibleOrders.length && <p className="text-muted-foreground">{tx("There are no shop purchases on this account.")}</p>}
      {(purchases.error || (returnedSession && !returnedOrder && purchases.data)) && (
        <Button variant="outline" disabled={purchases.isFetching} onClick={() => void purchases.refetch()}>{tx("Refresh purchases")}</Button>
      )}
      {visibleOrders.map(order => {
        const expired = !!order.downloadExpiresAt && Date.parse(order.downloadExpiresAt) <= Date.now();
        const selected = download.variables === order.sessionId;
        return (
          <section className="space-y-3 rounded-xl border p-4" key={order.sessionId}>
            <h2 className="font-semibold">{order.title}</h2>
            {order.readerEditionId && <Button asChild><Link href={`/shop/read/${order.readerEditionId}`}>{order.purchaseKind === "audio" || order.purchaseKind === "read-listen" ? tx("Read and listen") : tx("Read book")}</Link></Button>}
            {order.purchaseKind === "audio" ? <p className="text-sm text-muted-foreground">{tx("Audiobook access stays in this account. Open the reader to listen.")}</p> : expired ? <p className="text-sm text-muted-foreground">{tx("Your two-hour download window has ended.")}</p> : (
              <>
                {order.status === "pending" && <p className="text-sm text-muted-foreground">{tx("If you just paid, check your payment to get your files.")}</p>}
                <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate(order.sessionId)}>
                  {selected && download.isPending ? tx("Checking payment…") : tx("Get download links")}
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

export function GoldSandboxCheckout() {
  const { user, getIdToken } = useUser();
  const [accepted, setAccepted] = useState(false);
  const availability = useQuery({
    queryKey: ["gold-sandbox-availability"],
    queryFn: () => shopRequest<{enabled:boolean;sandbox:boolean}>("/api/spirittone-gold/availability"),
    enabled: !isAndroidReader(),
  });
  const action = useMutation({
    mutationFn: async (mode: "checkout" | "cancel") => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to manage membership.");
      return shopRequest<{url?:string; cancelAtPeriodEnd?:boolean}>(`/api/spirittone-gold/${mode}`,token,
        mode === "checkout" ? {acceptedMonthlyPrice:accepted} : {});
    },
    onSuccess: result => { if (result.url) window.location.assign(result.url); },
  });
  if (!availability.data?.enabled) return null;
  if (!user) return <Link href="/signin?return=%2Fshop%2FsOkZu">Sign in to join SpiritTone Gold</Link>;
  return <section className="mt-4 space-y-3">
    <label className="flex items-center gap-2"><input type="checkbox" checked={accepted}
      onChange={e=>setAccepted(e.target.checked)} />{availability.data.sandbox ? "Test a $4.99 monthly membership in the sandbox" : "I agree to pay $4.99 each month until I cancel."}</label>
    <Button disabled={!accepted || action.isPending} onClick={()=>action.mutate("checkout")}>{availability.data.sandbox ? "Open sandbox checkout" : "Join SpiritTone Gold"}</Button>
    <Button variant="outline" disabled={action.isPending} onClick={()=>action.mutate("cancel")}>Cancel renewal</Button>
    {action.error && <p role="alert">{action.error.message}</p>}
    {action.data?.cancelAtPeriodEnd && <p role="status">Renewal canceled. Your current paid period continues.</p>}
  </section>;
}

type GoldLibrary = {
  period: { invoice_id:string; ends_at:string; used:number } | null;
  songs: { id:string; title:string; owned:boolean }[];
};

export function GoldMemberDownloads() {
  const {user,getIdToken} = useUser();
  const [songs,setSongs] = useState<string[]>([]);
  const [request,setRequest] = useState(()=>crypto.randomUUID());
  const library = useQuery({
    queryKey:["gold-download-library",user?.uid], enabled:!!user,
    queryFn:async()=>{
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to view your songs.");
      return shopRequest<GoldLibrary>("/api/spirittone-gold/library",token);
    },
  });
  const claim = useMutation({
    mutationFn:async()=>{
      const token = await getIdToken();
      if (!token || !library.data?.period) throw new Error("Sign in to your membership.");
      return shopRequest<{files:{id:string;title:string;url:string}[]}>("/api/spirittone-gold/select",token,
        {invoice:library.data.period.invoice_id,request,songs});
    },
    onSuccess:()=>{void library.refetch();},
  });
  const period = library.data?.period;
  if (!period) return null;
  return <section className="mt-5 space-y-3">
    <h2 className="text-lg font-bold">Your Gold downloads</h2>
    <p>{2-period.used} of 2 sets remaining through {new Date(period.ends_at).toLocaleDateString()}.</p>
    {claim.data ? <><ul>{claim.data.files.map(f=><li key={f.id}><a className="underline" href={f.url}>Download {f.title}</a></li>)}</ul>
      {period.used < 2 && <Button onClick={()=>{claim.reset();setSongs([]);setRequest(crypto.randomUUID());}}>Choose another set</Button>}</>
      : period.used < 2 && <fieldset disabled={claim.isPending}><legend>Choose five songs</legend>
        {library.data?.songs.map(song=><label className="flex items-center gap-2 py-1" key={song.id}>
          <input type="checkbox" checked={songs.includes(song.id)} disabled={songs.length===5 && !songs.includes(song.id)}
            onChange={e=>{setSongs(e.target.checked?[...songs,song.id]:songs.filter(id=>id!==song.id));setRequest(crypto.randomUUID());}}/>
          {song.title}{song.owned && " (already owned)"}</label>)}
        <Button disabled={songs.length!==5 || claim.isPending} onClick={()=>claim.mutate()}>Confirm five songs</Button></fieldset>}
    {claim.error && <p role="alert">{claim.error.message}</p>}
  </section>;
}
