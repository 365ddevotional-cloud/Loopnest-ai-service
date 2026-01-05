import { useState, useCallback } from "react";
import { Star, Highlighter, MessageSquare, Share2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { BibleTranslation } from "@shared/schema";
import {
  type VerseKey,
  type HighlightColor,
  type Bookmark,
  type VerseNote,
  isBookmarked,
  saveBookmark,
  removeBookmark,
  getHighlight,
  saveHighlight,
  removeHighlight,
  getNote,
  saveNote,
  removeNote,
} from "@/lib/bible-storage";
import { getBookById } from "@/lib/bible-data";

interface BibleVerseActionsProps {
  bookId: string;
  chapter: number;
  verse: number;
  verseText: string;
  translation: BibleTranslation;
  onHighlightChange?: (color: HighlightColor | null) => void;
  currentHighlight?: HighlightColor | null;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; bg: string; label: string }[] = [
  { color: "yellow", bg: "bg-yellow-200 dark:bg-yellow-900/50", label: "Yellow" },
  { color: "blue", bg: "bg-blue-200 dark:bg-blue-900/50", label: "Blue" },
  { color: "green", bg: "bg-green-200 dark:bg-green-900/50", label: "Green" },
  { color: "pink", bg: "bg-pink-200 dark:bg-pink-900/50", label: "Pink" },
];

export function BibleVerseActions({
  bookId,
  chapter,
  verse,
  verseText,
  translation,
  onHighlightChange,
  currentHighlight,
}: BibleVerseActionsProps) {
  const { toast } = useToast();
  const [isBookmarkedState, setIsBookmarkedState] = useState(() => 
    isBookmarked({ bookId, chapter, verse })
  );
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [hasNote, setHasNote] = useState(() => !!getNote({ bookId, chapter, verse }));

  const book = getBookById(bookId);
  const reference = `${book?.name || bookId} ${chapter}:${verse}`;

  const verseKey: VerseKey = { bookId, chapter, verse };

  const handleToggleBookmark = useCallback(() => {
    if (isBookmarkedState) {
      removeBookmark(verseKey);
      setIsBookmarkedState(false);
      toast({ title: "Bookmark removed", description: reference });
    } else {
      const bookmark: Bookmark = {
        ...verseKey,
        translation,
        text: verseText,
        createdAt: new Date().toISOString(),
      };
      saveBookmark(bookmark);
      setIsBookmarkedState(true);
      toast({ title: "Verse bookmarked", description: reference });
    }
  }, [isBookmarkedState, verseKey, translation, verseText, reference, toast]);

  const handleHighlight = useCallback((color: HighlightColor | null) => {
    if (color === null) {
      removeHighlight(verseKey);
      onHighlightChange?.(null);
    } else {
      saveHighlight({
        ...verseKey,
        color,
        createdAt: new Date().toISOString(),
      });
      onHighlightChange?.(color);
    }
    setHighlightOpen(false);
  }, [verseKey, onHighlightChange]);

  const handleOpenNote = useCallback(() => {
    const existingNote = getNote(verseKey);
    setNoteText(existingNote?.note || "");
    setNoteDialogOpen(true);
  }, [verseKey]);

  const handleSaveNote = useCallback(() => {
    if (noteText.trim()) {
      const note: VerseNote = {
        ...verseKey,
        note: noteText.trim(),
        updatedAt: new Date().toISOString(),
      };
      saveNote(note);
      setHasNote(true);
      toast({ title: "Note saved", description: reference });
    } else {
      removeNote(verseKey);
      setHasNote(false);
    }
    setNoteDialogOpen(false);
  }, [noteText, verseKey, reference, toast]);

  const handleDeleteNote = useCallback(() => {
    removeNote(verseKey);
    setHasNote(false);
    setNoteText("");
    setNoteDialogOpen(false);
    toast({ title: "Note deleted", description: reference });
  }, [verseKey, reference, toast]);

  const generateVerseImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 800;
    canvas.height = 500;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#4a1c40");
    gradient.addColorStop(1, "#2d1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.font = "200px serif";
    ctx.fillText('"', 30, 180);
    ctx.fillText('"', canvas.width - 120, canvas.height - 50);

    ctx.fillStyle = "#ffffff";
    ctx.font = "italic 24px Georgia, serif";
    ctx.textAlign = "center";
    
    const words = verseText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    const maxWidth = canvas.width - 100;
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 36;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 - 20;

    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
    });

    ctx.font = "bold 20px Georgia, serif";
    ctx.fillStyle = "#d4a574";
    ctx.fillText(`— ${reference} (${translation})`, canvas.width / 2, canvas.height - 80);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("365 Daily Devotional", canvas.width / 2, canvas.height - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });
  }, [verseText, reference, translation]);

  const handleShare = useCallback(async (asImage: boolean = false) => {
    const shareText = `"${verseText}"\n\n— ${reference} (${translation})\n\nShared from 365 Daily Devotional`;
    
    if (asImage) {
      const imageBlob = await generateVerseImage();
      if (imageBlob) {
        const file = new File([imageBlob], `${reference.replace(/[:\s]/g, "-")}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: reference,
              text: shareText,
              files: [file],
            });
            return;
          } catch (err) {
            if ((err as Error).name === "AbortError") return;
          }
        }
        const url = URL.createObjectURL(imageBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reference.replace(/[:\s]/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Image downloaded", description: "Verse card saved" });
        return;
      }
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: reference,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareText);
          toast({ title: "Copied to clipboard", description: "Verse text copied" });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard", description: "Verse text copied" });
    }
  }, [verseText, reference, translation, toast, generateVerseImage]);

  return (
    <>
      <span className="inline-flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleToggleBookmark}
          aria-label={isBookmarkedState ? "Remove bookmark" : "Bookmark verse"}
          data-testid={`button-bookmark-${verse}`}
        >
          <Star 
            className={`h-3.5 w-3.5 ${isBookmarkedState ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} 
          />
        </Button>

        <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Highlight verse"
              data-testid={`button-highlight-${verse}`}
            >
              <Highlighter 
                className={`h-3.5 w-3.5 ${currentHighlight ? 'text-primary' : 'text-muted-foreground'}`} 
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
                <button
                  key={color}
                  onClick={() => handleHighlight(color)}
                  className={`w-6 h-6 rounded-full ${bg} border-2 ${
                    currentHighlight === color ? 'border-foreground' : 'border-transparent'
                  } hover:scale-110 transition-transform`}
                  aria-label={`Highlight ${label}`}
                  data-testid={`highlight-color-${color}`}
                />
              ))}
              {currentHighlight && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={() => handleHighlight(null)}
                  aria-label="Remove highlight"
                  data-testid="button-remove-highlight"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleOpenNote}
          aria-label={hasNote ? "Edit note" : "Add note"}
          data-testid={`button-note-${verse}`}
        >
          <MessageSquare 
            className={`h-3.5 w-3.5 ${hasNote ? 'fill-primary/30 text-primary' : 'text-muted-foreground'}`} 
          />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Share verse"
              data-testid={`button-share-${verse}`}
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handleShare(false)}
                data-testid={`share-text-${verse}`}
              >
                Share as Text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handleShare(true)}
                data-testid={`share-image-${verse}`}
              >
                Share as Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </span>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{reference}</DialogTitle>
            <DialogDescription>Add your personal note for this verse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground italic">"{verseText}"</p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px]"
              data-testid="textarea-verse-note"
            />
            <div className="flex items-center justify-between gap-2">
              {hasNote && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteNote}
                  data-testid="button-delete-note"
                >
                  Delete Note
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNoteDialogOpen(false)}
                  data-testid="button-cancel-note"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  data-testid="button-save-note"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function getHighlightClass(color: HighlightColor | null): string {
  if (!color) return "";
  const classes: Record<HighlightColor, string> = {
    yellow: "bg-yellow-100 dark:bg-yellow-900/30",
    blue: "bg-blue-100 dark:bg-blue-900/30",
    green: "bg-green-100 dark:bg-green-900/30",
    pink: "bg-pink-100 dark:bg-pink-900/30",
  };
  return classes[color];
}
