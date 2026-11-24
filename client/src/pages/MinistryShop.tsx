import { EnglishLyrics } from "@/components/EnglishLyrics";
import { christmasPreview } from "@shared/christmas-2026-releases";
import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import { isAndroidReader } from "@/lib/android-reader";
import SpiritToneTimedPreview from "@/components/SpiritToneTimedPreview";
import { songLanguageCategories } from "@shared/song-languages";
import { createContext, useContext, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, Headphones, Music2, Search, ShoppingBag, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoldMemberDownloads, GoldSandboxCheckout, formatShopPrice, MinistryShopPurchases, ShopCheckout, useShopPrices } from "@/components/MinistryShopCheckout";
import { useUser } from "@/contexts/UserContext";
import { isMinistryShopAdminEmail } from "@shared/ministry-shop-access";
import staticCatalog from "@/data/ministry-shop-catalog.json";
type CatalogProduct = (typeof staticCatalog)[number] & { artworkUrl?: string; description?: string; author?: string; lyrics?: string; previewTitle?: string; previewText?: string; previewEnding?: string };
const CatalogContext = createContext<CatalogProduct[]>(staticCatalog);
import bookPreviewData from "@/data/ministry-shop-book-previews.json";

const bookPreviews: Record<string, { section: string; quote?: string; excerpt: string; exercise?: string }> = bookPreviewData;
const audioPreviews = import.meta.glob<string>("/src/assets/shop-previews/*.mp3", {
  eager: true, import: "default", query: "?url",
});

const filters = ["All", "Book", "Music", "Membership"] as const;
const icons = { Book: BookOpen, Music: Headphones, Membership: Sparkles };

const viewKey = ["/api/ministry-shop/views"] as const;
type ShopProduct = CatalogProduct;
type ShopMusicMetadata = { language: string; genre: string; songType: string };
type ShopArtworkResponse = {
  artwork: Record<string, string>;
  metadata: Record<string, ShopMusicMetadata>;
};

// Keep both music sources visible instead of putting all newly added weekly
// songs after the existing Payhip catalog. Stable order avoids layout jumping.
function mixMusicSources(products: ShopProduct[]): ShopProduct[] {
  const older = products.filter(product => !("spiritToneSlug" in product));
  const weekly = products.filter(product => "spiritToneSlug" in product);
  const mixed: ShopProduct[] = [];
  for (let i = 0; i < Math.max(older.length, weekly.length); i++) {
    if (i < older.length) mixed.push(older[i]);
    if (i < weekly.length) mixed.push(weekly[i]);
  }
  return mixed;
}


function ProductViews({ total }: { total?: number }) {
  useI18n();
  if (total === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Eye size={13} aria-hidden="true" /> {total.toLocaleString()} {total === 1 ? tx("visit") : tx("visits")}
    </span>
  );
}

