import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Book, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { BIBLE_BOOKS, getBookById, fetchChapter, type ChapterData } from "@/lib/bible-data";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";

interface SearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  matchIndex: number;
}

interface BibleSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (bookId: string, chapter: number, verse: number) => void;
}

function parseVerseReference(query: string): { bookId: string; chapter: number; verse?: number } | null {
  const patterns = [
    /^(\d?\s*[a-zA-Z]+)\s+(\d+):(\d+)$/i,
    /^(\d?\s*[a-zA-Z]+)\s+(\d+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const bookQuery = match[1].toLowerCase().replace(/\s+/g, "");
      const chapter = parseInt(match[2], 10);
      const verse = match[3] ? parseInt(match[3], 10) : undefined;
      
      const book = BIBLE_BOOKS.find(b => 
        b.id.toLowerCase() === bookQuery ||
        b.name.toLowerCase().replace(/\s+/g, "").includes(bookQuery) ||
        b.name.toLowerCase().startsWith(bookQuery)
      );
      
      if (book && chapter > 0 && chapter <= book.chapters) {
        return { bookId: book.id, chapter, verse };
      }
    }
  }
  return null;
}

export function BibleSearchDialog({ open, onOpenChange, onNavigate }: BibleSearchDialogProps) {
  const { translation } = useTranslation();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const parsedReference = useMemo(() => parseVerseReference(query.trim()), [query]);

  const { data: referenceData, isLoading: isLoadingRef } = useQuery<ChapterData | null>({
    queryKey: ["bible-search-ref", parsedReference?.bookId, parsedReference?.chapter, translation],
    queryFn: () => parsedReference ? fetchChapter(parsedReference.bookId, parsedReference.chapter, translation) : null,
    enabled: !!parsedReference && open,
    staleTime: 1000 * 60 * 30,
  });

  const searchAbortRef = useRef<boolean>(false);
  const [searchProgress, setSearchProgress] = useState("");

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    if (parsedReference) {
      return;
    }

    searchAbortRef.current = false;
    setIsSearching(true);
    setResults([]);
    setSearched(true);
    setSearchProgress("Searching...");

    const searchResults: SearchResult[] = [];
    const maxResults = 25;
    
    const popularBooks = ["MAT", "JHN", "ROM", "PSA", "PRO", "GEN", "ACT", "1CO", "EPH", "PHP", "HEB", "JAS", "1JN", "REV"];
    const booksToSearch = BIBLE_BOOKS.filter(b => popularBooks.includes(b.id));
    
    const searchChapter = async (book: typeof BIBLE_BOOKS[0], ch: number) => {
      if (searchAbortRef.current || searchResults.length >= maxResults) return;
      try {
        const chapterData = await fetchChapter(book.id, ch, translation);
        if (chapterData) {
          for (const v of chapterData.verses) {
            if (searchResults.length >= maxResults) break;
            const matchIndex = v.text.toLowerCase().indexOf(trimmedQuery);
            if (matchIndex >= 0) {
              searchResults.push({
                bookId: book.id,
                bookName: book.name,
                chapter: ch,
                verse: v.verse,
                text: v.text,
                matchIndex,
              });
            }
          }
        }
      } catch {}
    };
    
    for (const book of booksToSearch) {
      if (searchAbortRef.current || searchResults.length >= maxResults) break;
      setSearchProgress(`Searching ${book.name}...`);
      
      const concurrency = 5;
      for (let start = 1; start <= book.chapters; start += concurrency) {
        if (searchAbortRef.current || searchResults.length >= maxResults) break;
        
        const batch = [];
        for (let ch = start; ch < start + concurrency && ch <= book.chapters; ch++) {
          batch.push(searchChapter(book, ch));
        }
        await Promise.all(batch);
        setResults([...searchResults]);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setSearchProgress("");
    setResults(searchResults);
    setIsSearching(false);
  }, [query, parsedReference, translation]);

  useEffect(() => {
    return () => {
      searchAbortRef.current = true;
    };
  }, [query]);

  const handleNavigate = useCallback((bookId: string, chapter: number, verse: number) => {
    onNavigate(bookId, chapter, verse);
    onOpenChange(false);
    setQuery("");
    setResults([]);
    setSearched(false);
  }, [onNavigate, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !parsedReference) {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search the Bible
          </DialogTitle>
          <DialogDescription>
            Search by keyword or enter a verse reference (e.g., "John 3:16").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search verses or enter reference..."
                className="pl-9 pr-9"
                data-testid="input-bible-search"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!parsedReference && (
              <Button
                onClick={handleSearch}
                disabled={isSearching || query.trim().length < 2}
                data-testid="button-search-bible"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            )}
          </div>

          {parsedReference && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Reference found</Badge>
                <span className="text-sm text-muted-foreground">
                  {getBookById(parsedReference.bookId)?.name} {parsedReference.chapter}
                  {parsedReference.verse ? `:${parsedReference.verse}` : ""}
                </span>
              </div>
              
              {isLoadingRef ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : referenceData ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {(parsedReference.verse 
                      ? referenceData.verses.filter(v => v.verse === parsedReference.verse)
                      : referenceData.verses
                    ).map((verse) => (
                      <button
                        key={verse.verse}
                        onClick={() => handleNavigate(parsedReference.bookId, parsedReference.chapter, verse.verse)}
                        className="w-full text-left p-3 rounded-md bg-muted/50 hover-elevate transition-colors"
                        data-testid={`search-result-${parsedReference.bookId}-${parsedReference.chapter}-${verse.verse}`}
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            v{verse.verse}
                          </Badge>
                          <p className="text-sm text-foreground/90 line-clamp-3">
                            {verse.text}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Unable to load this reference.
                </p>
              )}
            </div>
          )}

          {!parsedReference && searched && (
            <ScrollArea className="h-[300px]">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{searchProgress || "Searching..."}</span>
                  {results.length > 0 && (
                    <span className="text-xs text-muted-foreground">Found {results.length} results so far</span>
                  )}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try a different keyword or verse reference.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Found {results.length} result{results.length !== 1 ? "s" : ""} in {TRANSLATION_LABELS[translation]}
                  </p>
                  {results.map((result, idx) => (
                    <button
                      key={`${result.bookId}-${result.chapter}-${result.verse}-${idx}`}
                      onClick={() => handleNavigate(result.bookId, result.chapter, result.verse)}
                      className="w-full text-left p-3 rounded-md bg-muted/50 hover-elevate transition-colors"
                      data-testid={`search-result-${result.bookId}-${result.chapter}-${result.verse}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {result.bookName} {result.chapter}:{result.verse}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {result.text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
