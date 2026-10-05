import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, CalendarDays, HeartHandshake, Music2, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hasSeenWalkthrough";
export const REPLAY_WALKTHROUGH_EVENT = "365:replay-walkthrough";

const slides = [
  { icon: BookOpen, title: "Read today's devotional",
    description: "Begin with Scripture, the message, prayer points, and faith declarations. You can start reading without creating an account.",
    path: "/", action: "Read today's message" },
  { icon: CalendarDays, title: "Explore the Bible and archive",
    description: "Read a Bible chapter or revisit a published devotional by date whenever you need encouragement.",
    path: "/archive", action: "Browse the archive" },
  { icon: HeartHandshake, title: "Ask for prayer or counseling",
    description: "Open Prayer & Counseling to send a request. Read the form's privacy choices before submitting personal details.",
    path: "/prayer-counseling", action: "Open Prayer & Counseling" },
  { icon: Music2, title: "Listen to worship music",
    description: "Visit Music to listen to songs. Purchases and downloads use your verified account email and show the price before checkout.",
    path: "/music", action: "Explore Music" },
];

export function WalkthroughModal() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Leave direct links to purchases, requests, and other pages undisturbed.
    if (location !== "/") return;
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { return; }
    const timer = window.setTimeout(() => setIsOpen(true), 1000);
    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const replay = () => { setCurrentSlide(0); setIsOpen(true); };
    window.addEventListener(REPLAY_WALKTHROUGH_EVENT, replay);
    return () => window.removeEventListener(REPLAY_WALKTHROUGH_EVENT, replay);
  }, []);

  function close() {
    setIsOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function explore() {
    const path = slides[currentSlide].path;
    close();
    setLocation(path);
  }

  if (!isOpen) return null;
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-testid="walkthrough-overlay">
    <div role="dialog" aria-modal="true" aria-labelledby="walkthrough-title" aria-describedby="walkthrough-description"
      className="relative w-full max-w-md bg-card border border-card-border rounded-lg shadow-2xl overflow-hidden">
      <button onClick={close} aria-label="Skip quick tour"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        data-testid="button-walkthrough-skip"><X className="w-5 h-5" /></button>
      <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/15 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Quick tour · {currentSlide + 1} of {slides.length}</p>
        <h2 id="walkthrough-title" className="font-serif text-2xl font-bold text-foreground">{slide.title}</h2>
      </div>
      <div className="p-6 space-y-5">
        <p id="walkthrough-description" className="text-center text-muted-foreground leading-relaxed">{slide.description}</p>
        <div className="flex justify-center gap-2" aria-label={`Step ${currentSlide + 1} of ${slides.length}`}>
          {slides.map((_, i) => <span key={i} className={cn("w-2 h-2 rounded-full transition-all duration-300", i === currentSlide ? "bg-primary w-6" : "bg-muted-foreground/30")} />)}
        </div>
        <Button variant="outline" className="w-full" onClick={explore}>{slide.action}</Button>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={close} className="text-muted-foreground" data-testid="button-walkthrough-skip-text">Skip</Button>
          <Button onClick={() => currentSlide === slides.length - 1 ? close() : setCurrentSlide(currentSlide + 1)}
            className="gap-2" data-testid="button-walkthrough-next">
            {currentSlide === slides.length - 1 ? "Done" : "Next"}
            {currentSlide < slides.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  </div>;
}
