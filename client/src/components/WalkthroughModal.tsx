import { useState, useEffect } from "react";
import { BookOpen, Calendar, Share2, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hasSeenWalkthrough";

const slides = [
  {
    icon: BookOpen,
    title: "Welcome to 365 Daily Devotional",
    description: "Start each day with God's Word. Receive daily scripture readings, reflections, prayer points, and faith declarations to strengthen your walk with the Lord.",
  },
  {
    icon: Calendar,
    title: "Browse Devotionals by Date",
    description: "Explore our full archive of devotionals. Navigate to any date to read past reflections, or check today's devotional for fresh spiritual nourishment.",
  },
  {
    icon: Share2,
    title: "Share & Save Your Favorites",
    description: "Share devotionals with friends and family via WhatsApp, SMS, or email. Bookmark Bible verses and highlight passages that speak to your heart.",
  },
];

export function WalkthroughModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-testid="walkthrough-overlay">
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-lg shadow-2xl overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          data-testid="button-walkthrough-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/15 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">{slide.title}</h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-center text-muted-foreground leading-relaxed">
            {slide.description}
          </p>

          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === currentSlide ? "bg-primary w-6" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-muted-foreground"
              data-testid="button-walkthrough-skip-text"
            >
              Skip
            </Button>
            <Button
              onClick={handleNext}
              className="gap-2"
              data-testid="button-walkthrough-next"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
