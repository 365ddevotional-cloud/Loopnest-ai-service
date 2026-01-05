import { Book, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
          variant="outline"
          size="sm"
          className="gap-2 border-primary/20"
          data-testid="button-translation-selector"
        >
          <Book className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Bible:</span>
          <span className="font-semibold text-primary">{translation}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-center font-semibold">
          Bible Translation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BIBLE_TRANSLATIONS.map((t) => (
          <DropdownMenuItem
            key={t}
            onClick={() => setTranslation(t as BibleTranslation)}
            className={translation === t ? "bg-primary/10" : ""}
            data-testid={`menu-translation-${t}`}
          >
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex flex-col gap-0.5">
                <span className={translation === t ? "font-semibold text-primary" : "font-medium"}>
                  {t}
                </span>
                <span className="text-xs text-muted-foreground">
                  {TRANSLATION_LABELS[t as BibleTranslation]}
                </span>
              </div>
              {translation === t && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
