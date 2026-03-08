import { useState, useEffect } from "react";
import { Share2, Heart, BookOpen, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getBackgroundUrl, getRandomBgIndex, isLightBackground, preloadAhead } from "@/lib/backgroundEngine";

export function getRandomThemeIndex(seed: number): number {
  return getRandomBgIndex(seed);
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
  const bgIndex = themeIndex % 50;
  const bgUrl = getBackgroundUrl(bgIndex);
  const isLight = isLightBackground(bgIndex);

  useEffect(() => {
    preloadAhead(themeIndex, 5);
  }, [themeIndex]);

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

  const textColor = isLight ? "text-gray-900" : "text-white";
  const accentColor = isLight ? "text-gray-700" : "text-white/80";
  const buttonStyle = isLight
    ? "bg-black/10 hover:bg-black/20 text-gray-900"
    : "bg-white/20 hover:bg-white/30 text-white";

  return (
    <div
      className="relative w-full max-w-md mx-auto"
    >
      <div
        data-testid="promise-card-3d"
        className="relative rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-[1.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="p-10">
          {onClose && (
            <button
              data-testid="button-close-promise"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/40 transition-colors z-20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-[10%] left-[20%] w-40 h-40 bg-white/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[15%] right-[15%] w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          </div>

          <div className="relative z-10">
            <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-5 ${accentColor}`}>
              God's Promise For You
            </div>

            <h2
              data-testid="text-promise-heading"
              className={`mb-6 leading-tight ${textColor}`}
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "36px",
                fontWeight: 700,
                textAlign: "center",
                textShadow: isLight ? "none" : "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {heading}
            </h2>

            <div className="relative mb-6" style={{ maxWidth: "80%", margin: "0 auto 24px" }}>
              <div className={`text-6xl leading-none opacity-15 ${accentColor} absolute -top-4 -left-3`}
                style={{ fontFamily: "Georgia, serif" }}
              >
                &ldquo;
              </div>
              <p
                data-testid="text-promise-scripture"
                className={`italic ${textColor}`}
                style={{
                  fontFamily: "Georgia, 'DM Sans', serif",
                  fontSize: "28px",
                  fontWeight: 600,
                  lineHeight: 1.6,
                  textAlign: "center",
                  textShadow: isLight ? "none" : "0 1px 6px rgba(0,0,0,0.25)",
                }}
              >
                {scripture}
              </p>
              <div className={`text-6xl leading-none opacity-15 ${accentColor} text-right -mt-2`}
                style={{ fontFamily: "Georgia, serif" }}
              >
                &rdquo;
              </div>
            </div>

            <p
              data-testid="text-promise-reference"
              className={`mb-6 ${accentColor}`}
              style={{
                fontSize: "22px",
                fontWeight: 600,
                opacity: 0.9,
                textAlign: "center",
                textShadow: isLight ? "none" : "0 1px 4px rgba(0,0,0,0.2)",
              }}
            >
              — {reference}
            </p>

            {showActions && (
              <div className="flex items-center justify-center gap-3 mb-4" data-testid="promise-actions">
                <button
                  data-testid="button-share-promise"
                  onClick={onShare}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all ${buttonStyle}`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>

                <button
                  data-testid="button-amen-promise"
                  onClick={handleAmen}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${amenClicked
                      ? "bg-red-500/40 text-white scale-110 shadow-lg shadow-red-500/20"
                      : `backdrop-blur-sm ${buttonStyle}`
                    }`}
                >
                  <Heart className={`w-4 h-4 ${amenClicked ? "fill-current" : ""}`} />
                  Amen{localAmenCount > 0 ? ` (${localAmenCount})` : ""}
                </button>

                <button
                  data-testid="button-read-devotional"
                  onClick={() => navigate("/devotional/today")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all ${buttonStyle}`}
                >
                  <BookOpen className="w-4 h-4" />
                  Devotional
                </button>
              </div>
            )}

            <div
              className={`text-center ${accentColor} pt-2 border-t border-white/10`}
              style={{
                fontSize: "14px",
                opacity: 0.6,
                textAlign: "center",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              From the 365DailyDevotional
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
