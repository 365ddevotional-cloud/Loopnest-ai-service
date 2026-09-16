import { useState, useEffect } from "react";
import { Share2, Heart, BookOpen, X, UserCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { devotionalBackgrounds } from "@/constants/devotionalBackgrounds";
import { getRandomBgIndex, preloadAhead } from "@/lib/backgroundEngine";

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
  /** URL of the signed-in user's profile picture (object-storage path resolved to /api/user/profile/picture) */
  userPictureUrl?: string;
  /** Whether the user has opted in to show their picture on the promise card */
  showUserPicture?: boolean;
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
  userPictureUrl,
  showUserPicture = false,
}: PromiseCard3DProps) {
  const [amenClicked, setAmenClicked] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [userPicError, setUserPicError] = useState(false);
  const [, navigate] = useLocation();
  const bgIndex = getRandomBgIndex(themeIndex);
  const randomBackground = devotionalBackgrounds[bgIndex];

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

  const textColor = "text-white";
  const accentColor = "text-white/80";

  // Whether to display user's picture in the card footer (in-app only, never in share)
  const displayUserPic = showUserPicture && !!userPictureUrl && !userPicError;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        data-testid="promise-card-3d"
        className="relative overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-[1.02] flex items-center justify-center"
        style={{
          borderRadius: "18px",
          minHeight: "420px",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.50), rgba(0,0,0,0.50)), url(${randomBackground})`,
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

          <div
            className="relative z-10 mx-auto"
            style={{ width: "90%", maxWidth: "700px", textAlign: "center" }}
          >
            <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-5 ${accentColor}`}>
              God's Promise For You
            </div>

            <h2
              data-testid="text-promise-heading"
              className={`mb-6 leading-tight ${textColor}`}
              style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700 }}
            >
              {heading}
            </h2>

            <p
              data-testid="text-promise-scripture"
              className={`mb-4 leading-relaxed ${accentColor}`}
              style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", fontStyle: "italic" }}
            >
              "{scripture}"
            </p>

            <p
              data-testid="text-promise-reference"
              className={`text-xs font-semibold uppercase tracking-widest mb-8 ${accentColor}`}
            >
              — {reference}
            </p>

            {showActions && (
              <>
                <div className="flex gap-3 justify-center mb-4">
                  {onShare && (
                    <button
                      data-testid="button-share-promise"
                      onClick={onShare}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white/20 hover:bg-white/30 text-white transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  )}
                  <button
                    data-testid="button-amen-promise"
                    onClick={handleAmen}
                    disabled={amenClicked}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      amenClicked ? "bg-pink-500/80 text-white" : "bg-white/20 hover:bg-white/30 text-white"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${amenClicked ? "fill-current" : ""}`} />
                    Amen {localAmenCount > 0 ? `(${localAmenCount})` : ""}
                  </button>
                </div>

                <button
                  data-testid="button-go-to-devotional"
                  onClick={() => navigate("/devotional/today")}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full text-sm font-semibold transition-all mb-3"
                  style={{
                    background: [
                      "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)",
                      "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
                      "linear-gradient(135deg, #15803d 0%, #4ade80 100%)",
                      "linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)",
                      "linear-gradient(135deg, #be123c 0%, #fb7185 100%)",
                      "linear-gradient(135deg, #0f766e 0%, #5eead4 100%)",
                      "linear-gradient(135deg, #b45309 0%, #fbbf24 100%)",
                    ][Math.floor(Date.now() / 604800000) % 7],
                    color: "#fff",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    letterSpacing: "0.02em",
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  Go To Today's Devotional
                </button>
              </>
            )}

            {/* Footer: [Official Logo]  Attribution Text  [User Picture] */}
            <div
              data-testid="text-promise-stamp"
              className="pt-3 border-t border-white/10"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              {/* Left: official app logo */}
              <div style={{ flexShrink: 0 }}>
                {!logoError ? (
                  <img
                    src="/365-logo.jpeg"
                    alt="365 Daily Devotional"
                    data-testid="img-365-logo"
                    className="rounded-md object-contain"
                    style={{ width: "clamp(28px, 3.5vw, 36px)", height: "clamp(28px, 3.5vw, 36px)" }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  /* Fallback: app icon */
                  <img
                    src="/icon-192.png"
                    alt="365 Daily Devotional"
                    data-testid="img-365-logo-fallback"
                    className="rounded-md object-contain"
                    style={{ width: "clamp(28px, 3.5vw, 36px)", height: "clamp(28px, 3.5vw, 36px)" }}
                  />
                )}
              </div>

              {/* Center: attribution text */}
              <span
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "clamp(11px, 1.6vw, 13px)",
                  fontWeight: 600,
                  color: "white",
                  textShadow: "0 3px 10px rgba(0,0,0,0.9)",
                  lineHeight: 1.3,
                }}
              >
                Shared from 365 Daily Devotional App
              </span>

              {/* Right: user picture (in-app only, excluded from canvas share) */}
              <div style={{ flexShrink: 0, width: "clamp(28px, 3.5vw, 36px)", height: "clamp(28px, 3.5vw, 36px)" }}>
                {displayUserPic ? (
                  <img
                    src={userPictureUrl}
                    alt="My picture"
                    data-testid="img-user-promise-picture"
                    className="rounded-full object-cover w-full h-full"
                    style={{ border: "1.5px solid rgba(255,255,255,0.4)" }}
                    onError={() => setUserPicError(true)}
                  />
                ) : showUserPicture ? (
                  /* placeholder when setting is on but no picture */
                  <div
                    data-testid="img-user-promise-placeholder"
                    className="rounded-full w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)" }}
                  >
                    <UserCircle className="w-4 h-4 text-white/70" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
