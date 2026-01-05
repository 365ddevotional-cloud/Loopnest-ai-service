import { Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import { BIBLE_TRANSLATIONS, type BibleTranslation } from "@shared/schema";

export function TranslationSelector() {
  const { translation, setTranslation } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          data-testid="button-translation-selector"
        >
          <Book className="h-4 w-4" />
          <span className="font-medium">{translation}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {BIBLE_TRANSLATIONS.map((t) => (
          <DropdownMenuItem
            key={t}
            onClick={() => setTranslation(t as BibleTranslation)}
            className={translation === t ? "bg-accent" : ""}
            data-testid={`menu-translation-${t}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{t}</span>
              <span className="text-xs text-muted-foreground">
                {TRANSLATION_LABELS[t as BibleTranslation]}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
