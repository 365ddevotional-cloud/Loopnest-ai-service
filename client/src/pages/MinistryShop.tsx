import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Headphones, Search, ShoppingBag, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import catalog from "@/data/ministry-shop-catalog.json";

const filters = ["All", "Book", "Music", "Membership"] as const;
const icons = { Book: BookOpen, Music: Headphones, Membership: Sparkles };

export default function MinistryShop() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const products = catalog.filter(item => (filter === "All" || item.kind === filter) &&
    item.title.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <main className="mx-auto max-w-6xl space-y-9 px-4 py-8 sm:py-12">
      <Helmet>
        <title>Ministry Shop | 365 Daily Devotional</title>
        <meta name="description" content="Browse books, worship music and digital resources from 365 Daily Devotional and SpiritTone Records." />
      </Helmet>

      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-10 text-white sm:px-12 sm:py-14">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-orange-300">
          <ShoppingBag size={17} aria-hidden="true" /> 365 Daily Devotional
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Ministry Shop</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200">
          Discover books for spiritual growth, worship music from SpiritTone Records, and resources for everyday faith.
        </p>
        <p className="mt-4 text-sm text-orange-200">Browse the catalog while we prepare purchases and downloads.</p>
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(product => {
            const Icon = icons[product.kind as keyof typeof icons];
            return (
              <li key={product.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
                <span className="rounded-xl bg-orange-500/10 p-2.5 text-orange-700 dark:text-orange-300">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.kind}</p>
                  <h3 className="mt-1 break-words font-semibold leading-snug">{product.title}</h3>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold">Have something to share?</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          If you create books, music, or other resources, tell us what you would like to sell through the Ministry Shop. We review each proposal before accepting products.
        </p>
        <Button asChild className="mt-4">
          <Link href="/contact/partnership?source=ministry-shop">Tell us about your product</Link>
        </Button>
      </section>
    </main>
  );
}
