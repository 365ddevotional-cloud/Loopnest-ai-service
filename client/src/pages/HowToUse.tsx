import { BookOpen, Heart, MessageCircle, Play, Gift } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

type OnboardingAction = 
  | { type: "scroll"; target: string }
  | { type: "route"; path: string; hash?: string }
  | { type: "external"; url: string };

interface OnboardingItem {
  icon: typeof BookOpen;
  title: string;
  description: string;
  action: OnboardingAction;
}

const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    icon: BookOpen,
    title: "Read the Daily Devotional",
    description: "Each day, start with a fresh, Scripture-based devotional designed to strengthen your faith and guide your walk with God.",
    action: { type: "route", path: "/" },
  },
  {
    icon: Heart,
    title: "Pray and Reflect",
    description: "Use the Prayer Points and Faith Declarations to pray intentionally and apply God's Word to your life.",
    action: { type: "route", path: "/" },
  },
  {
    icon: MessageCircle,
    title: "Submit Prayer or Counseling Requests",
    description: "Click Prayer / Counseling to share a request. You may submit anonymously, choose urgency, and receive encouragement and follow-up.",
    action: { type: "route", path: "/prayer-counseling" },
  },
  {
    icon: Play,
    title: "Watch & Listen",
    description: "Visit the YouTube section for Bible stories, prayers, worship, and seasonal songs to support your spiritual growth.",
    action: { type: "route", path: "/about" },
  },
  {
    icon: Gift,
    title: "Support This Kingdom Work",
    description: "If this ministry blesses you, you may choose to support through donations or resources in the Shop. Giving is optional and never required.",
    action: { type: "route", path: "/donate" },
  },
];

export default function HowToUse() {
  const [, setLocation] = useLocation();

  const handleItemClick = (item: OnboardingItem) => {
    const { action } = item;
    
    if (action.type === "route") {
      setLocation(action.path);
    } else if (action.type === "external") {
      window.open(action.url, "_blank", "noopener,noreferrer");
    }
  };

  const colorVariants = [
    "from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40",
    "from-secondary/15 to-secondary/5 border-secondary/20 hover:border-secondary/40",
    "from-accent/15 to-accent/5 border-accent/20 hover:border-accent/40",
    "from-primary/10 via-accent/10 to-secondary/10 border-accent/20 hover:border-accent/40",
    "from-secondary/10 via-primary/5 to-accent/10 border-primary/20 hover:border-primary/40",
  ];
  
  const iconColors = [
    "bg-primary text-primary-foreground",
    "bg-secondary text-secondary-foreground",
    "bg-accent text-accent-foreground",
    "bg-gradient-to-br from-primary to-accent text-white",
    "bg-gradient-to-br from-secondary to-primary text-white",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pb-12"
    >
      <div className="text-center mb-10">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-3" data-testid="text-how-to-use-title">
          How to Use 365 Daily Devotional
        </h1>
        <div className="decorative-divider" />
      </div>

      <div className="grid gap-4 md:gap-5 max-w-3xl mx-auto">
        {ONBOARDING_ITEMS.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            onClick={() => handleItemClick(item)}
            className={`flex gap-4 p-5 md:p-6 bg-gradient-to-br ${colorVariants[index % colorVariants.length]} rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
            data-testid={`card-how-to-use-${index}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleItemClick(item);
              }
            }}
          >
            <div className="flex-shrink-0">
              <div className={`w-11 h-11 rounded-xl ${iconColors[index % iconColors.length]} flex items-center justify-center shadow-sm`}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-foreground mb-1.5 text-lg">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
