import { useState, useCallback } from "react";
import { Star, Highlighter, MessageSquare, Share2, X, Check, Type, Image, CreditCard, Smartphone, Film, HandHeart, Wallpaper, Loader2, Volume2 } from "lucide-react";
import { useAudioReader } from "@/hooks/useAudioReader";
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
import { Input } from "@/components/ui/input";
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
import type { CardTheme } from "@/share/shareCard";

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
  const audio = useAudioReader();
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

  const [shareOpen, setShareOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardTheme, setCardTheme] = useState<CardTheme>("gold");
  const [cardRecipient, setCardRecipient] = useState("");
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);
  const [prayerText, setPrayerText] = useState("");

  const shareOpts = { verseText, reference, translation };

  const handleShareFormat = useCallback(async (format: string) => {
    setShareLoading(format);
    setShareOpen(false);

    try {
      switch (format) {
        case "text": {
          const { shareAsText } = await import("@/share/shareText");
          const result = await shareAsText(shareOpts);
          if (result.success && result.method === "clipboard") {
            toast({ title: "Copied to clipboard", description: "Verse text copied" });
          }
          break;
        }
        case "image": {
          const { shareAsImage } = await import("@/share/shareImage");
          const result = await shareAsImage(shareOpts);
          if (result.success && result.method === "download") {
            toast({ title: "Image downloaded", description: "Verse card saved" });
          }
          break;
        }
        case "card": {
          setShareLoading(null);
          setCardDialogOpen(true);
          return;
        }
        case "story": {
          const { shareAsStory } = await import("@/share/shareStory");
          const result = await shareAsStory(shareOpts);
          if (result.success && result.method === "download") {
            toast({ title: "Story downloaded", description: "Ready for Instagram/TikTok" });
          }
          break;
        }
        case "gif": {
          const { shareAsGif } = await import("@/share/shareGif");
          toast({ title: "Generating animation...", description: "This may take a moment" });
          const result = await shareAsGif(shareOpts);
          if (result.success && result.method === "download") {
            toast({ title: "Animation downloaded", description: "Animated verse saved" });
          }
          break;
        }
        case "prayer": {
          const { generatePrayerVersion } = await import("@/share/sharePrayer");
          const text = generatePrayerVersion(shareOpts);
          setPrayerText(text);
          setShareLoading(null);
          setPrayerDialogOpen(true);
          return;
        }
        case "wallpaper": {
          const { shareAsWallpaper } = await import("@/share/shareWallpaper");
          const result = await shareAsWallpaper(shareOpts);
          if (result.success && result.method === "download") {
            toast({ title: "Wallpaper downloaded", description: "Phone wallpaper saved" });
          }
          break;
        }
      }
    } catch (err) {
      toast({ title: "Share failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setShareLoading(null);
    }
  }, [shareOpts, toast]);

  const handleCardShare = useCallback(async () => {
    setShareLoading("card");
    try {
      const { shareAsCard } = await import("@/share/shareCard");
      const result = await shareAsCard({
        ...shareOpts,
        theme: cardTheme,
        recipientName: cardRecipient.trim() || undefined,
      });
      if (result.success && result.method === "download") {
        toast({ title: "Card downloaded", description: "Greeting card saved" });
      }
      setCardDialogOpen(false);
      setCardRecipient("");
    } catch {
      toast({ title: "Card creation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setShareLoading(null);
    }
  }, [shareOpts, cardTheme, cardRecipient, toast]);

  const handlePrayerShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Prayer from ${reference}`, text: prayerText });
        setPrayerDialogOpen(false);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(prayerText);
    toast({ title: "Copied to clipboard", description: "Prayer text copied" });
    setPrayerDialogOpen(false);
  }, [prayerText, reference, toast]);

  const SHARE_FORMATS = [
    { id: "text", label: "Share as Text", icon: Type },
    { id: "image", label: "Share as Image", icon: Image },
    { id: "card", label: "Greeting Card", icon: CreditCard },
    { id: "story", label: "Story (9:16)", icon: Smartphone },
    { id: "gif", label: "Animated Verse", icon: Film },
    { id: "prayer", label: "Prayer Version", icon: HandHeart },
    { id: "wallpaper", label: "Wallpaper", icon: Wallpaper },
  ];

  const CARD_THEMES: { id: CardTheme; label: string; colors: string }[] = [
    { id: "light", label: "Light", colors: "bg-amber-50 dark:bg-amber-50 border-amber-200" },
    { id: "gold", label: "Gold", colors: "bg-yellow-100 dark:bg-yellow-100 border-yellow-400" },
    { id: "blue", label: "Blue", colors: "bg-blue-100 dark:bg-blue-100 border-blue-300" },
    { id: "floral", label: "Floral", colors: "bg-pink-100 dark:bg-pink-100 border-pink-300" },
  ];

  return (
    <>
      <span className="inline-flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => audio.play(verseText, `${reference}`)}
          aria-label="Listen to verse"
          data-testid={`button-listen-${verse}`}
        >
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>

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

        <Popover open={shareOpen} onOpenChange={setShareOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Share verse"
              data-testid={`button-share-${verse}`}
            >
              {shareLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1.5" align="start">
            <div className="flex flex-col gap-0.5">
              {SHARE_FORMATS.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => handleShareFormat(id)}
                  disabled={!!shareLoading}
                  data-testid={`share-${id}-${verse}`}
                >
                  {shareLoading === id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {label}
                </Button>
              ))}
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

      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Greeting Card</DialogTitle>
            <DialogDescription>Customize your verse greeting card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground italic" data-testid="text-card-verse">"{verseText}"</p>
            <p className="text-xs text-muted-foreground">{reference} ({translation})</p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CARD_THEMES.map(({ id, label, colors }) => (
                  <button
                    key={id}
                    onClick={() => setCardTheme(id)}
                    className={`rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-all ${colors} ${
                      cardTheme === id ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    data-testid={`card-theme-${id}`}
                  >
                    <span className="text-gray-800">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To (optional)</label>
              <Input
                value={cardRecipient}
                onChange={(e) => setCardRecipient(e.target.value)}
                placeholder="Recipient name"
                data-testid="input-card-recipient"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCardDialogOpen(false)}
                data-testid="button-cancel-card"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCardShare}
                disabled={!!shareLoading}
                data-testid="button-create-card"
              >
                {shareLoading === "card" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                Create Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Prayer Version</DialogTitle>
            <DialogDescription>Your verse transformed into a personal prayer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line" data-testid="text-prayer-content">{prayerText}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrayerDialogOpen(false)}
                data-testid="button-close-prayer"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handlePrayerShare}
                data-testid="button-share-prayer"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share Prayer
              </Button>
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
