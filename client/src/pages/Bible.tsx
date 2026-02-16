import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Book, BookOpen, Hash, Search, Star, Menu, Volume2 } from "lucide-react";
import { useAudioReader } from "@/hooks/useAudioReader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import { useFontSize } from "@/contexts/FontSizeContext";
import type { BibleTranslation } from "@shared/schema";

const bibleFontSizeClasses = {
  "small": "prose-base",
  "medium": "prose-lg",
  "large": "prose-xl",
  "extra-large": "prose-2xl",
};

const verseTextClasses = {
  "small": "text-sm",
  "medium": "text-base",
  "large": "text-lg",
  "extra-large": "text-xl",
};
import {
  BIBLE_BOOKS,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  getBookById,
  fetchChapter,
  saveReadingPosition,
  loadReadingPosition,
  getDefaultPosition,
  type ChapterData,
  type BiblePosition,
} from "@/lib/bible-data";
import { BibleVerseActions, getHighlightClass } from "@/components/BibleVerseActions";
import { BibleBookmarksView } from "@/components/BibleBookmarksView";
import { BibleSearchDialog } from "@/components/BibleSearchDialog";
import { getHighlight, type HighlightColor } from "@/lib/bible-storage";

export default function Bible() {
  const { translation, setTranslation } = useTranslation();
  const { fontSize } = useFontSize();
  const audio = useAudioReader();
  const [position, setPosition] = useState<BiblePosition>(() => {
    const saved = loadReadingPosition();
    if (saved) {
      return { ...saved, translation };
    }
    return { ...getDefaultPosition(), translation };
  });
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [verseHighlights, setVerseHighlights] = useState<Map<number, HighlightColor>>(new Map());
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());

  const currentBook = getBookById(position.bookId);

  useEffect(() => {
    setPosition(prev => ({ ...prev, translation }));
  }, [translation]);

  useEffect(() => {
    saveReadingPosition(position);
  }, [position]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setHighlightedVerse(null);
    verseRefs.current.clear();
  }, [position.bookId, position.chapter]);

  const scrollToVerse = useCallback((verseNum: number) => {
    setSelectedVerse(verseNum);
    
    const attemptScroll = (attempts = 0) => {
      const verseElement = verseRefs.current.get(verseNum);
      if (verseElement && scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const verseRect = verseElement.getBoundingClientRect();
          const scrollTop = verseRect.top - containerRect.top + scrollContainer.scrollTop - 80;
          scrollContainer.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
          
          setHighlightedVerse(verseNum);
          setTimeout(() => setHighlightedVerse(null), 2000);
          return;
        }
      }
      if (attempts < 15) {
        requestAnimationFrame(() => attemptScroll(attempts + 1));
      }
    };
    
    requestAnimationFrame(attemptScroll);
  }, []);

  const handleVerseChange = (verse: string) => {
    scrollToVerse(parseInt(verse, 10));
  };

  const { data: chapterData, isLoading, error } = useQuery<ChapterData | null>({
    queryKey: ["bible-chapter", position.bookId, position.chapter, translation],
    queryFn: () => fetchChapter(position.bookId, position.chapter, translation),
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

  useEffect(() => {
    if (chapterData && chapterData.verses.length > 0) {
      const highlights = new Map<number, HighlightColor>();
      for (const verse of chapterData.verses) {
        const highlight = getHighlight({ bookId: position.bookId, chapter: position.chapter, verse: verse.verse });
        if (highlight) {
          highlights.set(verse.verse, highlight.color);
        }
      }
      setVerseHighlights(highlights);

      if (pendingScrollRef.current) {
        const targetVerse = pendingScrollRef.current;
        pendingScrollRef.current = null;
        setSelectedVerse(targetVerse);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToVerse(targetVerse);
          });
        });
      } else {
        setSelectedVerse(1);
      }
    }
  }, [chapterData, position.bookId, position.chapter, scrollToVerse]);

  const handleHighlightChange = useCallback((verseNum: number, color: HighlightColor | null) => {
    setVerseHighlights(prev => {
      const next = new Map(prev);
      if (color) {
        next.set(verseNum, color);
      } else {
        next.delete(verseNum);
      }
      return next;
    });
  }, []);

  const pendingScrollRef = useRef<number | null>(null);

  const handleNavigateFromSearch = useCallback((bookId: string, chapter: number, verse: number) => {
    pendingScrollRef.current = verse;
    setPosition(prev => ({ ...prev, bookId, chapter }));
  }, []);

  const handleBookChange = (bookId: string) => {
    setPosition(prev => ({ ...prev, bookId, chapter: 1 }));
  };

  const handleChapterChange = (chapter: string) => {
    setPosition(prev => ({ ...prev, chapter: parseInt(chapter, 10) }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <div className="flex-shrink-0 px-3 py-2 border-b border-primary/10 bg-background">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="font-serif text-lg font-bold text-primary truncate" data-testid="text-bible-title">
            {currentBook?.name} {position.chapter}
          </h1>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {chapterData?.isFallback 
                ? `${TRANSLATION_LABELS[chapterData.actualTranslation as keyof typeof TRANSLATION_LABELS]}`
                : TRANSLATION_LABELS[translation]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search Bible"
              data-testid="button-bible-search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Bible menu" data-testid="button-bible-menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (chapterData?.verses) {
                      const text = chapterData.verses.map((v) => v.text).join(". ");
                      audio.play(text, `${currentBook?.name} ${position.chapter}`);
                    }
                  }}
                  disabled={!chapterData?.verses}
                  data-testid="menu-listen-chapter"
                >
                  <Volume2 className="h-4 w-4 mr-2 text-primary" />
                  Listen to Chapter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBookmarksOpen(true)} data-testid="menu-bookmarks">
                  <Star className="h-4 w-4 mr-2 text-amber-400" />
                  Bookmarked Verses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchOpen(true)} data-testid="menu-search">
                  <Search className="h-4 w-4 mr-2" />
                  Search Bible
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={position.bookId} onValueChange={handleBookChange}>
            <SelectTrigger className="w-full h-9 text-sm" data-testid="select-book">
              <Book className="h-3.5 w-3.5 mr-1.5 text-primary flex-shrink-0" />
              <SelectValue placeholder="Book" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold text-xs">Old Testament</SelectLabel>
                {OLD_TESTAMENT.map(book => (
                  <SelectItem key={book.id} value={book.id} data-testid={`book-${book.id}`}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold text-xs">New Testament</SelectLabel>
                {NEW_TESTAMENT.map(book => (
                  <SelectItem key={book.id} value={book.id} data-testid={`book-${book.id}`}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={String(position.chapter)} onValueChange={handleChapterChange}>
            <SelectTrigger className="w-full h-9 text-sm" data-testid="select-chapter">
              <SelectValue placeholder="Chapter" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {currentBook && Array.from({ length: currentBook.chapters }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} data-testid={`chapter-${i + 1}`}>
                  Ch. {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={String(selectedVerse)} 
            onValueChange={handleVerseChange}
            disabled={!chapterData || chapterData.verses.length === 0}
          >
            <SelectTrigger className="w-full h-9 text-sm" data-testid="select-verse">
              <Hash className="h-3.5 w-3.5 mr-1.5 text-primary flex-shrink-0" />
              <SelectValue placeholder="Verse" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {chapterData && chapterData.verses.map((verse) => (
                <SelectItem key={verse.verse} value={String(verse.verse)} data-testid={`verse-option-${verse.verse}`}>
                  v. {verse.verse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={translation} onValueChange={(v) => setTranslation(v as BibleTranslation)}>
            <SelectTrigger className="w-full h-9 text-sm" data-testid="select-translation">
              <BookOpen className="h-3.5 w-3.5 mr-1.5 text-primary flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KJV">KJV</SelectItem>
              <SelectItem value="WEB">WEB</SelectItem>
              <SelectItem value="ASV">ASV 1901</SelectItem>
              <SelectItem value="DRB">DRB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {chapterData?.isFallback && (
          <p className="text-xs text-amber-600 mt-1.5">{translation} unavailable for this chapter</p>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-chapter" />
          </div>
        ) : error || !chapterData ? (
          <div className="text-center py-16 px-4">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              {error instanceof Error && error.message.startsWith("bible_still_syncing")
                ? "Bible Still Syncing"
                : "Unable to Load Chapter"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error && error.message.startsWith("bible_still_syncing")
                ? `The Bible is still being downloaded for offline use (${error.message.split(":")[1] || "0"} chapters saved so far). Please try again shortly.`
                : `This chapter may not be available in ${TRANSLATION_LABELS[translation]}. Try selecting KJV or another translation.`}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollRef}>
            <motion.div
              key={`${position.bookId}-${position.chapter}-${translation}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-4 md:p-6"
            >
              <div className={`prose prose-stone ${bibleFontSizeClasses[fontSize]} max-w-none`}>
                {chapterData.verses.map((verse) => {
                  const userHighlight = verseHighlights.get(verse.verse);
                  const highlightClass = getHighlightClass(userHighlight || null);
                  return (
                    <p 
                      key={verse.verse} 
                      ref={(el) => {
                        if (el) verseRefs.current.set(verse.verse, el);
                      }}
                      className={`group mb-3 leading-relaxed transition-all duration-500 rounded-md px-2 -mx-2 ${
                        highlightedVerse === verse.verse 
                          ? 'bg-primary/15 ring-2 ring-primary/30' 
                          : highlightClass
                      }`}
                      data-testid={`verse-${verse.verse}`}
                    >
                      <sup className="text-primary font-bold mr-1 text-sm">{verse.verse}</sup>
                      <span className={`font-serif text-foreground/90 ${verseTextClasses[fontSize]}`}>{verse.text}</span>
                      <BibleVerseActions
                        bookId={position.bookId}
                        chapter={position.chapter}
                        verse={verse.verse}
                        verseText={verse.text}
                        translation={translation}
                        currentHighlight={userHighlight}
                        onHighlightChange={(color) => handleHighlightChange(verse.verse, color)}
                      />
                    </p>
                  );
                })}
              </div>
              <div className="text-center text-xs text-muted-foreground pt-6 pb-4">
                <p>Scripture texts are from public domain translations.</p>
              </div>
            </motion.div>
          </ScrollArea>
        )}
      </div>

      <BibleBookmarksView
        open={bookmarksOpen}
        onOpenChange={setBookmarksOpen}
        onNavigate={handleNavigateFromSearch}
      />

      <BibleSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={handleNavigateFromSearch}
      />
    </div>
  );
}
