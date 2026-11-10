import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, Headphones, Search, ShoppingBag, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShopPrice, MinistryShopPurchases, ShopCheckout, useShopPrices } from "@/components/MinistryShopCheckout";
import catalog from "@/data/ministry-shop-catalog.json";
import bookPreviewData from "@/data/ministry-shop-book-previews.json";

const bookPreviews: Record<string, { section: string; quote: string; excerpt: string; exercise: string }> = bookPreviewData;
const audioPreviews = import.meta.glob<string>("/src/assets/shop-previews/*.mp3", {
  eager: true, import: "default", query: "?url",
});

const filters = ["All", "Book", "Music", "Membership"] as const;
const icons = { Book: BookOpen, Music: Headphones, Membership: Sparkles };

const viewKey = ["/api/ministry-shop/views"] as const;

function ProductViews({ total }: { total?: number }) {
  if (total === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Eye size={13} aria-hidden="true" /> {total.toLocaleString()} {total === 1 ? "visit" : "visits"}
    </span>
  );
}

function ProductArtwork({ product, detail = false }: { product: (typeof catalog)[number]; detail?: boolean }) {
  const Icon = icons[product.kind as keyof typeof icons];
  const [failed, setFailed] = useState(false);
  const detailAspect = product.kind === "Book" ? "aspect-[2/3]" : "aspect-square";
  const frame = detail
    ? `w-full max-w-md self-start justify-self-center rounded-xl ${detailAspect}`
    : "aspect-[4/3] w-full rounded-lg";

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-muted/60 text-muted-foreground ${frame}`}>
      {!failed ? (
        <img
          src={`/shop-art/${product.id}.webp`}
          alt={detail ? `${product.title} artwork` : ""}
          loading={detail ? "eager" : "lazy"}
          decoding="async"
          className={`h-full w-full ${detail || product.kind === "Book" ? "object-contain p-1.5" : "object-cover"}`}
          onError={() => setFailed(true)}
        />
      ) : <Icon className="size-9" aria-hidden="true" />}
    </div>
  );
}

const praisePackTracks = [
  "Dance for the Miracle (Remastered)",
  "Oluwa Too Sure",
  "Praise Explosion",
  "Testimonio Vibe!",
  "You Never Fail",
];

function SongPreview({ product }: { product: (typeof catalog)[number] }) {
  const [selected, setSelected] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const titles = product.id === "x29Tw" ? praisePackTracks : [product.title];
  const tracks = titles.flatMap((title, index) => {
    const name = product.id === "x29Tw" ? `${product.id}-${index + 1}` : product.id;
    const src = audioPreviews[`/src/assets/shop-previews/${name}.mp3`];
    return src ? [{ title, src }] : [];
  });
  const track = tracks[selected];
  if (!track) return null;

  return (
    <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label="Song preview">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Headphones size={16} aria-hidden="true" /> {tracks.length > 1 ? "30-second samples" : "30-second sample"}
      </h2>
      {tracks.length > 1 && (
        <label className="mb-3 block text-sm font-medium">
          Choose a track
          <select
            className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-2"
            value={selected}
            onChange={event => {
              setSelected(Number(event.target.value));
              setAudioFailed(false);
            }}
          >
            {tracks.map((item, index) => <option key={item.src} value={index}>{item.title}</option>)}
          </select>
        </label>
      )}
      {audioFailed ? (
        <p role="status" className="text-sm text-muted-foreground">The sample is temporarily unavailable.</p>
      ) : (
        <audio
          key={track.src}
          controls
          preload="none"
          aria-label={`Play a sample of ${track.title}`}
          className="w-full"
          src={track.src}
          onError={() => setAudioFailed(true)}
        >
          Your browser does not support this audio player.
        </audio>
      )}
    </section>
  );
}

function ProductPreview({ product }: { product: (typeof catalog)[number] }) {
  const book = product.kind === "Book" ? bookPreviews[product.id] : undefined;
  if (book) {
    return (
      <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label="Book preview">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen size={16} aria-hidden="true" /> Read a sample
        </h2>
        <blockquote className="mt-2 border-l-2 border-orange-500 pl-3 text-base font-medium">“{book.quote}”</blockquote>
        <details className="mt-3 text-sm leading-relaxed">
          <summary className="min-h-8 cursor-pointer font-semibold text-primary">Read the excerpt</summary>
          <div className="mt-2 space-y-2">
            <p className="font-semibold">{book.section}</p>
            <p>{book.excerpt}</p>
            <p><strong className="mr-1">Try this.</strong> {book.exercise}</p>
          </div>
        </details>
      </section>
    );
  }

  return product.kind === "Music" ? <SongPreview product={product} /> : null;
}

function ProductDetail({ id, views, price }: { id: string; views?: Record<string, number>; price?: { amount: number; currency: string; country: string; ready: boolean } }) {
  const product = catalog.find(item => item.id === id);
  const queryClient = useQueryClient();
  const { data: descriptions, isPending } = useQuery({
    queryKey: ["ministry-shop-descriptions"],
    queryFn: async (): Promise<Record<string, string[]>> => (await import("@/data/ministry-shop-content.json")).default,
    enabled: !!product,
    staleTime: Infinity,
    retry: false,
  });
  const description = descriptions?.[id];

  useEffect(() => {
    if (!product || product.replacedBy) return;
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

  const replacements = product?.replacedBy;
  if (replacements) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 py-6">
        <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">← Back to 365 Ministry Shop</Link>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p>The Old and New Testament volumes are now listed separately.</p>
        <ul className="space-y-2">
          {catalog.filter(item => replacements.includes(item.id)).map(item => (
            <li key={item.id}><Link href={`/shop/${item.id}`} className="text-primary underline">{item.title}</Link></li>
          ))}
        </ul>
        <Link href="/shop/purchases" className="text-primary underline">View past shop purchases</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl py-3 sm:px-4 sm:py-6">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">← Back to 365 Ministry Shop</Link>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-7">
        {product ? (
          <>
            <Helmet><title>{product.title} | 365 Ministry Shop</title></Helmet>
            <div className="grid gap-5 md:grid-cols-2 md:gap-8">
              <ProductArtwork key={product.id} product={product} detail />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{product.kind}</p>
                <h1 className="mb-2 mt-1 break-words text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-200 sm:text-3xl">{product.title}</h1>
                <ProductViews total={views?.[product.id]} />
                {price && <p className="mt-2 text-xl font-bold text-orange-800 dark:text-orange-300">{formatShopPrice(price)}</p>}
                <ProductPreview key={product.id} product={product} />
                {product.kind !== "Membership" && (
                  product.sourcePrice
                    ? <ShopCheckout key={product.id} productId={product.id} price={price} />
                    : <p className="mt-3 text-sm font-semibold text-orange-800 dark:text-orange-300">Coming soon. Pricing and downloads are being prepared.</p>
                )}
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="text-lg font-bold">{product.kind === "Book" ? "About this book" : product.kind === "Music" ? "About this release" : "About this membership"}</h2>
              <div className="mt-3 space-y-3 break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description?.length
                  ? description.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  : <p>{isPending ? "Loading description…" : "The description is currently unavailable."}</p>}
              </div>
            </div>
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
  const products = catalog.filter(item => !item.replacedBy && (filter === "All" || item.kind === filter) &&
    item.title.toLocaleLowerCase().includes(normalizedQuery));

  if (params) return <ProductDetail id={params.productId} views={views} price={prices?.products[params.productId]} />;

  return (
    <main className="mx-auto max-w-6xl space-y-4 py-3 sm:space-y-5 sm:px-5 sm:py-6">
      <Helmet>
        <title>365 Ministry Shop | 365 Daily Devotional</title>
        <meta name="description" content="Browse books, worship music and digital resources from 365 Daily Devotional." />
      </Helmet>

      <header className="rounded-xl bg-gradient-to-br from-slate-950 to-teal-950 px-4 py-3 text-white sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h1 className="flex items-center gap-2 font-sans text-lg font-bold tracking-tight text-white sm:text-2xl">
            <ShoppingBag size={17} className="shrink-0 text-orange-300" aria-hidden="true" /> 365 Ministry Shop
          </h1>
          <Link href="/shop/purchases" className="inline-flex min-h-9 items-center rounded-md px-1.5 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 hover:bg-white/10 sm:text-sm">Shop purchases</Link>
        </div>
        {prices && !Object.values(prices.products).some(price => price.ready) && (
          <p className="text-xs leading-tight text-orange-200">Checkout is currently unavailable.</p>
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {products.map(product => {
            const price = prices?.products[product.id];
            return (
              <li key={product.id}>
                <Link href={`/shop/${product.id}`} className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-2.5 font-sans shadow-sm transition-colors hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-3">
                  <ProductArtwork product={product} />
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{product.kind}</p>
                  <h3 title={product.title} className="mb-2 mt-0.5 line-clamp-2 break-words text-sm font-bold leading-snug text-teal-900 dark:text-teal-200 sm:text-base">{product.title}</h3>
                  <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    {price && <span className="text-sm font-bold tabular-nums text-orange-800 dark:text-orange-300">{formatShopPrice(price)}</span>}
                    {product.requiredFileCount && !price?.ready && <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">Checkout unavailable</span>}
                    <ProductViews total={views?.[product.id]} />
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
