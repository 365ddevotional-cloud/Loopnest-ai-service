import { translateAppText as tx } from "@/utils/i18n";
import { useI18n } from "@/hooks/useI18n";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_PLAY_URL } from "@/lib/google-play";

export function GooglePlayReviewLink() {
  useI18n();
  return (
    <Button asChild variant="outline">
      <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
        <Star aria-hidden="true" /> {tx("Rate us on Google Play")} </a>
    </Button>
  );
}
