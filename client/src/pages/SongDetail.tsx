import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Play, Pause, Volume2, Download, Share2,
  Heart, ChevronLeft, Music2, BookOpen, Loader2, ExternalLink,
  Gift, X, AlertCircle, BookMarked, SkipForward, Settings2,
} from "lucide-react";
import { SiPaypal, SiCashapp, SiVenmo } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import MusicSettings from "@/components/MusicSettings";
import type { Song, GivingMethod } from "@shared/schema";

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

function MethodIcon({ type }: { type: string }) {
  if (type === "paypal") return <SiPaypal className="w-5 h-5 text-blue-600" />;
  if (type === "cashapp") return <SiCashapp className="w-5 h-5 text-green-600" />;
  if (type === "venmo") return <SiVenmo className="w-5 h-5 text-blue-500" />;
  if (type === "card") return <ExternalLink className="w-5 h-5 text-purple-600" />;
  if (type === "website") return <ExternalLink className="w-5 h-5 text-amber-700" />;
  return <Gift className="w-5 h-5 text-primary" />;
}

function SupportModal({ open, onClose, songTitle }: { open: boolean; onClose: () => void; songTitle: string }) {
  const { data: methods = [], isLoading } = useQuery<GivingMethod[]>({
    queryKey: ["/api/giving-methods"],
    enabled: open,
  });

  const active = methods.filter((m) => m.isActive);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Support the Ministry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Were you blessed by this song?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your voluntary support helps SpiritTone Records and 365 Daily Devotional continue producing
              Scripture-based songs, devotionals, Bible teaching, prayer resources, and counseling encouragement.
            </p>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Giving is optional. You receive the same song access whether or not you give.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && active.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 justify-center">
              <AlertCircle className="w-4 h-4" />
              No giving options are currently configured.
            </div>
          )}

          {!isLoading && active.length > 0 && (
            <div className="space-y-2">
              {active.map((method) => (
                <a
                  key={method.id}
                  href={method.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors group"
                  onClick={(e) => {
                    if (!method.url) e.preventDefault();
                  }}
                  data-testid={`link-giving-method-${method.id}`}
                >
                  <div className="flex-shrink-0">
                    <MethodIcon type={method.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{method.name}</div>
                    {method.handle && (
                      <div className="text-xs text-muted-foreground">{method.handle}</div>
                    )}
                    {method.instructions && (
                      <div className="text-xs text-muted-foreground mt-0.5">{method.instructions}</div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60 text-center">
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
        className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center min-h-[220px] px-6 py-8"
        style={{
          background: hasCover
            ? undefined
            : "linear-gradient(160deg, #fdf5e8 0%, #f0d898 35%, #deb850 65%, #c29820 100%)",
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
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(80,30,0,0.18) 0%, rgba(55,18,0,0.65) 100%)",
          }}
        />
        <div className="relative z-10 pointer-events-none select-none space-y-1">
          <div
            className="font-serif font-black uppercase tracking-widest"
            style={{ fontSize: "clamp(1.4rem,6vw,2.4rem)", color: "#c9a840", textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}
          >
            {song.title}
          </div>
          <div className="text-xs uppercase tracking-[0.22em] text-amber-200/80">{song.labelName}</div>
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
        <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-primary/30 pl-3">
          {song.shortDescription}
        </p>
      )}

      {/* Credits */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
        <h3 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">Credits</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
            <h3 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">Lyrics</h3>
            <button
              onClick={() => setShowLyrics((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-lyrics"
            >
              {showLyrics ? "Hide" : "Show"}
            </button>
          </div>
          {showLyrics && (
            <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
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
      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} songTitle={song.title} />
    </div>
  );
}