function ProductArtwork({ product, detail = false, artworkUrl }: { product: CatalogProduct; detail?: boolean; artworkUrl?: string }) {
  useI18n();
  const Icon = icons[product.kind as keyof typeof icons];
  const [failed, setFailed] = useState(false);
  const slug = "spiritToneSlug" in product && typeof product.spiritToneSlug === "string" ? product.spiritToneSlug : null;
  const { data: sourceSong } = useQuery<SpiritToneSongDetails>({
    queryKey: ["spirit-tone-shop-release", slug],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/songs/by-slug/${encodeURIComponent(slug!)}`, { signal });
      if (!response.ok) throw new Error("Original artwork unavailable");
      return response.json();
    },
    enabled: detail && !!slug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const resolvedArtwork = detail && slug && sourceSong?.coverImageUrl ? sourceSong.coverImageUrl : product.artworkUrl || artworkUrl || `/shop-art/${product.id}.webp`;
  // A 404 on the placeholder may occur before the source artwork query resolves.
  // Reset fallback state when the real artwork becomes available.
  useEffect(() => { setFailed(false); }, [resolvedArtwork]);
  const detailAspect = product.kind === "Book" ? "aspect-[2/3]" : "aspect-square";
  const frame = detail
    ? `w-full max-w-md self-start justify-self-center rounded-xl ${detailAspect}`
    : "aspect-[4/3] w-full rounded-lg";

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-muted/60 text-muted-foreground ${frame}`}>
      {!failed ? (
        <img
          src={resolvedArtwork}
          alt={detail ? `${product.title} artwork` : ""}
          loading={detail ? "eager" : "lazy"}
          decoding="async"
          className={`h-full w-full ${detail || product.kind === "Book" ? "object-contain p-1.5" : "object-cover"}`}
          onError={() => setFailed(true)}
        />
      ) : "spiritToneSlug" in product ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-900 to-amber-800 p-3 text-center text-white">
          <div aria-hidden="true" className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-2 border-amber-300/40" />
          <Music2 className="mb-2 size-7 text-amber-200" aria-hidden="true" />
          <span className="line-clamp-3 break-words font-serif text-sm font-bold leading-tight sm:text-base">{product.title}</span>
          <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-200">SpiritTone Records</span>
        </div>
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


function SongPreview({ product }: { product: CatalogProduct }) {
  useI18n();
  const [selected, setSelected] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const titles = product.id === "x29Tw" ? praisePackTracks : [product.title];
  const releasePreview = "spiritToneSlug" in product && typeof product.spiritToneSlug === "string" ? christmasPreview(product.spiritToneSlug) : undefined;
  const tracks = titles.flatMap((title, index) => {
    const name = product.id === "x29Tw" ? `${product.id}-${index + 1}` : product.id;
    const src = releasePreview ?? audioPreviews[`/src/assets/shop-previews/${name}.mp3`];
    return src ? [{ title, src }] : [];
  });
  const track = tracks[selected];
  if (!track && "spiritToneSlug" in product && typeof product.spiritToneSlug === "string" &&
      "spiritToneSongId" in product && typeof product.spiritToneSongId === "number") {
    return <SpiritToneTimedPreview songId={product.spiritToneSongId} title={product.title} slug={product.spiritToneSlug} />;
  }
  if (!track) return product.lyrics ? <details className="mt-4 rounded-lg border p-4"><summary className="font-semibold">{tx("Lyrics")}</summary><p className="mt-3 whitespace-pre-wrap text-sm">{product.lyrics}</p></details> : null;

  return (
    <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label={tx("Song preview")}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Headphones size={16} aria-hidden="true" /> {releasePreview ? tx("45-second stereo preview") : tracks.length > 1 ? tx("30-second samples") : tx("30-second sample")}
      </h2>
      {tracks.length > 1 && (
        <label className="mb-3 block text-sm font-medium"> {tx("Choose a track")} <select
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
        <p role="status" className="text-sm text-muted-foreground">{tx("The sample is temporarily unavailable.")}</p>
      ) : (
        <audio
          key={track.src}
          controls
          preload="none"
          aria-label={`Play a sample of ${track.title}`}
          className="w-full"
          src={track.src}
          onError={() => setAudioFailed(true)}
        > {tx("Your browser does not support this audio player.")} </audio>
      )}
    </section>
  );
}

function ProductPreview({ product }: { product: CatalogProduct }) {
  useI18n();
  if (product.kind === "Book" && product.previewText?.trim()) {
    return (
      <section className="mt-5 rounded-xl border border-orange-200 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-orange-950/10" aria-label={tx("Book preview")}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} aria-hidden="true" /> {tx("Read a chapter sample")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tx("An excerpt from inside the book. The complete chapter is included in your purchase.")}</p>
        <details className="mt-4 text-base leading-8">
          <summary className="cursor-pointer font-semibold text-primary">{product.previewTitle || tx("Open the book preview")}</summary>
          <div className="mt-4 space-y-4 break-words">
            {product.previewText.split(/\n\n+/).map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}
            <p className="border-t pt-4 font-semibold">{product.previewEnding || tx("The chapter continues in the complete book.")}</p>
          </div>
        </details>
      </section>
    );
  }
  const book = product.kind === "Book" ? bookPreviews[product.id] : undefined;
  if (book) {
    return (
      <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4" aria-label={tx("Book preview")}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen size={16} aria-hidden="true" /> {tx("Read a sample")} </h2>
        {book.quote && <blockquote className="mt-2 border-l-2 border-orange-500 pl-3 text-base font-medium">“{book.quote}”</blockquote>}
        <details className="mt-3 text-sm leading-relaxed">
          <summary className="min-h-8 cursor-pointer font-semibold text-primary">{book.section}</summary>
          <div className="mt-2 space-y-3">
            {book.excerpt.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {book.exercise && <p><strong className="mr-1">{tx("Try this.")}</strong> {book.exercise}</p>}
          </div>
        </details>
      </section>
    );
  }

  return product.kind === "Music" ? <SongPreview product={product} /> : null;
}

type SpiritToneSongDetails = {
  title: string; slug: string; artist?: string | null; featuredArtist?: string | null;
  composer?: string | null; producer?: string | null; lyricist?: string | null; sampler?: string | null;
  labelName?: string | null; genre?: string | null; language?: string | null;
  songType?: string | null; scriptureReference?: string | null;
  coverImageUrl?: string | null;
  scriptureText?: string | null; copyrightNotice?: string | null;
  releaseYear?: number | null; lyrics?: string | null;
};

function SpiritToneReleaseDetails({ slug }: { slug: string }) {
  useI18n();
  const { data: song, isLoading } = useQuery<SpiritToneSongDetails>({
    queryKey: ["spirit-tone-shop-release", slug],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/songs/by-slug/${encodeURIComponent(slug)}`, { signal });
      if (!response.ok) throw new Error("SpiritTone release information unavailable");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  if (!song || song.slug !== slug) {
    return isLoading ? <p className="mt-3 text-sm text-muted-foreground">{tx("Loading original song credits…")}</p> : null;
  }
  const credits = [
    // Song records historically mislabeled the producer as a performer.
    // Keep verified performers only; the producer appears in the correct field.
    ["Artist", song.artist && !/^(?:reverend |rev\.? |pastor )?moses afolabi$/i.test(song.artist.trim()) ? song.artist : null],
    ["Featured artist", song.featuredArtist && !/^(?:reverend |rev\.? |pastor )?moses afolabi$/i.test(song.featuredArtist.trim()) ? song.featuredArtist : null],
    ["Record label", song.labelName], ["Producer", song.producer],
    ["Composer", song.composer], ["Lyricist", song.lyricist], ["Sampler", song.sampler],
    ["Genre", song.genre], ["Language", song.language],
    ["Song type", song.songType], ["Scripture", song.scriptureReference],
    ["Release year", song.releaseYear], ["Copyright", song.copyrightNotice],
  ].filter((entry): entry is [string, string | number] => entry[1] !== null && entry[1] !== undefined && entry[1] !== "");
  return (
    <section className="mt-5 rounded-xl border border-border p-4" aria-label={tx("SpiritTone Records release details")}>
      <h2 className="text-lg font-bold">{tx("SpiritTone Records — Song information")}</h2>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {credits.map(([label, value]) => <div key={label}><dt className="font-semibold text-foreground">{label}</dt><dd className="break-words text-muted-foreground">{value}</dd></div>)}
      </dl>
      {song.scriptureText && <p className="mt-3 text-sm italic">{song.scriptureText}</p>}
      <EnglishLyrics slug={slug} />
      {song.lyrics && (
        <details className="mt-4 rounded-lg bg-muted/30 p-3">
          <summary className="cursor-pointer font-semibold">{tx("Read complete lyrics")}</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{song.lyrics}</p>
        </details>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{tx("Complete packages are provided only for recordings with verified original audio, artwork, and lyrics.")}</p>
    </section>
  );
}

function ProductDetail({ id, views, price }: { id: string; views?: Record<string, number>; price?: { amount: number; currency: string; country: string; ready: boolean } }) {
  useI18n();
  const catalog = useContext(CatalogContext);
  const product = catalog.find(item => item.id === id);
  const queryClient = useQueryClient();
  const { data: descriptions, isPending } = useQuery({
    queryKey: ["ministry-shop-descriptions"],
    queryFn: async (): Promise<Record<string, string[]>> => (await import("@/data/ministry-shop-content.json")).default,
    enabled: !!product,
    staleTime: Infinity,
    retry: false,
  });
  const description = product?.description ? product.description.split(/\n\n+/) : descriptions?.[id];
  const isSpiritTonePreview = !!product && "spiritToneSlug" in product && typeof product.spiritToneSlug === "string";
  const completePackageReady = isSpiritTonePreview && price?.ready === true;

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
        <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">{tx("← Back to 365 Ministry Shop")}</Link>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p>{product.kind === "Music"
          ? tx("The available recording is listed below. Open it to listen to the sample.")
          : tx("The Old and New Testament volumes are now listed separately.")}</p>
        <ul className="space-y-2">
          {catalog.filter(item => replacements.includes(item.id)).map(item => (
            <li key={item.id}><Link href={`/shop/${item.id}`} className="text-primary underline">{item.title}</Link></li>
          ))}
        </ul>
        <Link href="/shop/purchases" className="text-primary underline">{tx("View past shop purchases")}</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl py-3 sm:px-4 sm:py-6">
      <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">{tx("← Back to 365 Ministry Shop")}</Link>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-7">
        {product ? (
          <>
            <Helmet><title>{product.title} {tx("| 365 Ministry Shop")}</title></Helmet>
            <div className="grid gap-5 md:grid-cols-2 md:gap-8">
              <ProductArtwork key={product.id} product={product} detail />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx(product.kind)}</p>
                <h1 className="mb-2 mt-1 break-words text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-200 sm:text-3xl">{product.title}</h1>
                <ProductViews total={views?.[product.id]} />
                {price && <p className="mt-2 text-xl font-bold text-orange-800 dark:text-orange-300">{formatShopPrice(price)}</p>}
                {!price && product.sourcePrice && /^\$\d+\.\d{2}$/.test(product.sourcePrice) && (
                  <p className="mt-2 text-sm font-semibold text-orange-800 dark:text-orange-300"> {tx("US catalog reference:")} {product.sourcePrice}
                  </p>
                )}
                {isSpiritTonePreview && !completePackageReady && <p className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-300">{tx("Catalog preview · Complete purchase package being prepared")}</p>}
                <ProductPreview key={`preview-${product.id}`} product={product} />
                {isSpiritTonePreview && !completePackageReady && product.spiritToneSlug && !isAndroidReader() && (
                  <Link href={`/music/${encodeURIComponent(product.spiritToneSlug)}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">
                    {tx("View MP3 purchase options")}
                  </Link>
                )}
                {product.id === "sOkZu" && <><GoldSandboxCheckout /><GoldMemberDownloads /></>}
                {product.kind !== "Membership" && (!isSpiritTonePreview || completePackageReady) && (
                  isAndroidReader() || product.sourcePrice
                    ? <ShopCheckout key={product.id} productId={product.id} price={price} />
                    : <p className="mt-3 text-sm font-semibold text-orange-800 dark:text-orange-300">{tx("Coming soon. Pricing and downloads are being prepared.")}</p>
                )}
              </div>
            </div>
            {product.kind === "Music" && "spiritToneSlug" in product && typeof product.spiritToneSlug === "string" && (
              <SpiritToneReleaseDetails slug={product.spiritToneSlug} />
            )}
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="text-lg font-bold">{product.kind === "Book" ? tx("About this book") : product.kind === "Music" ? tx("About this release") : tx("About this membership")}</h2>
              <div className="mt-3 space-y-3 break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description?.length
                  ? description.map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)
                  : <p>{isSpiritTonePreview && !completePackageReady ? tx("Explore this SpiritTone recording and its original credits below. The downloadable package will be available after original master, artwork, and lyrics verification.") : isPending ? tx("Loading description…") : tx("The description is currently unavailable.")}</p>}
              </div>
            </div>
          </>
        ) : <h1 className="font-serif text-3xl font-bold">{tx("Product not found")}</h1>}
      </section>
    </main>
  );
}

