import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Pause,
  Heart,
  Share2,
  FileText,
  Download,
  MessageCircle,
  HandHeart,
  Loader2,
  Music2,
} from "lucide-react";
import type { Song } from "@shared/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Audio Player Hook ─────────────────────────────────────────────────────────

function useAudioPlayer(audioUrl: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => { setDuration(audio.duration); setLoading(false); };
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => {
      setIsPlaying(false);
      setLoading(false);
      setError("Audio unavailable. Please check back later.");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    if (audioUrl) {
      audio.src = audioUrl;
      audio.preload = "metadata";
    }

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioUrl) {
      setError("No audio file available for this song yet.");
      return;
    }
    setError(null);
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setError("Could not play audio. Please try again.");
        setIsPlaying(false);
      }
    }
  }, [isPlaying, audioUrl]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }, []);

  return { isPlaying, currentTime, duration, loading, error, togglePlay, seek };
}

// ── Lyrics Modal ──────────────────────────────────────────────────────────────

function LyricsModal({ song, open, onClose }: { song: Song; open: boolean; onClose: () => void }) {
  const paragraphs = song.lyrics?.split(/\n\n+/) ?? [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary">{song.title}</DialogTitle>
          {song.artist && (
            <p className="text-sm text-muted-foreground">Performed by {song.artist}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {song.labelLogoUrl && (
              <img
                src={song.labelLogoUrl}
                alt={song.labelName}
                className="h-5 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span className="text-xs font-semibold text-muted-foreground">{song.labelName}</span>
          </div>
          <p className="text-xs text-muted-foreground">Produced by {song.producer}</p>
          {song.scriptureText && (
            <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2 mt-1">
              "{song.scriptureText}" — {song.scriptureReference}
            </p>
          )}
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {song.lyrics ? (
            paragraphs.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                {para}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Lyrics not yet available.</p>
          )}
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={onClose}
          data-testid="button-close-lyrics"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Testimony Modal ───────────────────────────────────────────────────────────

function TestimonyModal({ song, open, onClose }: { song: Song; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [testimony, setTestimony] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/song-testimonies", data),
    onSuccess: () => setSubmitted(true),
    onError: () =>
      toast({ title: "Error", description: "Could not submit. Please try again.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnonymous && !name.trim()) {
      toast({ title: "Name required", description: "Please enter your name or submit anonymously.", variant: "destructive" });
      return;
    }
    if (testimony.trim().length < 10) {
      toast({ title: "Too short", description: "Please write at least 10 characters.", variant: "destructive" });
      return;
    }
    mutation.mutate({
      songId: song.id,
      songTitle: song.title,
      name: isAnonymous ? "Anonymous" : name.trim(),
      isAnonymous,
      email: email.trim() || null,
      testimony: testimony.trim(),
      consentToPublish: consent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-primary">Share Your Testimony</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Were you blessed by "{song.title}"? Share how this song ministered to you.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="text-4xl">🙏</div>
            <p className="font-semibold text-foreground">Thank you for sharing!</p>
            <p className="text-sm text-muted-foreground">
              Your testimony has been received and will be reviewed before publishing.
            </p>
            <Button variant="outline" className="mt-2" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="testimony-anon"
                checked={isAnonymous}
                onCheckedChange={(v) => setIsAnonymous(!!v)}
              />
              <Label htmlFor="testimony-anon" className="text-sm cursor-pointer">Submit anonymously</Label>
            </div>

            {!isAnonymous && (
              <div className="space-y-1">
                <Label htmlFor="testimony-name" className="text-sm">Your Name *</Label>
                <Input
                  id="testimony-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  data-testid="input-testimony-name"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="testimony-email" className="text-sm">Email (optional, private)</Label>
              <Input
                id="testimony-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-testimony-email"
              />
              <p className="text-xs text-muted-foreground">Your email will never be shared publicly.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="testimony-text" className="text-sm">Your Testimony *</Label>
              <Textarea
                id="testimony-text"
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                placeholder="Share how this song blessed you..."
                rows={4}
                maxLength={2000}
                data-testid="textarea-testimony"
              />
              <p className="text-xs text-muted-foreground">{testimony.length}/2000 characters</p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="testimony-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(!!v)}
              />
              <Label htmlFor="testimony-consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I consent to having my testimony potentially published by SpiritTone Records or 365 Daily Devotional.
              </Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={mutation.isPending}
                data-testid="button-submit-testimony"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Testimony
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Support Modal ─────────────────────────────────────────────────────────────

function SupportModal({ song, open, onClose }: { song: Song; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-primary">Support the Ministry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2 text-sm text-foreground leading-relaxed">
          <p>
            Were you blessed by this song?
          </p>
          <p className="text-muted-foreground">
            Your support helps <strong>SpiritTone Records</strong> and <strong>365 Daily Devotional</strong> continue
            producing Scripture-based devotionals, worship music, Bible teaching, prayer resources, and counseling
            encouragement — while keeping the main ministry content freely available.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Support is entirely voluntary. No donation unlocks any content. No amounts are tax-deductible unless
            your jurisdiction and the ministry's status confirm it.
          </p>
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => { onClose(); window.location.href = "/donate"; }}
              data-testid="button-support-donate"
            >
              <HandHeart className="w-4 h-4 mr-2" />
              Give a Voluntary Gift
            </Button>
          </div>
        </div>
        <Button variant="outline" className="mt-2 w-full" onClick={onClose}>Maybe Later</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SongOfTheWeek() {
  const { toast } = useToast();
  const { data: song, isLoading } = useQuery<Song>({
    queryKey: ["/api/songs/featured"],
    retry: 1,
  });

  const { isPlaying, currentTime, duration, loading: audioLoading, error: audioError, togglePlay, seek } =
    useAudioPlayer(song?.audioUrl);

  const [isFavorite, setIsFavorite] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showTestimony, setShowTestimony] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    if (song) {
      const favs = JSON.parse(localStorage.getItem("song-favorites") || "{}");
      setIsFavorite(!!favs[song.id]);
    }
  }, [song]);

  const toggleFavorite = () => {
    if (!song) return;
    const favs = JSON.parse(localStorage.getItem("song-favorites") || "{}");
    if (isFavorite) {
      delete favs[song.id];
    } else {
      favs[song.id] = { id: song.id, title: song.title, savedAt: new Date().toISOString() };
    }
    localStorage.setItem("song-favorites", JSON.stringify(favs));
    setIsFavorite(!isFavorite);
  };

  const handleShare = async () => {
    if (!song) return;
    const text = [
      `🎵 "${song.title}"`,
      song.artist ? `Performed by ${song.artist}` : "",
      song.labelName,
      `Produced by ${song.producer}`,
      song.scriptureText
        ? `\n"${song.scriptureText}" — ${song.scriptureReference}`
        : `\n${song.scriptureReference}`,
      "\nBlessed by SpiritTone Records & 365 Daily Devotional",
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: song.title, text, url: window.location.href });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast({ title: "Copied!", description: "Share text copied to clipboard." });
    } catch {
      toast({ title: "Share", description: text, duration: 6000 });
    }
  };

  if (isLoading) return null;
  if (!song) return null;

  const hasCover = !!song.coverImageUrl;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden shadow-xl border border-border/30"
        data-testid="section-song-of-the-week"
      >
        {/* ── Cinematic Header ── */}
        <div
          className="relative min-h-[260px] sm:min-h-[300px] flex flex-col items-center justify-center text-center px-4 py-8"
          style={{
            background: hasCover
              ? undefined
              : "linear-gradient(135deg, #1a0520 0%, #2d0e3c 40%, #1e1a00 100%)",
          }}
        >
          {/* Cover image */}
          {hasCover && (
            <img
              src={song.coverImageUrl!}
              alt={song.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/75" />

          {/* Cinematic title */}
          <div className="relative z-10 pointer-events-none select-none">
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                lineHeight: 1,
                textShadow: "0 2px 16px rgba(0,0,0,0.9)",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(1.1rem, 4.5vw, 1.9rem)",
                  color: "#f5f0e0",
                  letterSpacing: "0.28em",
                }}
              >
                SONG OF THE
              </div>
              <div
                style={{
                  fontSize: "clamp(2.6rem, 10vw, 5rem)",
                  color: "#c9a840",
                  textShadow:
                    "0 0 30px rgba(201,168,64,0.5), 0 0 60px rgba(201,168,64,0.2), 0 4px 20px rgba(0,0,0,0.95)",
                  letterSpacing: "0.08em",
                  marginTop: "-0.05em",
                }}
              >
                WEEK
              </div>
            </div>

            {/* Song title */}
            <div
              className="mt-3 px-2"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1rem, 3.5vw, 1.5rem)",
                fontWeight: 600,
                color: "#fff",
                textShadow: "0 2px 10px rgba(0,0,0,0.95)",
                maxWidth: "90vw",
              }}
            >
              "{song.title}"
            </div>

            {/* Artist / vocalist (optional) */}
            {song.artist && (
              <div
                className="mt-1"
                style={{
                  fontSize: "clamp(0.75rem, 2.5vw, 0.95rem)",
                  color: "#e8d8b0",
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                }}
              >
                Performed by {song.artist}
              </div>
            )}
          </div>
        </div>

        {/* ── Song Metadata ── */}
        <div className="bg-card px-4 py-4 space-y-3">
          {/* Label row */}
          <div className="flex items-center gap-2 flex-wrap">
            {song.labelLogoUrl ? (
              <img
                src={song.labelLogoUrl}
                alt={song.labelName}
                className="h-7 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                data-testid="img-label-logo"
              />
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
                <Music2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary" data-testid="text-label-name">
                  {song.labelName}
                </span>
              </div>
            )}
            {song.labelLogoUrl && (
              <span className="text-xs font-bold text-primary" data-testid="text-label-name">
                {song.labelName}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-producer">
            Produced by {song.producer}
          </p>
          {song.composer && song.composer !== song.producer && (
            <p className="text-xs text-muted-foreground">Composed by {song.composer}</p>
          )}

          {/* Scripture */}
          <div className="border-l-2 border-primary/40 pl-3 py-1">
            {song.scriptureText ? (
              <p className="text-xs italic text-foreground/80 leading-relaxed" data-testid="text-song-scripture">
                "{song.scriptureText}"
              </p>
            ) : null}
            <p className="text-xs font-semibold text-primary mt-0.5" data-testid="text-song-scripture-ref">
              — {song.scriptureReference}
            </p>
          </div>

          {/* ── Audio Player ── */}
          <div className="rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/40 p-3 space-y-2" data-testid="section-audio-player">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={audioLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
                data-testid="button-play-pause"
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/80 transition-colors flex items-center justify-center shadow-md active:scale-95"
              >
                {audioLoading ? (
                  <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                )}
              </button>

              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek audio"
                  data-testid="range-audio-seek"
                  className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid="text-current-time">{formatTime(currentTime)}</span>
                  <span data-testid="text-duration">{duration > 0 ? formatTime(duration) : "--:--"}</span>
                </div>
              </div>
            </div>

            {audioError && (
              <p className="text-xs text-destructive text-center" data-testid="text-audio-error">
                {audioError}
              </p>
            )}
          </div>

          {/* ── Action Buttons Row 1 ── */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setShowLyrics(true)}
              aria-label="Show Lyrics"
              data-testid="button-lyrics"
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground active:scale-95"
            >
              <FileText className="w-4 h-4" />
              Lyrics
            </button>

            <button
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Unfavorite" : "Favorite"}
              data-testid="button-favorite"
              className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors text-xs active:scale-95 ${
                isFavorite
                  ? "border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                  : "border-border/50 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-500" : ""}`} />
              {isFavorite ? "Saved" : "Favorite"}
            </button>

            <button
              onClick={handleShare}
              aria-label="Share"
              data-testid="button-share-song"
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <button
              onClick={() => setShowTestimony(true)}
              aria-label="Share Testimony"
              data-testid="button-testimony"
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Testimony
            </button>
          </div>

          {/* ── Action Buttons Row 2 ── */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowSupport(true)}
              aria-label="Support the Ministry"
              data-testid="button-support"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors text-xs text-amber-700 dark:text-amber-400 font-medium active:scale-95"
            >
              <HandHeart className="w-4 h-4" />
              Support the Ministry
            </button>

            <button
              aria-label="Download — Coming Soon"
              data-testid="button-download"
              disabled
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border/40 bg-muted/30 text-xs text-muted-foreground/60 cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download — Coming Soon
            </button>
          </div>

          {/* Copyright */}
          {song.copyrightNotice && (
            <p className="text-[10px] text-muted-foreground/60 text-center pt-1" data-testid="text-copyright">
              {song.copyrightNotice}
            </p>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <LyricsModal song={song} open={showLyrics} onClose={() => setShowLyrics(false)} />
      <TestimonyModal song={song} open={showTestimony} onClose={() => setShowTestimony(false)} />
      <SupportModal song={song} open={showSupport} onClose={() => setShowSupport(false)} />
    </>
  );
}
