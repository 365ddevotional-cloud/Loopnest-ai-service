import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Loader2, Book, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
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

export default function Bible() {
  const { translation, setTranslation } = useTranslation();
  const [position, setPosition] = useState<BiblePosition>(() => {
    const saved = loadReadingPosition();
    if (saved) {
      return { ...saved, translation };
    }
    return { ...getDefaultPosition(), translation };
  });
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [position.bookId, position.chapter]);

  const { data: chapterData, isLoading, error } = useQuery<ChapterData | null>({
    queryKey: ["bible-chapter", position.bookId, position.chapter, translation],
    queryFn: () => fetchChapter(position.bookId, position.chapter, translation),
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

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
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary" data-testid="text-bible-title">
          Read the Bible
        </h1>
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
                {chapterData.verses.map((verse, index) => (
                  <p key={verse.verse} className="mb-3 leading-relaxed" data-testid={`verse-${verse.verse}`}>
                    <sup className="text-primary font-bold mr-1 text-sm">{verse.verse}</sup>
                    <span className="font-serif text-foreground/90">{verse.text}</span>
                  </p>
                ))}
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
    </div>
  );
}
