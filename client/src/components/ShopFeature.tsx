import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { getShopFeature } from "@/lib/shop-feature";

type FeatureProduct = { id: string; title: string; artworkUrl?: string; image?: string; kind: string };

export function ShopFeature() {
  useI18n();
  const [now, setNow] = useState(Date.now);
  const { data: products } = useQuery<FeatureProduct[]>({
    queryKey: ["/api/ministry-shop/catalog"], staleTime: 15 * 60 * 1000,
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!products) return null;
  const feature = getShopFeature(now, new Set(products.filter(p => p.kind === "Book").map(p => p.id)));
  const book = products.find(p => p.id === feature?.id);
  if (!feature || !book) return null;
  return (
    <aside aria-label={tx("Featured book from our shop")} data-testid="home-shop-feature" className="overflow-hidden rounded-xl border border-orange-400/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-900 dark:to-orange-950/30">
      <Link href={`/shop/${book.id}`} className="group flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        {book.artworkUrl && <img src={book.artworkUrl} alt={`${book.title} book cover`} className="h-24 w-16 flex-none rounded object-contain shadow-sm sm:h-28 sm:w-[75px]" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300"><ShoppingBag className="h-3 w-3" aria-hidden="true" /> {tx("Discover our books")}</p>
          <h2 className="mt-1 line-clamp-2 font-serif text-base font-bold leading-tight text-slate-950 dark:text-orange-50 sm:text-xl">{book.title}</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700 dark:text-slate-200 sm:text-sm">{feature.message}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-orange-800 group-hover:underline dark:text-orange-300">{tx("Read a sample")} <ArrowRight className="h-3 w-3" aria-hidden="true" /></p>
        </div>
      </Link>
    </aside>
  );
}
