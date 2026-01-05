import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Loader2, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ShareButton";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { BiblePassage } from "@shared/schema";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getMillisecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
  return midnight.getTime() - now.getTime();
}

function selectVerseForDay(passages: BiblePassage[], localDate: string): BiblePassage | null {
  if (!passages || passages.length === 0) return null;
  
  const date = new Date(localDate + "T00:00:00");
  const dayOfYear = getDayOfYear(date);
  const year = date.getFullYear();
  
  const seed = year * 1000 + dayOfYear;
  const index = seed % passages.length;
  
  let selectedIndex = index;
  if (passages.length > 1) {
    const yesterdaySeed = seed - 1;
    const yesterdayIndex = yesterdaySeed % passages.length;
    if (selectedIndex === yesterdayIndex) {
      selectedIndex = (selectedIndex + 1) % passages.length;
    }
  }
  
  return passages[selectedIndex];
}

const fontSizeClasses = {
  "small": "text-lg md:text-xl",
  "medium": "text-xl md:text-2xl",
  "large": "text-2xl md:text-3xl",
  "extra-large": "text-3xl md:text-4xl",
};

export function DailyBibleVerse() {
  const { translation } = useTranslation();
  const { fontSize } = useFontSize();
  const [localDate, setLocalDate] = useState(getLocalDate);

  const checkDateRollover = useCallback(() => {
    const currentDate = getLocalDate();
    if (currentDate !== localDate) {
      setLocalDate(currentDate);
    }
  }, [localDate]);

  useEffect(() => {
    const msUntilMidnight = getMillisecondsUntilMidnight();
    
    const midnightTimer = setTimeout(() => {
      checkDateRollover();
    }, msUntilMidnight + 100);

    const intervalId = setInterval(checkDateRollover, 60000);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(intervalId);
    };
  }, [localDate, checkDateRollover]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkDateRollover();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkDateRollover]);

  const { data: passages, isLoading } = useQuery<BiblePassage[]>({
    queryKey: ["/api/bible-passages", translation],
    queryFn: async () => {
      const res = await fetch(`/api/bible-passages?translation=${translation}`);
      if (!res.ok) throw new Error("Failed to fetch passages");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const dailyVerse = passages ? selectVerseForDay(passages, localDate) : null;

  if (isLoading) {
    return (
      <Card className="p-6 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" data-testid="loading-daily-verse" />
        </div>
      </Card>
    );
  }

  if (!dailyVerse) {
    return null;
  }

  return (
    <Card 
      className="p-6 md:p-8 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent"
      data-testid="card-daily-verse"
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-lg font-semibold text-primary" data-testid="text-daily-verse-title">
          Daily Bible Verse
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {TRANSLATION_LABELS[translation]}
          </Badge>
          <ShareButton
            title="Daily Bible Verse"
            text={`"${dailyVerse.content}"\n\n— ${dailyVerse.reference}\n\nBible verse from ${TRANSLATION_LABELS[translation]} (Public Domain)`}
          />
        </div>
      </div>
      
      <blockquote 
        className={`font-serif ${fontSizeClasses[fontSize]} leading-relaxed text-foreground italic mb-4`}
        data-testid="text-daily-verse-content"
      >
        "{dailyVerse.content}"
      </blockquote>
      
      <div className="flex items-center justify-between">
        <p 
          className="font-serif text-base font-medium text-primary"
          data-testid="text-daily-verse-reference"
        >
          — {dailyVerse.reference}
        </p>
        <span className="text-xs text-muted-foreground">
          {new Date(localDate + "T00:00:00").toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </span>
      </div>
    </Card>
  );
}
