import { useState, useEffect } from "react";
import { Share2, Heart, BookOpen, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface PromiseTheme {
  name: string;
  bgStyle: Record<string, string>;
  overlayClass: string;
  textColor: string;
  accentColor: string;
  buttonBg: string;
  borderColor: string;
}

const THEMES: PromiseTheme[] = [
  {
    name: "sunrise",
    bgStyle: {
      background: "linear-gradient(135deg, #FF9A56 0%, #FF6B6B 30%, #C850C0 60%, #4158D0 100%)",
    },
    overlayClass: "from-orange-400/20 via-transparent to-purple-500/20",
    textColor: "text-white",
    accentColor: "text-amber-100",
    buttonBg: "bg-white/25 hover:bg-white/35",
    borderColor: "border-white/20",
  },
  {
    name: "heavenClouds",
    bgStyle: {
      background: "linear-gradient(180deg, #89CFF0 0%, #B6D8F2 25%, #F0F4F8 50%, #E8D5B7 75%, #F5E6CC 100%)",
    },
    overlayClass: "from-sky-300/30 via-white/20 to-amber-200/20",
    textColor: "text-slate-900",
    accentColor: "text-sky-800",
    buttonBg: "bg-white/50 hover:bg-white/70",
    borderColor: "border-sky-200/40",
  },
  {
    name: "goldenRays",
    bgStyle: {
      background: "radial-gradient(ellipse at 30% 20%, #FFF8DC 0%, #FFD700 40%, #DAA520 70%, #B8860B 100%)",
    },
    overlayClass: "from-yellow-200/30 via-transparent to-amber-700/15",
    textColor: "text-amber-950",
    accentColor: "text-amber-800",
    buttonBg: "bg-white/40 hover:bg-white/55",
    borderColor: "border-amber-300/40",
  },
  {
    name: "peacefulFlowers",
    bgStyle: {
      background: "linear-gradient(160deg, #FFDEE9 0%, #B5FFFC 50%, #E8F5E9 100%)",
    },
    overlayClass: "from-pink-200/30 via-transparent to-teal-200/20",
    textColor: "text-slate-800",
    accentColor: "text-pink-700",
    buttonBg: "bg-white/50 hover:bg-white/65",
    borderColor: "border-pink-200/40",
  },
  {
    name: "softLandscape",
    bgStyle: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #f5576c 100%)",
    },
    overlayClass: "from-indigo-400/20 via-transparent to-pink-400/20",
    textColor: "text-white",
    accentColor: "text-purple-100",
    buttonBg: "bg-white/20 hover:bg-white/35",
    borderColor: "border-white/20",
  },
  {
    name: "royalLight",
    bgStyle: {
      background: "linear-gradient(135deg, #0c1445 0%, #1a237e 30%, #283593 60%, #3949AB 100%)",
    },
    overlayClass: "from-blue-300/10 via-transparent to-indigo-500/10",
    textColor: "text-blue-50",
    accentColor: "text-blue-200",
    buttonBg: "bg-white/15 hover:bg-white/25",
    borderColor: "border-blue-300/20",
  },
];

export function getTheme(index: number): PromiseTheme {
  return THEMES[index % THEMES.length];
}

export function getRandomThemeIndex(seed: number): number {
  const hash = ((seed * 2654435761) >>> 0) % THEMES.length;
  return hash;
}

interface PromiseCard3DProps {
  heading: string;
  scripture: string;
  reference: string;
  promiseId?: number;
  themeIndex?: number;
  onShare?: () => void;
  onClose?: () => void;
  showActions?: boolean;
  amenCount?: number;
}