const bookTopics: Record<string, string> = {
  littleheartsoldtestament: "Children’s Bible",
  littleheartsnewtestament: "Children’s Bible",
  praywithconfidence: "Prayer & devotion",
  OzmMJ: "Prayer & devotion",
  dfe85b71e2614bd99676e28960a1a6a0: "Prayer & devotion",
  practicingthanksgiving: "Prayer & devotion",
  tKgAC: "Family & relationships",
  "4f28ec864bd94f42a9e6730ed62cece5": "Family & relationships",
  "97b5261326284e88bb3bb0f27bc991bf": "Family & relationships",
  homeschoolingwithpurpose: "Family & relationships",
  ca1b6edd72b64b469d81956f03c4b288: "Family & relationships",
  "0183da3c54574347b827bf367643613d": "Family & relationships",
  forgivingwithwisdom: "Family & relationships",
  "58793ac4d8674b75a8133e2155be5369": "Work & stewardship",
  "350fd530b3184b79a60cf6d87aea9e22": "Work & stewardship",
  unx3y: "Personal growth",
  servantleadershipforministryteams: "Ministry leadership",
};

const seasonalRecordings = new Set(["str8b10f8f5", "stra124aabe", "strfb6b9417", "str02fec75c"]);
function shopTopic(item: CatalogProduct) {
  if (item.kind === "Book") return bookTopics[item.id] ?? "Christian living";
  if (seasonalRecordings.has(item.id) || /christmas|navidad|nativity/i.test(item.title)) return "Christmas";
  if (/instrumental/i.test(item.title)) return "Instrumentals";
  if (/reloaded|reloded|reloa?ded|remix|remaster/i.test(item.title)) return "Remixes & new versions";
  if (/shepherd|pastures|commandments|lazarus|moses|burning bush|abraham|joseph|walked on water|cloud by day|not by might|no weapon|the way, the truth/i.test(item.title)) return "Scripture songs";
  if (/praise|dance|celebration|victory|joy|bounce|groove|hosanna/i.test(item.title)) return "Praise & celebration";
  return "Worship & faith";
}

