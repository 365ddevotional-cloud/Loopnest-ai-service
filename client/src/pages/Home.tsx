import { useTodayDevotional } from "@/hooks/use-devotionals";
import { DevotionalCard } from "@/components/DevotionalCard";
import { Loader2, BookX, BookOpen, Heart, MessageCircle, Play, Gift, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useRef } from "react";

const ONBOARDING_ITEMS = [
  {
    icon: BookOpen,
    title: "Read the Daily Devotional",
    description: "Each day, start with a fresh, Scripture-based devotional designed to strengthen your faith and guide your walk with God.",
  },
  {
    icon: Heart,
    title: "Pray and Reflect",
    description: "Use the Prayer Points and Faith Declarations to pray intentionally and apply God's Word to your life.",
  },
  {
    icon: MessageCircle,
    title: "Submit Prayer or Counseling Requests",
    description: "Click Prayer / Counseling to share a request. You may submit anonymously, choose urgency, and receive encouragement and follow-up.",
  },
  {
    icon: Play,
    title: "Watch & Listen",
    description: "Visit the YouTube section for Bible stories, prayers, worship, and seasonal songs to support your spiritual growth.",
  },
  {
    icon: Gift,
    title: "Support This Kingdom Work",
    description: "If this ministry blesses you, you may choose to support through donations or resources in the Shop. Giving is optional and never required.",
  },
];

function OnboardingSection({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-12"
    >
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-2" data-testid="text-onboarding-title">
          How to Use 365 Daily Devotional
        </h2>
        <div className="w-16 h-1 bg-primary/30 mx-auto rounded-full" />
      </div>

      <div className="grid gap-4 md:gap-6">
        {ONBOARDING_ITEMS.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            className="flex gap-4 p-4 md:p-5 bg-card/50 rounded-lg border border-primary/10"
            data-testid={`card-onboarding-${index}`}
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={onContinue}
          className="gap-2"
          data-testid="button-continue-devotional"
        >
          Continue to Today's Devotional
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </motion.section>
  );
}

export default function Home() {
  const { data: devotional, isLoading, error } = useTodayDevotional();
  const devotionalRef = useRef<HTMLDivElement>(null);

  const scrollToDevotional = () => {
    devotionalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <BookX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Unable to Load</h2>
        <p className="text-muted-foreground mb-6">Something went wrong while loading today's message.</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <BookX className="w-12 h-12 text-primary/60" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-4">No Devotional for Today</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Today's message hasn't been published yet. You can explore our archive for past messages of faith and encouragement.
        </p>
        <Link href="/archive">
          <Button size="lg" className="shadow-lg shadow-primary/20">
            Browse Archive
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <OnboardingSection onContinue={scrollToDevotional} />
      
      <div ref={devotionalRef}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
          <DevotionalCard devotional={devotional} />
        </motion.div>
      </div>
    </div>
  );
}