export default function PromiseCard3D({
  heading,
  scripture,
  reference,
  promiseId,
  themeIndex = 0,
  onShare,
  onClose,
  showActions = true,
  amenCount = 0,
}: PromiseCard3DProps) {
  const [amenClicked, setAmenClicked] = useState(false);
  const [, navigate] = useLocation();
  const theme = THEMES[themeIndex % THEMES.length];

  const { data: amenData } = useQuery<{ totalAmens: number }>({
    queryKey: ["/api/promise/amen-count", promiseId],
    enabled: !!promiseId && showActions,
  });

  const [localAmenCount, setLocalAmenCount] = useState(0);
  useEffect(() => {
    if (amenData) setLocalAmenCount(amenData.totalAmens);
  }, [amenData]);

  const handleAmen = async () => {
    if (amenClicked) return;
    setAmenClicked(true);
    setLocalAmenCount((c) => c + 1);
    if (promiseId) {
      try {
        const res = await apiRequest("POST", "/api/promise/amen", { promiseId });
        const data = await res.json();
        if (data.totalAmens) setLocalAmenCount(data.totalAmens);
      } catch {}
    }
  };

  return (
    <div
      data-testid="promise-card-3d"
      className="relative w-full max-w-md mx-auto"
    >
      <div
        className={`
          relative rounded-3xl p-8 overflow-hidden
          border ${theme.borderColor}
          shadow-2xl
          transform transition-all duration-500
          hover:scale-[1.02]
          animate-promise-glow
        `}
        style={{
          ...theme.bgStyle,
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        {onClose && (
          <button
            data-testid="button-close-promise"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors z-20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.overlayClass}`} />
          <div className="absolute top-[10%] left-[20%] w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[15%] right-[15%] w-32 h-32 bg-white/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-[40%] right-[10%] w-20 h-60 bg-white/5 rounded-full blur-3xl rotate-45" />
        </div>

        <div className="relative z-10">
          <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-4 ${theme.accentColor} opacity-80`}>
            God's Promise For You
          </div>

          <h2
            data-testid="text-promise-heading"
            className={`text-2xl font-bold mb-6 leading-tight ${theme.textColor} drop-shadow-sm`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {heading}
          </h2>

          <div className="relative mb-6">
            <div className={`text-5xl leading-none opacity-15 ${theme.accentColor} absolute -top-3 -left-1`}
              style={{ fontFamily: "Georgia, serif" }}
            >
              &ldquo;
            </div>
            <p
              data-testid="text-promise-scripture"
              className={`text-lg leading-relaxed pl-6 pr-2 italic ${theme.textColor} opacity-90 drop-shadow-sm`}
              style={{ fontFamily: "Georgia, 'DM Sans', serif" }}
            >
              {scripture}
            </p>
            <div className={`text-5xl leading-none opacity-15 ${theme.accentColor} text-right -mt-2`}
              style={{ fontFamily: "Georgia, serif" }}
            >
              &rdquo;
            </div>
          </div>

          <p
            data-testid="text-promise-reference"
            className={`text-sm font-bold ${theme.accentColor} mb-6 text-right drop-shadow-sm`}
          >
            — {reference}
          </p>

          {showActions && (
            <div className="flex items-center gap-3 mb-4" data-testid="promise-actions">
              <button
                data-testid="button-share-promise"
                onClick={onShare}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  ${theme.buttonBg} backdrop-blur-sm transition-all ${theme.textColor}`}
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              <button
                data-testid="button-amen-promise"
                onClick={handleAmen}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  transition-all
                  ${amenClicked
                    ? "bg-red-500/30 text-white scale-110 shadow-lg shadow-red-500/20"
                    : `${theme.buttonBg} backdrop-blur-sm ${theme.textColor}`
                  }`}
              >
                <Heart className={`w-4 h-4 ${amenClicked ? "fill-current" : ""}`} />
                Amen{localAmenCount > 0 ? ` (${localAmenCount})` : ""}
              </button>

              <button
                data-testid="button-read-devotional"
                onClick={() => navigate("/devotional/today")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  ${theme.buttonBg} backdrop-blur-sm transition-all ${theme.textColor}`}
              >
                <BookOpen className="w-4 h-4" />
                Devotional
              </button>
            </div>
          )}

          <div className={`text-[10px] uppercase tracking-[0.15em] text-center ${theme.accentColor} opacity-40 pt-2 border-t border-white/10`}>
            From the 365DailyDevotional
          </div>
        </div>
      </div>
    </div>
  );
}
