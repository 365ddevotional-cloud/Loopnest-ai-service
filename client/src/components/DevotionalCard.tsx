import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { type DevotionalResponse } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { RedLetterScripture, stripRedLetterMarkers } from "@/components/RedLetterScripture";
import { useScriptureText } from "@/hooks/use-scripture";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFontSize } from "@/contexts/FontSizeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Loader2, Sun, Moon, Share2, Shield, Quote, Flame, Volume2, Bookmark, BookmarkCheck, PenLine, Trash2, Save } from "lucide-react";
import { useAudioReader } from "@/hooks/useAudioReader";
import { useI18n } from "@/hooks/useI18n";
import { useDevotionalAccount } from "@/hooks/useDevotionalAccount";

const fontSizeClasses = {
  "small": {
    scripture: "text-base md:text-lg",
    prose: "prose-base",
    list: "text-xs md:text-sm",
  },
  "medium": {
    scripture: "text-lg md:text-xl",
    prose: "prose-lg",
    list: "text-sm md:text-base",
  },
  "large": {
    scripture: "text-xl md:text-2xl",
    prose: "prose-xl",
    list: "text-base md:text-lg",
  },
  "extra-large": {
    scripture: "text-2xl md:text-3xl",
    prose: "prose-xl",
    list: "text-lg md:text-xl",
  },
};

interface DevotionalCardProps {
  devotional: DevotionalResponse;
  showNotes?: boolean;
}

