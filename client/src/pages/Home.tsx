import { useTodayDevotional } from "@/hooks/use-devotionals";
import { DevotionalCard } from "@/components/DevotionalCard";
import { DailyBibleVerse } from "@/components/DailyBibleVerse";
import { Loader2, BookX, WifiOff } from "lucide-react";
import { GameConsoleIcon } from "@/interactive/GameConsoleIcon";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
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
    <div className="pb-12 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link href="/interactive/tap-the-promise">
          <div
            className="group cursor-pointer rounded-lg border border-border/60 bg-card px-4 py-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
            data-testid="link-tap-the-promise"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <GameConsoleIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Tap The Promise
              </span>
              <span className="text-xs text-muted-foreground ml-2">Interactive Faith Game</span>
            </div>
          </div>
        </Link>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
      >
        <DailyBibleVerse />
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      >
        <DevotionalCard devotional={devotional} />
      </motion.div>
    </div>
  );
}
