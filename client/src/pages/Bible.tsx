import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Book, ChevronLeft, ChevronRight, BookOpen, Hash, Search, Star, Menu } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import type { BibleTranslation } from "@shared/schema";
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

  const goToPreviousChapter = () => {
    if (position.chapter > 1) {
      setPosition(prev => ({ ...prev, chapter: prev.chapter - 1 }));
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === position.bookId);
      if (currentIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentIndex - 1];
        setPosition(prev => ({ ...prev, bookId: prevBook.id, chapter: prevBook.chapters }));
      }
    }
  };

  const goToNextChapter = () => {
    if (currentBook && position.chapter < currentBook.chapters) {
      setPosition(prev => ({ ...prev, chapter: prev.chapter + 1 }));
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.id === position.bookId);
      if (currentIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIndex + 1];
        setPosition(prev => ({ ...prev, bookId: nextBook.id, chapter: 1 }));
      }
    }
  };

  const canGoPrevious = position.chapter > 1 || BIBLE_BOOKS.findIndex(b => b.id === position.bookId) > 0;
  const canGoNext = (currentBook && position.chapter < currentBook.chapters) || 
    BIBLE_BOOKS.findIndex(b => b.id === position.bookId) < BIBLE_BOOKS.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-3 py-6">
        <div className="flex items-center justify-center gap-2">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary" data-testid="text-bible-title">
            Read the Bible
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search Bible"
              data-testid="button-bible-search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Bible menu" data-testid="button-bible-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Read God's Word in your preferred translation. Select a book and chapter below.
        </p>
      </div>

      <Card className="p-4 border-primary/10 bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <Select value={position.bookId} onValueChange={handleBookChange}>
              <SelectTrigger className="w-full" data-testid="select-book">
                <Book className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Select Book" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectLabel className="text-primary font-semibold">Old Testament</SelectLabel>
                  {OLD_TESTAMENT.map(book => (
                    <SelectItem key={book.id} value={book.id} data-testid={`book-${book.id}`}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-primary font-semibold">New Testament</SelectLabel>
                  {NEW_TESTAMENT.map(book => (
                    <SelectItem key={book.id} value={book.id} data-testid={`book-${book.id}`}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-28">
            <Select value={String(position.chapter)} onValueChange={handleChapterChange}>
              <SelectTrigger className="w-full" data-testid="select-chapter">
                <SelectValue placeholder="Ch" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {currentBook && Array.from({ length: currentBook.chapters }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)} data-testid={`chapter-${i + 1}`}>
                    Chapter {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-24">
            <Select 
              value={String(selectedVerse)} 
              onValueChange={handleVerseChange}
              disabled={!chapterData || chapterData.verses.length === 0}
            >
              <SelectTrigger className="w-full" data-testid="select-verse">
                <Hash className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Verse" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {chapterData && chapterData.verses.map((verse) => (
                  <SelectItem key={verse.verse} value={String(verse.verse)} data-testid={`verse-option-${verse.verse}`}>
                    Verse {verse.verse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Select value={translation} onValueChange={(v) => setTranslation(v as BibleTranslation)}>
              <SelectTrigger className="w-full" data-testid="select-translation">
                <BookOpen className="h-4 w-4 mr-2 text-primary" />
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
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousChapter}
          disabled={!canGoPrevious}
          data-testid="button-prev-chapter"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="text-center">
          <h2 className="font-serif text-lg font-semibold text-foreground" data-testid="text-current-location">
            {currentBook?.name} {position.chapter}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {chapterData?.isFallback 
                ? `${TRANSLATION_LABELS[chapterData.actualTranslation as keyof typeof TRANSLATION_LABELS]} (fallback)`
                : TRANSLATION_LABELS[translation]}
            </Badge>
            {chapterData?.isFallback && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                {translation} unavailable
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextChapter}
          disabled={!canGoNext}
          data-testid="button-next-chapter"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <Card className="border-primary/10 bg-white dark:bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-chapter" />
          </div>
        ) : error || !chapterData ? (
          <div className="text-center py-16 px-4">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              Unable to Load Chapter
            </h3>
            <p className="text-muted-foreground text-sm">
              This chapter may not be available in {TRANSLATION_LABELS[translation]}. 
              Try selecting KJV or another translation.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh]" ref={scrollRef}>
            <motion.div
              key={`${position.bookId}-${position.chapter}-${translation}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-6 md:p-8"
            >
              <div className="prose prose-stone prose-lg max-w-none">
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
                      <span className="font-serif text-foreground/90">{verse.text}</span>
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
            </motion.div>
          </ScrollArea>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousChapter}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Chapter
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextChapter}
          disabled={!canGoNext}
        >
          Next Chapter
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-primary/10">
        <p>
          Scripture texts are from public domain translations. All Bible text is read-only.
        </p>
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