export function DevotionalCard({ devotional, showNotes = false }: DevotionalCardProps) {
  const { translation } = useTranslation();
  const { fontSize } = useFontSize();
  const { resolvedTheme, setTheme } = useTheme();
  const audio = useAudioReader();
  const { t } = useI18n();
  const sizeClasses = fontSizeClasses[fontSize];
  const { text: scriptureText, isLoading, isFallback } = useScriptureText(
    devotional.scriptureReference,
    devotional.scriptureText
  );

  const {
    isSignedIn,
    isSaved,
    savePending,
    toggleSave,
    noteText,
    setNoteText,
    notePending,
    noteLoaded,
    saveNote,
    deleteNote,
    recordRead,
    NOTE_MAX,
  } = useDevotionalAccount(devotional.id);

  const [localNote, setLocalNote] = useState("");
  const [noteSavedMsg, setNoteSavedMsg] = useState(false);

  // Sync loaded note text to localNote for editing
  useEffect(() => {
    setLocalNote(noteText);
  }, [noteText]);

  // Record read on mount
  useEffect(() => {
    recordRead();
  }, [recordRead]);

  const faithItems = devotional.faithDeclarations || [];
  const quoteItems = devotional.christianQuotes
    ? devotional.christianQuotes.split("\n").map(q => q.trim()).filter(Boolean)
    : [];
  const propheticItems = devotional.propheticDeclaration
    ? devotional.propheticDeclaration.split("\n").map(p => p.trim()).filter(Boolean)
    : [];

  const fullShareText = [
    `${t("title")}: ${devotional.title}`,
    `${t("date")}: ${format(parseISO(devotional.date), "MMMM d, yyyy")}`,
    ``,
    `${t("scripture")}:`,
    `"${stripRedLetterMarkers(scriptureText)}"`,
    `— ${devotional.scriptureReference}`,
    ``,
    `${t("devotional")}:`,
    devotional.content,
    ``,
    `${t("prayerPoints")}:`,
    ...devotional.prayerPoints.map(p => `• ${p}`),
    ``,
    ...(faithItems.length > 0 ? [`${t("faithDeclaration")}:`, ...faithItems.map(d => `• ${d}`), ``] : []),
    ...(quoteItems.length > 0 ? [`${t("christianQuotes")}:`, ...quoteItems.map(d => `• ${d}`), ``] : []),
    ...(propheticItems.length > 0 ? [`${t("propheticDeclaration")}:`, ...propheticItems.map(d => `• ${d}`), ``] : []),
    `${t("writtenBy")} ${devotional.author}`,
    ``,
    `— ${t("sharedFrom")}`,
  ].join('\n');

  const handleSaveNote = async () => {
    await saveNote(localNote);
    setNoteSavedMsg(true);
    setTimeout(() => setNoteSavedMsg(false), 2500);
  };

  const handleDeleteNote = async () => {
    await deleteNote();
    setLocalNote("");
  };

  return (
    <article className="max-w-4xl mx-auto bg-card shadow-xl shadow-primary/10 rounded-none md:rounded-xl overflow-hidden border border-card-border">
      {/* Header Section with gradient */}
      <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-8 md:p-12 text-center border-b border-primary/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%237C3A2A%22%20fill-opacity%3D%220.03%22%2F%3E%3C%2Fsvg%3E')]" />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            <div className="inline-block px-5 py-1.5 border-2 border-primary/40 rounded-full text-xs font-bold text-primary tracking-widest uppercase bg-background/80 backdrop-blur-sm shadow-sm">
              {format(parseISO(devotional.date), "MMMM d, yyyy")}
            </div>
            <Button
              size="sm"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-full text-xs font-bold tracking-wide uppercase shadow-md"
              data-testid="button-theme-toggle-devotional"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {resolvedTheme === "dark" ? (
                <><Sun className="w-3.5 h-3.5" /> {t("lightMode")}</>
              ) : (
                <><Moon className="w-3.5 h-3.5" /> {t("darkMode")}</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const listenText = [
                  `${t("title")}: ${devotional.title}.`,
                  `${t("scripture")}: ${stripRedLetterMarkers(scriptureText)}.`,
                  `${devotional.scriptureReference}.`,
                  devotional.content,
                  `${t("prayerPoints")}:`,
                  ...devotional.prayerPoints.map(p => p + "."),
                  ...(faithItems.length > 0 ? [`${t("faithDeclaration")}:`, ...faithItems.map(d => d + ".")] : []),
                  ...(quoteItems.length > 0 ? [`${t("christianQuotes")}:`, ...quoteItems.map(d => d + ".")] : []),
                  ...(propheticItems.length > 0 ? [`${t("propheticDeclaration")}:`, ...propheticItems.map(d => d + ".")] : []),
                ].join(" ");
                audio.play(listenText, devotional.title, { devotional: true });
              }}
              className="rounded-full text-xs font-bold tracking-wide uppercase shadow-md gap-1"
              data-testid="button-listen-devotional"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {t("listen")}
            </Button>
            <Button
              size="sm"
              variant={isSaved ? "default" : "outline"}
              onClick={toggleSave}
              disabled={savePending}
              className="rounded-full text-xs font-bold tracking-wide uppercase shadow-md gap-1"
              data-testid="button-save-devotional"
              title={isSaved ? "Remove from Saved" : "Save Devotional"}
            >
              {isSaved ? (
                <><BookmarkCheck className="w-3.5 h-3.5" /> Saved</>
              ) : (
                <><Bookmark className="w-3.5 h-3.5" /> Save</>
              )}
            </Button>
            <ShareButton
              title={devotional.title}
              text={fullShareText}
              className="rounded-full text-xs font-bold tracking-wide uppercase shadow-md"
              variant="accent"
            />
          </div>
          
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {devotional.title}
          </h1>

          <div className="max-w-2xl mx-auto space-y-4">
            <p className={`font-serif ${sizeClasses.scripture} text-primary font-medium italic`}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("loadingScripture")}
                </span>
              ) : (
                <>
                  "<RedLetterScripture 
                    text={scriptureText} 
                    enabled={devotional.redLetterEnabled !== false}
                  />"
                </>
              )}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                — {devotional.scriptureReference}
              </p>
              <Badge variant="outline" className="text-xs font-bold no-default-active-elevate" data-testid="badge-translation">
                {isFallback ? "KJV" : translation}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 md:p-12 space-y-8">
        <div className={`prose prose-stone dark:prose-invert ${sizeClasses.prose} max-w-none font-serif leading-relaxed text-foreground/90 dark:text-foreground first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px]`}>
          {devotional.content.split('\n').map((paragraph, idx) => (
            paragraph.trim() && <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <Separator className="bg-primary/20 my-8" />

        {/* Prayer Points */}
        <div id="prayer-points" className="bg-gradient-to-br from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-card p-6 rounded-xl border border-secondary/20 dark:border-secondary/40 shadow-sm dark:shadow-lg dark:shadow-secondary/10" data-testid="section-prayer-points">
          <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-secondary mb-5">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground text-sm font-sans font-bold shadow-sm">P</span>
            {t("prayerPoints")}
          </h3>
          <ul className="space-y-4">
            {devotional.prayerPoints.map((point, idx) => (
              <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed text-foreground/80 dark:text-foreground`}>
                <span className="text-secondary mt-1 font-bold">{'\u2022'}</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Faith Declaration */}
        {faithItems.length > 0 && (
          <div className="faith-declaration-card bg-[#e0f2fe] dark:bg-[#1e3a8a] p-6 rounded-r-md border-l-4 border-l-[hsl(var(--accent))] border-y border-r border-sky-200 dark:border-blue-700 shadow-sm dark:shadow-lg" data-testid="section-faith-declaration">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-sky-800 dark:text-white mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-600 text-white text-sm shadow-sm">
                <Shield className="w-4 h-4" />
              </span>
              {t("faithDeclaration")}
            </h3>
            <ul className="space-y-4">
              {faithItems.map((decl, idx) => (
                <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed font-medium text-sky-900 dark:text-white italic`}>
                  <span className="text-sky-600 dark:text-sky-300 font-bold mt-1">{'\u2022'}</span>
                  <span>"{decl}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Christian Quotes */}
        {quoteItems.length > 0 && (
          <div className="christian-quotes-card bg-[#dcfce7] dark:bg-[#064e3b] p-6 rounded-r-md border-l-4 border-l-[#22c55e] border-y border-r border-green-200 dark:border-emerald-700 shadow-sm dark:shadow-lg" data-testid="section-christian-quotes">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-green-800 dark:text-white mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white text-sm shadow-sm">
                <Quote className="w-4 h-4" />
              </span>
              {t("christianQuotes")}
            </h3>
            <ul className="space-y-4">
              {quoteItems.map((quote, idx) => (
                <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed font-medium text-green-900 dark:text-white italic`}>
                  <span className="text-green-600 dark:text-green-300 font-bold mt-1">{'\u2022'}</span>
                  <span>"{quote}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prophetic Declaration */}
        {propheticItems.length > 0 && (
          <div className="prophetic-declaration-card bg-[#fef3c7] dark:bg-[#78350f] p-6 rounded-r-md border-l-4 border-l-[#f59e0b] border-y border-r border-amber-200 dark:border-amber-700 shadow-sm dark:shadow-lg" data-testid="section-prophetic-declaration">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-amber-800 dark:text-white mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-white text-sm shadow-sm">
                <Flame className="w-4 h-4" />
              </span>
              {t("propheticDeclaration")}
            </h3>
            <ul className="space-y-4">
              {propheticItems.map((decl, idx) => (
                <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed font-medium text-amber-900 dark:text-white italic`}>
                  <span className="text-amber-600 dark:text-amber-300 font-bold mt-1">{'\u2022'}</span>
                  <span>"{decl}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center pt-8">
          <span className="text-sm text-muted-foreground font-medium tracking-wide">
            {t("writtenBy")} {devotional.author}
          </span>
        </div>

        {/* Personal Notes — shown only on full devotional view */}
        {showNotes && (
          <div className="mt-4 pt-6 border-t border-border/40" data-testid="section-personal-note">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-4 h-4 text-primary/60" />
              <h3 className="font-serif text-lg font-semibold text-foreground">My Personal Note</h3>
            </div>

            {!isSignedIn ? (
              <p className="text-sm text-muted-foreground italic border border-dashed border-border/40 rounded-xl p-4">
                Sign in to save a private note for this devotional. Your notes are only visible to you.
              </p>
            ) : !noteLoaded ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={localNote}
                  onChange={e => setLocalNote(e.target.value.slice(0, NOTE_MAX))}
                  placeholder="Write your personal reflection here... (private, only you can see this)"
                  className="w-full min-h-[120px] rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  data-testid="textarea-personal-note"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground/50">{localNote.length}/{NOTE_MAX}</span>
                  <div className="flex gap-2">
                    {noteText && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDeleteNote}
                        disabled={notePending}
                        className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        data-testid="button-delete-note"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={notePending || !localNote.trim()}
                      className="text-xs gap-1"
                      data-testid="button-save-note"
                    >
                      {notePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {noteSavedMsg ? "Saved!" : "Save Note"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
