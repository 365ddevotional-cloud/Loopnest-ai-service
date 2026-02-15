import { MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function FloatingFeedbackButton() {
  const [location, setLocation] = useLocation();

  if (location === "/contact/feedback" || location === "/admin") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="icon"
        onClick={() => setLocation("/contact/feedback")}
        className="h-12 w-12 rounded-full shadow-lg"
        title="Send Feedback"
        data-testid="button-floating-feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>
    </div>
  );
}
