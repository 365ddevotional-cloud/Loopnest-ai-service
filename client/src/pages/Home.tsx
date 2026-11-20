import { useI18n } from '@/hooks/useI18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTodayDevotional } from "@/hooks/use-devotionals";
import { DevotionalCard } from "@/components/DevotionalCard";
import { DailyBibleVerse } from "@/components/DailyBibleVerse";
import { SongOfTheWeek, SongMiniCard } from "@/components/SongOfTheWeek";
import { Loader2, BookX, WifiOff } from "lucide-react";
import { GameConsoleIcon } from "@/interactive/GameConsoleIcon";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ShopFeature } from "@/components/ShopFeature";

const languageNotice = {
  en: 'Choose Yorùbá, Hausa, Igbo or Nigerian Pidgin for today’s devotional. Tap Listen to hear it in your language.',
  yo: 'Yan èdè tí o fẹ́ fún ìfọkànsìn òní. Tẹ “Gbọ́” láti gbọ́ ọ ní èdè rẹ.',
  ha: 'Zaɓi harshen da kake so don ibadar yau. Danna “Saurara” don ka ji saƙon a harshenka.',
  ig: 'Họrọ asụsụ ị chọrọ maka ozi taa. Pịa bọtịnụ ntị ka ị nụ ozi ahụ n’asụsụ gị.',
  pcm: 'Choose the language wey you want for today message. Tap Listen make you hear am for your language.',
  es: 'Elige tu idioma para el devocional de hoy y pulsa Escuchar para oírlo.',
  fr: 'Choisissez votre langue pour la méditation du jour, puis appuyez sur Écouter.',
};
export default function Home() {
  const {lang}=useI18n();
  const { data: devotional, isLoading, error } = useTodayDevotional();

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const isOfflineNoData = error instanceof Error && error.message === "offline_no_data";

    if (isOfflineNoData) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <div className="bg-muted p-4 rounded-full mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-offline-heading">You Are Offline</h2>
          <p className="text-muted-foreground mb-6" data-testid="text-offline-message">
            Content will be available after first online visit.
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <BookX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Unable to Load</h2>
        <p className="text-muted-foreground mb-6">Something went wrong while loading today's message.</p>
        <Button onClick={() => window.location.reload()} data-testid="button-retry">Try Again</Button>
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <BookX className="w-12 h-12 text-primary/60" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-4">No Devotional for Today</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Today's message hasn't been published yet. You can explore our archive for past messages of faith and encouragement.
        </p>
        <Link href="/archive">
          <Button size="lg" className="shadow-lg shadow-primary/20">
            Browse Archive
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12 space-y-3 sm:space-y-4">
      <ShopFeature />
      <div className="grid grid-cols-2 items-start gap-2" data-testid="home-compact-tools">
      <details className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs" data-testid="home-quick-help">
        <summary className="cursor-pointer font-semibold text-foreground">New here? Quick guide</summary>
        <p className="mt-2 text-muted-foreground">Scroll to the daily message for Scripture, reflection, prayer points, and declarations. Use the menu for the Bible, past devotionals, prayer requests, and music.</p>
        <Link href="/how-to-use" className="mt-2 inline-block font-medium underline text-primary">See all tips and replay the tour</Link>
      </details>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link href="/interactive/tap-the-promise">
          <div
            className="group cursor-pointer rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            data-testid="link-tap-the-promise"
          >
            <div className="flex-shrink-0 flex items-center justify-center">
              <GameConsoleIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Tap The Promise
              </span>
              <span className="sr-only">Interactive Faith Game</span>
            </div>
          </div>
        </Link>
      </motion.div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
      >
        <DailyBibleVerse />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
      >
        <SongMiniCard />
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      >
        <aside aria-label="Devotional languages" className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          <p>{languageNotice[lang] ?? languageNotice.en}</p>
          <LanguageSwitcher />
        </aside>
        <DevotionalCard devotional={devotional} today />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
      >
        <SongOfTheWeek />
      </motion.div>
    </div>
  );
}
