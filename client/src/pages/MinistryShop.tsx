import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, Headphones, Search, ShoppingBag, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMusicPrice } from "@shared/music-regions";
import { MinistryShopPurchases, ShopCheckout, useShopPrices } from "@/components/MinistryShopCheckout";
import catalog from "@/data/ministry-shop-catalog.json";

const filters = ["All", "Book", "Music", "Membership"] as const;
const icons = { Book: BookOpen, Music: Headphones, Membership: Sparkles };

const viewKey = ["/api/ministry-shop/views"] as const;

function ProductViews({ total, compact = false }: { total?: number; compact?: boolean }) {
  if (total === undefined) return null;
  return (
    <span className={compact ? "inline-flex items-center gap-1 text-[11px] leading-tight text-muted-foreground" : "mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"}>
      <Eye size={compact ? 12 : 14} aria-hidden="true" /> {total.toLocaleString()} {total === 1 ? "visit" : "visits"}
    </span>
  );
}

function ProductDetail({ id, views, price }: { id: string; views?: Record<string, number>; price?: { amount: number; currency: string; country: string; ready: boolean } }) {
  const product = catalog.find(item => item.id === id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!product) return;
    try {
      let browserId = localStorage.getItem("audience-browser-id");
      if (!browserId) {
        browserId = crypto.randomUUID();
        localStorage.setItem("audience-browser-id", browserId);
      }
      void fetch(`/api/ministry-shop/${encodeURIComponent(product.id)}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId }),
        keepalive: true,
      }).then(response => {
        if (response.ok) void queryClient.invalidateQueries({ queryKey: viewKey });
      }).catch(() => {});
    } catch {
      // Browsing must still work when local storage is disabled.
    }
  }, [product, queryClient]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">← Back to 365 Ministry Shop</Link>
      <section className="mt-5 rounded-3xl border border-border bg-card p-6 sm:p-10">
        {product ? (
          <>
            <Helmet><title>{product.title} | 365 Ministry Shop</title></Helmet>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{product.kind}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold">{product.title}</h1>
            <ProductViews total={views?.[product.id]} />
            {price && <p className="mt-4 text-xl font-semibold">{formatMusicPrice(price.amount, price.currency)}</p>}
            {product.kind !== "Membership" && <ShopCheckout key={product.id} productId={product.id} price={price} />}
          </>
        ) : <h1 className="font-serif text-3xl font-bold">Product not found</h1>}
      </section>
    </main>
  );
}

function ShopCatalog() {
  const [, params] = useRoute("/shop/:productId");
  const { data: prices, locationResolved, retryDeviceLocation } = useShopPrices();
  const { data: views } = useQuery<Record<string, number>>({ queryKey: viewKey, retry: false });
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const products = catalog.filter(item => (filter === "All" || item.kind === filter) &&
    item.title.toLocaleLowerCase().includes(normalizedQuery));

  if (params) return <ProductDetail id={params.productId} views={views} price={prices?.products[params.productId]} />;

  return (
    <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-5 sm:py-6">
      <Helmet>
        <title>365 Ministry Shop | 365 Daily Devotional</title>
        <meta name="description" content="Browse books, worship music and digital resources from 365 Daily Devotional." />
      </Helmet>

      <header className="rounded-xl bg-gradient-to-br from-slate-950 to-teal-950 px-3 py-2.5 text-white sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h1 className="flex items-center gap-2 font-sans text-lg font-bold tracking-tight sm:text-2xl">
            <ShoppingBag size={17} className="shrink-0 text-orange-300" aria-hidden="true" /> 365 Ministry Shop
          </h1>
          <Link href="/shop/purchases" className="inline-flex min-h-9 items-center rounded-md px-1.5 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 hover:bg-white/10 sm:text-sm">Shop purchases</Link>
        </div>
        {prices && !Object.values(prices.products).some(price => price.ready) && (
          <p className="text-xs leading-tight text-orange-200">Checkout is currently unavailable in your region.</p>
        )}
      </header>

      <section aria-labelledby="shop-catalog">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="shop-catalog" className="sr-only sm:not-sr-only sm:font-sans sm:text-lg sm:font-bold">Explore the catalog</h2>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search books and music</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search books and music" className="h-9 pl-9" />
          </label>
        </div>
        <div className="my-2 flex flex-wrap items-center gap-1.5" aria-label="Product categories">
          {filters.map(value => (
            <Button type="button" key={value} size="sm" className="px-2.5 text-xs sm:text-sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === "Book" ? "Books" : value}
            </Button>
          ))}
        </div>
        <p aria-live="polite" className="mb-2 text-xs text-muted-foreground">
          {products.length ? `${products.length} ${products.length === 1 ? "item" : "items"}` : "No matching items. Try a different title or category."}
        </p>
        {locationResolved && !prices?.country && <button type="button" className="mb-2 text-xs text-primary underline" onClick={retryDeviceLocation}>Refresh local pricing</button>}
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map(product => {
            const Icon = icons[product.kind as keyof typeof icons];
            const price = prices?.products[product.id];
            return (
              <li key={product.id}>
                <Link href={`/shop/${product.id}`} className="block h-full rounded-lg border border-border bg-card p-1.5 font-sans hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-2.5">
                  <div className={`flex h-8 items-center justify-center gap-1 rounded-md text-[10px] font-semibold sm:h-12 sm:gap-2 sm:text-xs ${product.kind === "Book" ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200" : "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200"}`}>
                    <Icon className="size-3.5 shrink-0 sm:size-5" aria-hidden="true" />
                    {product.kind}
                  </div>
                  <h3 title={product.title} className="mt-1 line-clamp-2 min-h-8 break-words text-[13px] font-bold leading-4 text-teal-900 dark:text-teal-200 sm:min-h-10 sm:text-sm sm:leading-5">{product.title}</h3>
                  <div className="mt-0.5 flex min-h-8 flex-col items-start">
                    {price && <span className="text-[13px] font-bold leading-4 tabular-nums text-orange-800 dark:text-orange-300 sm:text-sm">{formatMusicPrice(price.amount, price.currency)}</span>}
                    <ProductViews total={views?.[product.id]} compact />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold">Have something to share?</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          If you create books, music, or other resources, tell us what you would like to sell through the 365 Ministry Shop. We review each proposal before accepting products.
        </p>
        <Button asChild className="mt-4">
          <Link href="/contact/partnership?source=ministry-shop">Tell us about your product</Link>
        </Button>
      </section>
    </main>
  );
}

export default function MinistryShop() {
  const [purchases] = useRoute("/shop/purchases");
  return purchases ? <MinistryShopPurchases /> : <ShopCatalog />;
}
