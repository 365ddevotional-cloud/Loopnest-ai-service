import { BookOpen, Heart, MessageCircle, Play, Gift, Book, Menu, Archive, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

type OnboardingAction = 
  | { type: "scroll"; target: string }
  | { type: "route"; path: string; hash?: string }
  | { type: "none" };

interface OnboardingItem {
  icon: typeof BookOpen;
  title: string;
  description: string;
  note?: string;
  action: OnboardingAction;
  adminOnly?: boolean;
}

const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    icon: BookOpen,
    title: "Read the Daily Devotional",
    description: "Each day, open the Today section to read a fresh, Scripture-based devotional that automatically updates based on your local time zone. Devotionals are designed to encourage spiritual growth, prayer, and biblical understanding.",
    action: { type: "route", path: "/" },
  },
  {
    icon: Book,
    title: "Read the Bible",
    description: "Access the full Bible directly inside the app. Select Book, Chapter, and Verse. Choose from four public-domain Bible translations (KJV, WEB, ASV, DRB). Read full chapters with a clean, distraction-free layout and enjoy more reading space with simplified navigation.",
    note: "Bible translations are public domain and provided for personal study and devotion.",
    action: { type: "route", path: "/bible" },
  },
  {
    icon: Menu,
    title: "Navigate the App",
    description: "Use the menu to move between Today, Archive, Bible, YouTube, Prayer / Counseling, and other sections. When switching sections, a brief logo animation appears to provide a smooth and premium transition experience.",
    action: { type: "none" },
  },
  {
    icon: Archive,
    title: "Devotional Archive",
    description: "Browse past devotionals or view scheduled future devotionals. Users can read all published devotionals, while admins can manage present and future entries.",
    action: { type: "route", path: "/archive" },
  },
  {
    icon: Heart,
    title: "Pray and Reflect",
    description: "Each devotional includes prayer points and faith declarations to help you apply God's Word through intentional prayer and reflection.",
    action: { type: "route", path: "/" },
  },
  {
    icon: MessageCircle,
    title: "Prayer & Counseling",
    description: "Submit prayer or counseling requests directly through the app. You may submit anonymously, choose urgency level, and receive encouragement and follow-up.",
    action: { type: "route", path: "/prayer-counseling" },
  },
  {
    icon: Play,
    title: "Watch & Listen",
    description: "Visit the YouTube section for Bible stories, prayers, worship, devotionals, and seasonal faith-based content.",
    action: { type: "route", path: "/about" },
  },
  {
    icon: Gift,
    title: "Donate",
    description: "Support the mission of sharing God's Word by donating through the app. Contributions help expand access to biblical encouragement worldwide.",
    action: { type: "route", path: "/donate" },
  },
  {
    icon: Shield,
    title: "Admin Dashboard",
    description: "Authorized admins can securely log in to create devotionals, edit present and future devotionals, manage prayer requests, and maintain app content.",
    action: { type: "route", path: "/admin" },
    adminOnly: true,
  },
];

export default function HowToUse() {
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();

  const handleItemClick = (item: OnboardingItem) => {
    const { action } = item;
    
    if (action.type === "route") {
      setLocation(action.path);
    }
  };

  const colorVariants = [
    "from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40",
    "from-secondary/15 to-secondary/5 border-secondary/20 hover:border-secondary/40",
    "from-accent/15 to-accent/5 border-accent/20 hover:border-accent/40",
    "from-primary/10 via-accent/10 to-secondary/10 border-accent/20 hover:border-accent/40",
    "from-secondary/10 via-primary/5 to-accent/10 border-primary/20 hover:border-primary/40",
    "from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40",
    "from-secondary/15 to-secondary/5 border-secondary/20 hover:border-secondary/40",
    "from-accent/15 to-accent/5 border-accent/20 hover:border-accent/40",
    "from-primary/10 via-accent/10 to-secondary/10 border-accent/20 hover:border-accent/40",
  ];
  
  const iconColors = [
    "bg-primary text-primary-foreground",
    "bg-secondary text-secondary-foreground",
    "bg-accent text-accent-foreground",
    "bg-gradient-to-br from-primary to-accent text-white",
    "bg-gradient-to-br from-secondary to-primary text-white",
    "bg-primary text-primary-foreground",
    "bg-secondary text-secondary-foreground",
    "bg-accent text-accent-foreground",
    "bg-gradient-to-br from-primary to-accent text-white",
  ];

  // Filter out admin-only items for non-admin users
  const visibleItems = ONBOARDING_ITEMS.filter(item => !item.adminOnly || isAdmin);

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
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          A simple guide to growing daily in God's Word, prayer, and faith.
        </p>
        <div className="decorative-divider mt-4" />
      </div>

      <div className="grid gap-4 md:gap-5 max-w-3xl mx-auto">
        {visibleItems.map((item, index) => {
          const isClickable = item.action.type !== "none";
          
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              onClick={() => isClickable && handleItemClick(item)}
              className={`flex gap-4 p-5 md:p-6 bg-gradient-to-br ${colorVariants[index % colorVariants.length]} rounded-xl border transition-all duration-300 ${isClickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}`}
              data-testid={`card-how-to-use-${index}`}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
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
                {item.note && (
                  <p className="text-xs text-muted-foreground/70 italic mt-2">
                    {item.note}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
