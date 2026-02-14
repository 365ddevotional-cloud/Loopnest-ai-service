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
import { Loader2, Sun, Moon, Share2 } from "lucide-react";

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
}

export function DevotionalCard({ devotional }: DevotionalCardProps) {
  const { translation } = useTranslation();
  const { fontSize } = useFontSize();
  const { resolvedTheme, setTheme } = useTheme();
  const sizeClasses = fontSizeClasses[fontSize];
  const { text: scriptureText, isLoading, isFallback } = useScriptureText(
    devotional.scriptureReference,
    devotional.scriptureText
  );

  const fullShareText = [
    `Title: ${devotional.title}`,
    `Date: ${format(parseISO(devotional.date), "MMMM d, yyyy")}`,
    ``,
    `Scripture:`,
    `"${stripRedLetterMarkers(scriptureText)}"`,
    `— ${devotional.scriptureReference}`,
    ``,
    `Devotional:`,
    devotional.content,
    ``,
    `Prayer Points:`,
    ...devotional.prayerPoints.map(p => `• ${p}`),
    ``,
    `Faith Declarations:`,
    ...devotional.faithDeclarations.map(d => `• ${d}`),
    ``,
    `Author: ${devotional.author}`,
    ``,
    `— Shared from 365 Daily Devotional App`,
  ].join('\n');

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
                <><Sun className="w-3.5 h-3.5" /> Light</>
              ) : (
                <><Moon className="w-3.5 h-3.5" /> Dark</>
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
                  Loading scripture...
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

        {/* Action Points Grid */}
        <div id="prayer-points" className="grid md:grid-cols-2 gap-6">
          {/* Prayer Points */}
          <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-card p-6 rounded-xl border border-secondary/20 dark:border-secondary/40 shadow-sm dark:shadow-lg dark:shadow-secondary/10">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-secondary mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground text-sm font-sans font-bold shadow-sm">P</span>
              Prayer Points
            </h3>
            <ul className="space-y-4">
              {devotional.prayerPoints.map((point, idx) => (
                <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed text-foreground/80 dark:text-foreground`}>
                  <span className="text-secondary mt-1 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Faith Declarations */}
          <div className="bg-gradient-to-br from-accent/15 to-accent/5 dark:from-accent/20 dark:to-card p-6 rounded-xl border border-accent/20 dark:border-accent/40 shadow-sm dark:shadow-lg dark:shadow-accent/10">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-accent-foreground dark:text-accent mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground text-sm font-sans font-bold shadow-sm">D</span>
              Prophetic Declaration
            </h3>
            <ul className="space-y-4">
              {devotional.faithDeclarations.map((decl, idx) => (
                <li key={idx} className={`flex gap-3 ${sizeClasses.list} leading-relaxed font-medium text-foreground/80 dark:text-foreground italic`}>
                  <span className="text-accent font-bold mt-1">•</span>
                  <span>"{decl}"</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center pt-8">
          <span className="text-sm text-muted-foreground font-medium tracking-wide">
            Author: {devotional.author}
          </span>
        </div>
      </div>
    </article>
  );
}
