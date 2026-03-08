import { useState } from "react";
import { Share2, Heart, BookOpen, X } from "lucide-react";
import { useLocation } from "wouter";

export interface PromiseTheme {
  name: string;
  gradient: string;
  glowColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

const THEMES: PromiseTheme[] = [
  {
    name: "gold",
    gradient: "from-amber-100 via-yellow-50 to-amber-200 dark:from-amber-900/60 dark:via-yellow-950/40 dark:to-amber-800/60",
    glowColor: "shadow-amber-300/50 dark:shadow-amber-500/30",
    textColor: "text-amber-950 dark:text-amber-100",
    accentColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300/60 dark:border-amber-600/40",
  },
  {
    name: "purple",
    gradient: "from-purple-100 via-violet-50 to-indigo-200 dark:from-purple-900/60 dark:via-violet-950/40 dark:to-indigo-800/60",
    glowColor: "shadow-purple-300/50 dark:shadow-purple-500/30",
    textColor: "text-purple-950 dark:text-purple-100",
    accentColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300/60 dark:border-purple-600/40",
  },
  {
    name: "blue",
    gradient: "from-sky-100 via-blue-50 to-cyan-200 dark:from-sky-900/60 dark:via-blue-950/40 dark:to-cyan-800/60",
    glowColor: "shadow-sky-300/50 dark:shadow-sky-500/30",
    textColor: "text-sky-950 dark:text-sky-100",
    accentColor: "text-sky-700 dark:text-sky-300",
    borderColor: "border-sky-300/60 dark:border-sky-600/40",
  },
  {
    name: "sunrise",
    gradient: "from-orange-100 via-rose-50 to-pink-200 dark:from-orange-900/60 dark:via-rose-950/40 dark:to-pink-800/60",
    glowColor: "shadow-orange-300/50 dark:shadow-orange-500/30",
    textColor: "text-rose-950 dark:text-rose-100",
    accentColor: "text-rose-700 dark:text-rose-300",
    borderColor: "border-rose-300/60 dark:border-rose-600/40",
  },
  {
    name: "green",
    gradient: "from-emerald-100 via-green-50 to-teal-200 dark:from-emerald-900/60 dark:via-green-950/40 dark:to-teal-800/60",
    glowColor: "shadow-emerald-300/50 dark:shadow-emerald-500/30",
    textColor: "text-emerald-950 dark:text-emerald-100",
    accentColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300/60 dark:border-emerald-600/40",
  },
];

export function getTheme(index: number): PromiseTheme {
  return THEMES[index % THEMES.length];
}

interface PromiseCard3DProps {
  heading: string;
  scripture: string;
  reference: string;
  themeIndex?: number;
  onShare?: () => void;
  onClose?: () => void;
  showActions?: boolean;
}

export default function PromiseCard3D({
  heading,
  scripture,
  reference,
  themeIndex = 0,
  onShare,
  onClose,
  showActions = true,
}: PromiseCard3DProps) {
  const [amenClicked, setAmenClicked] = useState(false);
  const [, navigate] = useLocation();
  const theme = THEMES[themeIndex % THEMES.length];

  return (
    <div
      data-testid="promise-card-3d"
      className="relative w-full max-w-md mx-auto"
    >
      <div
        className={`
          relative rounded-3xl p-8 bg-gradient-to-br ${theme.gradient}
          border ${theme.borderColor}
          shadow-2xl ${theme.glowColor}
          transform transition-all duration-500
          hover:scale-[1.02] hover:shadow-3xl
          animate-promise-glow
        `}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        {onClose && (
          <button
            data-testid="button-close-promise"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/20 dark:bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/15 dark:bg-white/5 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10">
          <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${theme.accentColor} opacity-80`}>
            God's Promise For You
          </div>

          <h2
            data-testid="text-promise-heading"
            className={`text-2xl font-bold mb-6 leading-tight ${theme.textColor}`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {heading}
          </h2>

          <div className="relative mb-6">
            <div className={`text-4xl leading-none opacity-20 ${theme.accentColor} absolute -top-2 -left-1`}
              style={{ fontFamily: "Georgia, serif" }}
            >
              &ldquo;
            </div>
            <p
              data-testid="text-promise-scripture"
              className={`text-lg leading-relaxed pl-6 pr-2 italic ${theme.textColor} opacity-90`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {scripture}
            </p>
            <div className={`text-4xl leading-none opacity-20 ${theme.accentColor} text-right -mt-2`}
              style={{ fontFamily: "Georgia, serif" }}
            >
              &rdquo;
            </div>
          </div>

          <p
            data-testid="text-promise-reference"
            className={`text-sm font-bold ${theme.accentColor} mb-6 text-right`}
          >
            — {reference}
          </p>

          {showActions && (
            <div className="flex items-center gap-3 mb-4" data-testid="promise-actions">
              <button
                data-testid="button-share-promise"
                onClick={onShare}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  bg-white/40 dark:bg-white/10 backdrop-blur-sm
                  hover:bg-white/60 dark:hover:bg-white/20 transition-all
                  ${theme.textColor}`}
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              <button
                data-testid="button-amen-promise"
                onClick={() => setAmenClicked(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  transition-all
                  ${amenClicked
                    ? "bg-red-500/20 dark:bg-red-400/20 text-red-700 dark:text-red-300 scale-110"
                    : "bg-white/40 dark:bg-white/10 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/20"
                  }
                  ${!amenClicked ? theme.textColor : ""}`}
              >
                <Heart className={`w-4 h-4 ${amenClicked ? "fill-current" : ""}`} />
                Amen
              </button>

              <button
                data-testid="button-read-devotional"
                onClick={() => navigate("/")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  bg-white/40 dark:bg-white/10 backdrop-blur-sm
                  hover:bg-white/60 dark:hover:bg-white/20 transition-all
                  ${theme.textColor}`}
              >
                <BookOpen className="w-4 h-4" />
                Devotional
              </button>
            </div>
          )}

          <div className={`text-[10px] uppercase tracking-[0.15em] text-center ${theme.accentColor} opacity-50 pt-2 border-t border-current/10`}>
            From the 365DailyDevotional
          </div>
        </div>
      </div>
    </div>
  );
}
