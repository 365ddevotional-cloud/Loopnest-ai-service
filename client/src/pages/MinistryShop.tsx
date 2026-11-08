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

function ProductViews({ total }: { total?: number }) {
  if (total === undefined) return null;
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Eye size={14} aria-hidden="true" /> {total.toLocaleString()} {total === 1 ? "visit" : "visits"}
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
    <main className="mx-auto max-w-6xl space-y-9 px-4 py-8 sm:py-12">
      <Helmet>
        <title>365 Ministry Shop | 365 Daily Devotional</title>
        <meta name="description" content="Browse books, worship music and digital resources from 365 Daily Devotional." />
      </Helmet>

      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-10 text-white sm:px-12 sm:py-14">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-orange-300">
          <ShoppingBag size={17} aria-hidden="true" /> 365 Daily Devotional
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">365 Ministry Shop</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200">
          Discover books for spiritual growth, worship music, and resources for everyday faith.
        </p>
        {prices && !Object.values(prices.products).some(price => price.ready) && (
          <p className="mt-4 text-sm text-orange-200">The catalog is open for browsing. Checkout is currently unavailable in your region.</p>
        )}
        <Link href="/shop/purchases" className="mt-5 inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Shop purchases</Link>
      </header>

      <section aria-labelledby="shop-catalog">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="shop-catalog" className="font-serif text-2xl font-semibold">Explore the catalog</h2>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search books and music</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search books and music" className="pl-9" />
          </label>
        </div>
        <div className="my-4 flex flex-wrap gap-2" aria-label="Product categories">
          {filters.map(value => (
            <Button type="button" key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === "Book" ? "Books" : value}
            </Button>
          ))}
        </div>
        <p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
          {products.length ? `${products.length} ${products.length === 1 ? "item" : "items"}` : "No matching items. Try a different title or category."}
        </p>
        {locationResolved && !prices?.country && <button type="button" className="mb-4 text-sm text-primary underline" onClick={retryDeviceLocation}>Refresh local pricing</button>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(product => {
            const Icon = icons[product.kind as keyof typeof icons];
            const price = prices?.products[product.id];
            return (
              <li key={product.id}>
                <Link href={`/shop/${product.id}`} className="group block h-full overflow-hidden rounded-2xl border border-border bg-card hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className={`grid h-24 place-items-center bg-gradient-to-br ${product.kind === "Book" ? "from-orange-100 to-amber-50 text-orange-800 dark:from-orange-950 dark:to-amber-950 dark:text-orange-200" : "from-teal-100 to-sky-50 text-teal-800 dark:from-teal-950 dark:to-slate-900 dark:text-teal-200"}`}>
                  <Icon size={34} aria-hidden="true" />
                </div>
                <div className="min-w-0 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.kind}</p>
                  <h3 className="mt-1 break-words font-semibold leading-snug">{product.title}</h3>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    {price && <span className="font-semibold text-primary">{formatMusicPrice(price.amount, price.currency)}</span>}
                    <ProductViews total={views?.[product.id]} />
                  </div>
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
