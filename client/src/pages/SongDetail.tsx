import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Play, Pause, Volume2, Download, Share2,
  Heart, ChevronLeft, Music2, BookOpen, Loader2, ExternalLink,
  Gift, X, AlertCircle, BookMarked, SkipForward, Settings2,
  Copy, Check, Calendar, Send, CheckCircle2, RefreshCw,
} from "lucide-react";
import { SiPaypal, SiCashapp, SiVenmo } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import MusicSettings from "@/components/MusicSettings";
import type { Song } from "@shared/schema";
import { ConfirmationModal } from "./Donate";

const VENMO_LINK = "https://venmo.com/u/dailydevotional";
const OPAY_ACCOUNT_NUMBER = "8054611168";
const PAYPAL_LINK = import.meta.env.VITE_PAYPAL_DONATION_LINK || "https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L";
const CASHAPP_TAG = import.meta.env.VITE_CASHTAG || "$365dailydevotional";
const CASHAPP_LINK = `https://cash.app/${CASHAPP_TAG}`;

const LOCAL_FAV_KEY = "spirittone-song-favorites";

function getLocalFavorites(): number[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_FAV_KEY) ?? "[]"); } catch { return []; }
}
function setLocalFavorites(ids: number[]) {
  localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(ids));
}

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SupportModal({ open, onClose, songTitle, onHaveDonated }: {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  onHaveDonated: () => void;
}) {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [opayCopied, setOpayCopied] = useState(false);

  const handleCopyOpay = async () => {
    try {
      await navigator.clipboard.writeText(OPAY_ACCOUNT_NUMBER);
      setOpayCopied(true);
      toast({ title: "Account number copied." });
      setTimeout(() => setOpayCopied(false), 2500);
    } catch {
      toast({ title: "Account number: " + OPAY_ACCOUNT_NUMBER });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Support the Ministry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Intro box */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 p-5 space-y-2">
            <p className="text-base font-semibold text-foreground leading-snug">Were you blessed by this song?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your voluntary support helps SpiritTone Records and 365 Daily Devotional continue producing
              Scripture-based songs, devotionals, Bible teaching, prayer resources, and counseling encouragement.
            </p>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              Giving is optional. You receive the same song access whether or not you give.
            </p>
          </div>

          {/* Frequency toggle */}
          <div className="flex justify-center">
            <div className="inline-flex bg-muted/50 rounded-xl p-1 border border-primary/10 gap-1">
              <button type="button" onClick={() => setFrequency("once")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${frequency === "once" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="support-give-once">
                <Heart className="w-4 h-4" /> Give Once
              </button>
              <button type="button" onClick={() => setFrequency("monthly")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${frequency === "monthly" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="support-give-monthly">
                <Calendar className="w-4 h-4" /> Support Monthly
              </button>
            </div>
          </div>

          {/* Monthly message */}
          {frequency === "monthly" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 text-center">
              <p className="text-base text-foreground leading-relaxed">
                Thank you for choosing to support 365 Daily Devotional every month. Your faithful partnership
                helps us continue sharing God's Word around the world.
              </p>
            </div>
          )}

          {/* PayPal */}
          <div className="rounded-xl border border-[#003087]/30 bg-[#003087]/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#003087]/20">
              <SiPaypal className="w-6 h-6 text-[#003087] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Worldwide</p>
                <p className="text-base font-bold text-foreground">PayPal</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 text-center">
              {frequency === "monthly" && (
                <p className="text-sm text-muted-foreground leading-relaxed bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                  After donating, log in to PayPal and select <strong>Set up recurring payments</strong> to give monthly.
                </p>
              )}
              <a href={PAYPAL_LINK} target="_blank" rel="noopener noreferrer" className="block"
                data-testid="support-paypal-link">
                <Button size="lg" className="w-full gap-2 text-base font-bold bg-[#003087] hover:bg-[#002574] text-white border-0 h-12">
                  <SiPaypal className="w-5 h-5" />
                  Donate with PayPal
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Cash App */}
          <div className="rounded-xl border border-[#00D632]/30 bg-[#00D632]/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#00D632]/20">
              <SiCashapp className="w-6 h-6 text-[#00D632] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">USA</p>
                <p className="text-base font-bold text-foreground">Cash App</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 text-center">
              <p className="font-mono text-lg font-bold text-foreground tracking-wide">{CASHAPP_TAG}</p>
              {frequency === "monthly" && (
                <p className="text-sm text-muted-foreground leading-relaxed bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                  In Cash App, tap <strong>Pay</strong>, enter your amount, then select{" "}
                  <strong>Make it recurring</strong> before sending.
                </p>
              )}
              <a href={CASHAPP_LINK} target="_blank" rel="noopener noreferrer" className="block"
                data-testid="support-cashapp-link">
                <Button size="lg" className="w-full gap-2 text-base font-bold bg-[#00D632] hover:bg-[#00b82a] text-black border-0 h-12">
                  <SiCashapp className="w-5 h-5" />
                  Donate with Cash App
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Venmo */}
          <div className="rounded-xl border border-[#008CFF]/30 bg-[#008CFF]/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#008CFF]/20">
              <SiVenmo className="w-6 h-6 text-[#008CFF] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">🇺🇸 United States</p>
                <p className="text-base font-bold text-foreground">Venmo</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 text-center">
              <p className="font-mono text-lg font-bold text-foreground tracking-wide">@dailydevotional</p>
              {frequency === "monthly" && (
                <p className="text-sm text-muted-foreground leading-relaxed bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                  In the Venmo app, enter your support amount, tap <strong>Schedule</strong>, select <strong>Monthly</strong>, and choose your preferred payment date.
                </p>
              )}
              <a href={VENMO_LINK} target="_blank" rel="noopener noreferrer" className="block"
                data-testid="support-venmo-link">
                <Button size="lg" className="w-full gap-2 text-base font-bold bg-[#008CFF] hover:bg-[#0079e0] text-white border-0 h-12">
                  <SiVenmo className="w-5 h-5" />
                  {frequency === "monthly" ? "Set Up Monthly Support on Venmo" : "Donate with Venmo"}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* OPay */}
          <div className="rounded-xl border border-green-600/30 bg-green-600/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-green-600/20">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">₦</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">🇳🇬 Nigeria</p>
                <p className="text-base font-bold text-foreground">Bank Transfer (OPay)</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="bg-white/60 dark:bg-black/20 rounded-lg divide-y divide-border/50 overflow-hidden text-sm">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground font-medium">Account Name</span>
                  <span className="font-bold text-foreground">MOSES AFOLABI</span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground font-medium">Bank</span>
                  <span className="font-bold text-foreground">OPay</span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground font-medium">Account No.</span>
                  <span className="font-mono font-bold text-foreground text-base tracking-widest">{OPAY_ACCOUNT_NUMBER}</span>
                </div>
              </div>
              {frequency === "monthly" && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You may save these account details and send your chosen support each month. Where available,
                  you may also create a monthly standing instruction through your banking app.
                </p>
              )}
              <Button size="lg" variant="outline"
                className="w-full gap-2 text-base font-bold border-green-600/40 hover:bg-green-600/5 h-12"
                onClick={handleCopyOpay} data-testid="support-copy-opay">
                {opayCopied ? <><Check className="w-5 h-5 text-green-600" /> Account number copied</> : <><Copy className="w-5 h-5" /> Copy Account Number</>}
              </Button>
            </div>
          </div>

          {/* I Have Donated */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Already donated? Let us know!</p>
            <Button size="lg" variant="outline"
              className="gap-2 text-base font-bold border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-12"
              onClick={onHaveDonated} data-testid="support-have-donated">
              <Send className="w-4 h-4" />
              I Have Donated
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/60 text-center">
            No card information is collected by this app. All giving links open in your browser or payment app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SongDetail() {
  const [, params] = useRoute("/music/:slug");
  const slug = params?.slug;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, emailVerified, getIdToken } = useUser();
  const isSignedIn = !!user && emailVerified;
  const [showSupport, setShowSupport] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMusicSettings, setShowMusicSettings] = useState(false);
  const [localFav, setLocalFav] = useState(false);

  const { data: song, isLoading, error } = useQuery<Song>({
    queryKey: ["/api/songs/by-slug", slug],
    queryFn: () => fetch(`/api/songs/by-slug/${slug}`).then((r) => r.json()),
    enabled: !!slug,
  });

  useEffect(() => {
    if (song && !isSignedIn) {
      setLocalFav(getLocalFavorites().includes(song.id));
    }
  }, [song?.id, isSignedIn]);

  // DB-backed favorites list (only when signed in)
  const { data: dbFavorites = [] } = useQuery<{ songId: number }[]>({
    queryKey: ["/api/user/library/favorites"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await fetch("/api/user/library/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : [];
    },
    enabled: isSignedIn,
  });

  // DB-backed saved list (only when signed in)
  const { data: dbSaved = [] } = useQuery<{ songId: number }[]>({
    queryKey: ["/api/user/library/saved"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await fetch("/api/user/library/saved", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : [];
    },
    enabled: isSignedIn,
  });

  const isFavorite = isSignedIn
    ? dbFavorites.some((f) => f.songId === song?.id)
    : localFav;

  const isSaved = isSignedIn && dbSaved.some((s) => s.songId === song?.id);

  const favoriteMutation = useMutation({
    mutationFn: async ({ songId, add }: { songId: number; add: boolean }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(add ? "/api/user/library/favorites" : `/api/user/library/favorites/${songId}`, {
        method: add ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: add ? JSON.stringify({ songId }) : undefined,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ songId, save }: { songId: number; save: boolean }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(save ? "/api/user/library/saved" : `/api/user/library/saved/${songId}`, {
        method: save ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: save ? JSON.stringify({ songId }) : undefined,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] }),
  });

  const {
    currentSong: playerSong, isPlaying: playerIsPlaying, currentTime, duration, volume,
    isLoading: audioLoading, playSong, togglePlay, seek, setVolume, nextSong, playNext,
  } = useMusicPlayer();
  const isCurrentSong = playerSong?.id === song?.id;
  const isPlaying = isCurrentSong && playerIsPlaying;
  const displayTime = isCurrentSong ? currentTime : 0;
  const displayDuration = isCurrentSong ? duration : 0;
  const displayVolume = isCurrentSong ? volume : 1;
  const displayLoading = isCurrentSong && audioLoading;

  const handlePlayPause = () => {
    if (!song) return;
    if (isCurrentSong) togglePlay();
    else playSong(song);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: song?.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const toggleFavorite = async () => {
    if (!song) return;
    if (isSignedIn) {
      const adding = !isFavorite;
      favoriteMutation.mutate({ songId: song.id, add: adding });
      toast({ title: adding ? "Added to favorites" : "Removed from favorites" });
    } else {
      const ids = getLocalFavorites();
      const wasIn = ids.includes(song.id);
      const updated = wasIn ? ids.filter((id) => id !== song.id) : [...ids, song.id];
      setLocalFavorites(updated);
      setLocalFav(!wasIn);
      toast({ title: wasIn ? "Removed from favorites" : "Added to favorites" });
    }
  };

  const toggleSave = async () => {
    if (!song) return;
    if (!isSignedIn) {
      setLocation(`/signin?return=/music/${song.slug}&action=save&songId=${song.id}`);
      return;
    }
    const adding = !isSaved;
    saveMutation.mutate({ songId: song.id, save: adding });
    toast({ title: adding ? "Saved to My Library" : "Removed from library" });
  };

  const handleDownloadClick = async () => {
    if (!song || !isSignedIn) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch("/api/user/library/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songId: song.id }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/library/downloads"] });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <Music2 className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="font-serif text-2xl text-foreground">Song Not Found</h2>
        <p className="text-muted-foreground">This song doesn't exist or has been removed.</p>
        <Link href="/music">
          <Button variant="outline">Back to Music Library</Button>
        </Link>
      </div>
    );
  }

  const hasCover = !!song.coverImageUrl;
  const downloadLabel =
    song.downloadStatus === "disabled"
      ? "Downloads Disabled"
      : "Download Coming Soon";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back link */}
      <Link href="/music">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-to-music">
          <ChevronLeft className="w-4 h-4" />
          All Songs
        </button>
      </Link>

      {/* Hero card */}
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center"
        style={{
          minHeight: "300px",
          background: hasCover
            ? undefined
            : "linear-gradient(145deg, #120400 0%, #3b1000 22%, #7c3200 48%, #c07c0a 76%, #d9a818 100%)",
        }}
      >
        {hasCover && (
          <img
            src={song.coverImageUrl!}
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Depth overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: hasCover
              ? "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.72) 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(220,165,30,0.14) 0%, rgba(0,0,0,0.48) 100%)",
          }}
        />

        {/* Inset decorative border — placeholder only */}
        {!hasCover && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: "14px",
              border: "1px solid rgba(205,155,25,0.28)",
              borderRadius: "10px",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 pointer-events-none select-none px-10 py-10 flex flex-col items-center gap-4 w-full">

          {/* Musical note icon — placeholder only */}
          {!hasCover && (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(210,158,30,0.55)" aria-hidden="true">
              <path d="M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z"/>
            </svg>
          )}

          {/* Song title */}
          <div
            className="font-serif font-black uppercase"
            style={{
              fontSize: "clamp(1.75rem, 7.5vw, 3.2rem)",
              lineHeight: "1.08",
              letterSpacing: "0.07em",
              color: hasCover ? "#ffffff" : "#f0cc48",
              textShadow: "0 2px 18px rgba(0,0,0,0.95), 0 5px 36px rgba(0,0,0,0.70)",
            }}
          >
            {song.title}
          </div>

          {/* Divider — placeholder only */}
          {!hasCover && (
            <div
              style={{
                width: "44px",
                height: "2px",
                background: "rgba(205,155,25,0.55)",
                borderRadius: "1px",
                flexShrink: 0,
              }}
            />
          )}

          {/* Label name */}
          {song.labelName && (
            <div
              style={{
                fontSize: "clamp(0.57rem, 1.8vw, 0.72rem)",
                letterSpacing: "0.30em",
                textTransform: "uppercase",
                color: hasCover ? "rgba(255,255,255,0.65)" : "rgba(225,185,85,0.72)",
                textShadow: "0 1px 8px rgba(0,0,0,0.85)",
              }}
            >
              {song.labelName}
            </div>
          )}
        </div>
      </div>

      {/* Audio player */}
      {song.audioUrl && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3" data-testid="section-audio-player">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors"
              data-testid="button-play-song"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {displayLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={displayDuration || 100}
                value={displayTime}
                onChange={(e) => isCurrentSong && seek(Number(e.target.value))}
                className="w-full h-1.5 accent-primary cursor-pointer"
                data-testid="input-song-scrubber"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(displayDuration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={displayVolume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 h-1.5 accent-primary cursor-pointer"
                data-testid="input-song-volume"
              />
            </div>
          </div>

          {/* Play Next suggestion */}
          {isCurrentSong && nextSong && (
            <div className="flex items-center justify-between px-1 pt-1 border-t border-border/30">
              <div className="text-[11px] text-muted-foreground">
                Up next: <span className="font-medium text-foreground">{nextSong.title}</span>
              </div>
              <button
                onClick={playNext}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                data-testid="button-play-next"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Play
              </button>
            </div>
          )}

          {/* Settings shortcut */}
          <div className="flex justify-end px-1">
            <button
              onClick={() => setShowMusicSettings(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              data-testid="button-open-music-settings"
            >
              <Settings2 className="w-3 h-3" />
              Settings
            </button>
          </div>
        </div>
      )}

      <MusicSettings open={showMusicSettings} onClose={() => setShowMusicSettings(false)} />

      {/* Scripture */}
      {song.scriptureReference && (
        <div className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-1" data-testid="section-scripture">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">{song.scriptureReference}</span>
          </div>
          {song.scriptureText && (
            <p className="text-sm text-foreground/80 italic pl-6">"{song.scriptureText}"</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2" data-testid="section-song-actions">
        {/* Favorite */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFavorite}
          disabled={favoriteMutation.isPending}
          className={isFavorite ? "border-rose-400 text-rose-500 bg-rose-50 dark:bg-rose-950/20" : ""}
          data-testid="button-favorite-song"
        >
          <Heart className={`w-4 h-4 mr-1.5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
          {isFavorite ? "Favorited" : "Favorite"}
        </Button>

        {/* Save to My Library */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSave}
          disabled={saveMutation.isPending}
          className={isSaved ? "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/20" : ""}
          data-testid="button-save-song"
        >
          <BookMarked className={`w-4 h-4 mr-1.5 ${isSaved ? "fill-amber-500 text-amber-700" : ""}`} />
          {isSaved ? "Saved" : "Save to Library"}
        </Button>

        <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share-song">
          <Share2 className="w-4 h-4 mr-1.5" />
          Share
        </Button>

        {/* Download button */}
        {song.downloadStatus === "free" && song.audioUrl ? (
          <a href={`/api/songs/${song.id}/download`} download onClick={handleDownloadClick} data-testid="button-download-song">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              Free Download
            </Button>
          </a>
        ) : song.downloadStatus !== "disabled" ? (
          <Button variant="outline" size="sm" disabled className="opacity-60" data-testid="button-download-coming-soon">
            <Download className="w-4 h-4 mr-1.5" />
            {downloadLabel}
          </Button>
        ) : null}

        {/* Support the Ministry — voluntary only */}
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => setShowSupport(true)}
          data-testid="button-support-ministry-song"
        >
          <Gift className="w-4 h-4 mr-1.5" />
          Support the Ministry
        </Button>
      </div>

      {/* Short Description */}
      {song.shortDescription && (
        <p className="text-base text-foreground/80 leading-relaxed italic border-l-2 border-primary/30 pl-3">
          {song.shortDescription}
        </p>
      )}

      {/* Credits */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
        <h3 className="font-serif text-base font-bold text-foreground uppercase tracking-wider">Credits</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {song.producer && (
            <>
              <span className="text-muted-foreground">Producer</span>
              <span className="text-foreground">{song.producer}</span>
            </>
          )}
          {song.composer && (
            <>
              <span className="text-muted-foreground">Composer</span>
              <span className="text-foreground">{song.composer}</span>
            </>
          )}
          {song.lyricist && (
            <>
              <span className="text-muted-foreground">Lyricist</span>
              <span className="text-foreground">{song.lyricist}</span>
            </>
          )}
          {(song as any).choir && (
            <>
              <span className="text-muted-foreground">Choir / Group</span>
              <span className="text-foreground">{(song as any).choir}</span>
            </>
          )}
          {(song as any).instrumentalist && (
            <>
              <span className="text-muted-foreground">Instrumentalist</span>
              <span className="text-foreground">{(song as any).instrumentalist}</span>
            </>
          )}
          {(song as any).language && (
            <>
              <span className="text-muted-foreground">Language</span>
              <span className="text-foreground">{(song as any).language}</span>
            </>
          )}
          {song.releaseYear && (
            <>
              <span className="text-muted-foreground">Year</span>
              <span className="text-foreground">{song.releaseYear}</span>
            </>
          )}
          {(song as any).genre && (
            <>
              <span className="text-muted-foreground">Genre</span>
              <span className="text-foreground">{(song as any).genre}</span>
            </>
          )}
        </div>
      </div>

      {/* Lyrics */}
      {song.lyrics && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3" data-testid="section-lyrics">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-foreground uppercase tracking-wider">Lyrics</h3>
            <button
              onClick={() => setShowLyrics((v) => !v)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-lyrics"
            >
              {showLyrics ? "Hide" : "Show"}
            </button>
          </div>
          {showLyrics && (
            <pre className="text-base text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
              {song.lyrics}
            </pre>
          )}
        </div>
      )}

      {/* Description */}
      {song.description && (
        <p className="text-sm text-foreground/75 leading-relaxed">{song.description}</p>
      )}

      {/* Copyright */}
      {song.copyrightNotice && (
        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">{song.copyrightNotice}</p>
      )}

      {/* Support Modal */}
      <SupportModal
        open={showSupport}
        onClose={() => setShowSupport(false)}
        songTitle={song.title}
        onHaveDonated={() => { setShowSupport(false); setConfirmOpen(true); }}
      />
      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        defaultGivingType="One-Time Donation"
      />
    </div>
  );
}
