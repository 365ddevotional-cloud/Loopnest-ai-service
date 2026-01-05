import { useState, useEffect } from "react";
import { Star, ChevronRight, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getBookmarks, removeBookmark, type Bookmark } from "@/lib/bible-storage";
import { getBookById, BIBLE_BOOKS } from "@/lib/bible-data";

interface BibleBookmarksViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (bookId: string, chapter: number, verse: number) => void;
}

export function BibleBookmarksView({ open, onOpenChange, onNavigate }: BibleBookmarksViewProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Bookmark | null>(null);

  useEffect(() => {
    if (open) {
      setBookmarks(getBookmarks());
    }
  }, [open]);

  const handleDelete = (bookmark: Bookmark) => {
    removeBookmark(bookmark);
    setBookmarks(getBookmarks());
    setDeleteConfirm(null);
  };

  const handleNavigate = (bookmark: Bookmark) => {
    onNavigate(bookmark.bookId, bookmark.chapter, bookmark.verse);
    onOpenChange(false);
  };

  const groupedBookmarks = bookmarks.reduce((acc, bookmark) => {
    const bookIndex = BIBLE_BOOKS.findIndex(b => b.id === bookmark.bookId);
    if (!acc[bookmark.bookId]) {
      acc[bookmark.bookId] = { bookIndex, chapters: {} };
    }
    if (!acc[bookmark.bookId].chapters[bookmark.chapter]) {
      acc[bookmark.bookId].chapters[bookmark.chapter] = [];
    }
    acc[bookmark.bookId].chapters[bookmark.chapter].push(bookmark);
    return acc;
  }, {} as Record<string, { bookIndex: number; chapters: Record<number, Bookmark[]> }>);

  const sortedBooks = Object.entries(groupedBookmarks).sort(
    ([, a], [, b]) => a.bookIndex - b.bookIndex
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              Bookmarked Verses
            </DialogTitle>
            <DialogDescription>
              Your saved verses organized by book and chapter.
            </DialogDescription>
          </DialogHeader>
          
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bookmarked verses yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the star icon next to any verse to bookmark it.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 pr-4">
                {sortedBooks.map(([bookId, { chapters }]) => {
                  const book = getBookById(bookId);
                  return (
                    <Card key={bookId} className="p-3">
                      <h3 className="font-serif font-semibold text-foreground mb-2">
                        {book?.name || bookId}
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(chapters)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([chapter, verses]) => (
                            <div key={chapter} className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Chapter {chapter}
                              </p>
                              {verses
                                .sort((a, b) => a.verse - b.verse)
                                .map((bookmark) => (
                                  <div
                                    key={`${bookmark.chapter}:${bookmark.verse}`}
                                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50 group"
                                  >
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      v{bookmark.verse}
                                    </Badge>
                                    <p className="text-sm text-foreground/80 flex-1 line-clamp-2">
                                      {bookmark.text}
                                    </p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleNavigate(bookmark)}
                                        aria-label="Go to verse"
                                        data-testid={`bookmark-goto-${bookmark.bookId}-${bookmark.chapter}-${bookmark.verse}`}
                                      >
                                        <ChevronRight className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => setDeleteConfirm(bookmark)}
                                        aria-label="Delete bookmark"
                                        data-testid={`bookmark-delete-${bookmark.bookId}-${bookmark.chapter}-${bookmark.verse}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bookmark for {deleteConfirm && getBookById(deleteConfirm.bookId)?.name} {deleteConfirm?.chapter}:{deleteConfirm?.verse}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