function ShopCatalog() {
  useI18n();
  const catalog = useContext(CatalogContext);
  const [, params] = useRoute("/shop/:productId");
  const { data: prices, locationResolved, retryDeviceLocation } = useShopPrices();
  const { user, emailVerified, getIdToken } = useUser();
  const canViewVisits = emailVerified && isMinistryShopAdminEmail(user?.email);
  const { data: spiritToneArt } = useQuery<ShopArtworkResponse>({
    queryKey: ["/api/ministry-shop/spirit-tone-artwork"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/ministry-shop/spirit-tone-artwork", { signal });
      if (!response.ok) throw new Error("Artwork unavailable");
      return response.json();
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });
  const { data: visitCounts } = useQuery<Record<string, number>>({
    queryKey: [...viewKey, user?.uid],
    enabled: canViewVisits,
    retry: false,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in to view product visit counts.");
      const response = await fetch(viewKey[0], {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Product visit counts are unavailable.");
      return response.json();
    },
  });
  const views = canViewVisits ? visitCounts : undefined;
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [musicLanguage, setMusicLanguage] = useState("all");
  const [musicGenre, setMusicGenre] = useState("all");
  const [musicOrder, setMusicOrder] = useState<"mixed" | "az">("mixed");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const musicMetadata = spiritToneArt?.metadata ?? {};
  const musicLanguageFor = (p: ShopProduct) =>
    "spiritToneSlug" in p ? musicMetadata[p.id]?.language || "Unspecified" : "Unspecified";
  const musicGenreFor = (p: ShopProduct) =>
    "spiritToneSlug" in p ? musicMetadata[p.id]?.genre !== "Unspecified" && musicMetadata[p.id]?.genre ? musicMetadata[p.id].genre : musicMetadata[p.id]?.songType || "Unspecified" : "Unspecified";
  const musicProducts = catalog.filter(p => p.kind === "Music" && !p.replacedBy);
  const languages = Array.from(new Set(musicProducts.flatMap(p => songLanguageCategories(musicLanguageFor(p))))).sort();
  const genres = Array.from(new Set(musicProducts.map(musicGenreFor))).sort();
  const eligibleProducts = catalog.filter(item => !item.replacedBy &&
    (filter === "All" || item.kind === filter) &&
    item.title.toLocaleLowerCase().includes(normalizedQuery) &&
    (item.kind !== "Music" || (
      (musicLanguage === "all" || songLanguageCategories(musicLanguageFor(item)).includes(musicLanguage)) &&
      (musicGenre === "all" || musicGenreFor(item) === musicGenre)
    )));
  const showTopics = filter === "Book" || filter === "Music";
  const topicCounts = new Map<string, number>();
  if (showTopics) for (const item of eligibleProducts) {
    const name = shopTopic(item);
    topicCounts.set(name, (topicCounts.get(name) ?? 0) + 1);
  }
  const topicNames = [...new Set([...topicCounts.keys(), ...(topic ? [topic] : [])])].sort((a, b) =>
    a === b ? 0 : a === "Christmas" ? -1 : b === "Christmas" ? 1 : a.localeCompare(b));
  const visibleProducts = showTopics && topic ? eligibleProducts.filter(item => shopTopic(item) === topic) : eligibleProducts;
  const nonMusic = visibleProducts.filter(item => item.kind !== "Music");
  const matchingMusic = visibleProducts.filter(item => item.kind === "Music");
  const products = [...nonMusic, ...(musicOrder === "az"
    ? [...matchingMusic].sort((a, b) => a.title.localeCompare(b.title))
    : mixMusicSources(matchingMusic))];

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
          <Link href="/shop/sOkZu" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-300 px-3 text-sm font-bold text-slate-950 hover:bg-amber-200"><Sparkles size={16} aria-hidden="true" />{tx("SpiritTone Gold membership")}</Link>
          <Link href="/shop/purchases" className="inline-flex min-h-9 items-center rounded-md px-1.5 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 hover:bg-white/10 sm:text-sm">{tx("Shop purchases")}</Link>
        </div>
        {prices && !Object.values(prices.products).some(price => price.ready) && (
          <p className="text-xs leading-tight text-orange-200">{tx("Checkout is currently unavailable.")}</p>
        )}
      </header>

      <section aria-labelledby="shop-catalog">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="shop-catalog" className="sr-only sm:not-sr-only sm:font-sans sm:text-lg sm:font-bold">{tx("Explore the catalog")}</h2>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">{tx("Search books and music")}</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={tx("Search books and music")} className="h-9 pl-9" />
          </label>
        </div>
        <div className="my-2 flex flex-wrap items-center gap-1.5" aria-label={tx("Product categories")}>
          {filters.map(value => (
            <Button type="button" key={value} size="sm" className="px-2.5 text-xs sm:text-sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => { setFilter(value); setTopic(""); }}>
              {value === "Book" ? tx("Books") : tx(value)}
            </Button>
          ))}
        </div>
        {showTopics && (
          <fieldset className="mb-3 rounded-xl border border-teal-800/20 bg-teal-50/60 px-3 pb-3 dark:bg-teal-950/25">
            <legend className="px-1 text-xs font-semibold tracking-wide text-teal-900 dark:text-teal-200">{tx(filter === "Music" ? "Music collections" : "Book topics")}</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {["", ...topicNames].map(name => (
                <button key={name} type="button" aria-pressed={topic === name} onClick={() => setTopic(name)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${topic === name
                    ? "border-teal-900 bg-teal-900 text-white dark:border-teal-300 dark:bg-teal-300 dark:text-teal-950"
                    : "border-border bg-background text-foreground hover:border-teal-500"}`}>
                  {tx(name || (filter === "Music" ? "All music" : "All books"))}
                  <span className="tabular-nums opacity-75">{name ? topicCounts.get(name) ?? 0 : eligibleProducts.length}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {(filter === "All" || filter === "Music") && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2" aria-label={tx("Music discovery filters")}>
            <label className="min-w-28 flex-1 text-xs font-semibold text-muted-foreground sm:max-w-52"> {tx("Song language")} <select value={musicLanguage} onChange={event => setMusicLanguage(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="all">{tx("All languages")}</option>
                {languages.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="min-w-28 flex-1 text-xs font-semibold text-muted-foreground sm:max-w-52"> {tx("Genre / format")} <select value={musicGenre} onChange={event => setMusicGenre(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="all">{tx("All genres and formats")}</option>
                {genres.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="min-w-28 flex-1 text-xs font-semibold text-muted-foreground sm:max-w-52"> {tx("Song order")} <select value={musicOrder} onChange={event => setMusicOrder(event.target.value as "mixed" | "az")}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="mixed">{tx("Mixed — all catalogs")}</option>
                <option value="az">{tx("Song title A–Z")}</option>
              </select>
            </label>
          </div>
        )}
        <p aria-live="polite" className="mb-2 text-xs text-muted-foreground">
          {products.length ? tx(products.length === 1 ? "{count} item" : "{count} items", {count: products.length}) : tx("No matching items. Try a different title or category.")}
        </p>
        {!isAndroidReader() && locationResolved && !prices?.country && <button type="button" className="mb-2 text-xs text-primary underline" onClick={retryDeviceLocation}>{tx("Refresh local pricing")}</button>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {products.map(product => {
            const price = prices?.products[product.id];
            return (
              <li key={product.id}>
                <Link href={`/shop/${product.id}`} className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-2.5 font-sans shadow-sm transition-colors hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-3">
                  <ProductArtwork product={product} artworkUrl={spiritToneArt?.artwork[product.id]} />
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tx(product.kind)}</p>
                  <h3 title={product.title} className="mb-2 mt-0.5 line-clamp-2 break-words text-sm font-bold leading-snug text-teal-900 dark:text-teal-200 sm:text-base">{product.title}</h3>
                  <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <div className="min-w-0 space-y-1">
                      {price
                        ? <span className="block text-sm font-bold tabular-nums text-orange-800 dark:text-orange-300">{formatShopPrice(price)}</span>
                        : /^\$\d+\.\d{2}$/.test(product.sourcePrice || "")
                          ? <span className="block text-xs font-bold text-orange-800 dark:text-orange-300">{product.sourcePrice} <span className="font-normal">{tx("(US reference)")}</span></span>
                          : null}
                      {"spiritToneSlug" in product && !price?.ready &&
                        <span className="block text-xs font-semibold text-muted-foreground">{tx("45-sec preview · View recording options")}</span>}
                    </div>
                    {!isAndroidReader() && !product.spiritToneSlug && product.requiredFileCount && !price?.ready && <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">{tx("Checkout unavailable")}</span>}
                    <ProductViews total={views?.[product.id]} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold">{tx("Have something to share?")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground"> {tx("If you create books, music, or other resources, tell us what you would like to sell through the 365 Ministry Shop. We review each proposal before accepting products.")} </p>
        <Button asChild className="mt-4">
          <Link href="/contact/partnership?source=ministry-shop">{tx("Tell us about your product")}</Link>
        </Button>
      </section>
    </main>
  );
}

export default function MinistryShop() {
  useI18n();
  const catalog = useQuery<CatalogProduct[]>({ queryKey: ["/api/ministry-shop/catalog"], staleTime: 30000 });
  const [purchases] = useRoute("/shop/purchases");
  return <CatalogContext.Provider value={catalog.data ?? staticCatalog}>{purchases ? <MinistryShopPurchases /> : <ShopCatalog />}</CatalogContext.Provider>;
}

