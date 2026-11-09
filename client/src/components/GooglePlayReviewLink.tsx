import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_PLAY_URL } from "@/lib/google-play";

export function GooglePlayReviewLink() {
  return (
    <Button asChild variant="outline">
      <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
        <Star aria-hidden="true" />
        Rate us on Google Play
      </a>
    </Button>
  );
}
