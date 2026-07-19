import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Play, Pause, Volume2, SkipBack, SkipForward, Download, Share2,
  Heart, ChevronLeft, Music2, BookOpen, Loader2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Song } from "@shared/schema";

function useAudioPlayer(src: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.volume = volume;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [src]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (audio) { audio.currentTime = t; setCurrentTime(t); }
  }, []);

  const setVol = useCallback((v: number) => {
    const audio = audioRef.current;
    if (audio) { audio.volume = v; setVolume(v); }
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (audio) { audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration)); }
  }, []);

  return { isPlaying, currentTime, duration, volume, isLoading, togglePlay, seek, setVol, skip };
}

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LyricsBlock({ lyrics }: { lyrics: string }) {
  const lines = lyrics.split("\n");
  return (
    <div className="space-y-1 font-mono text-sm leading-relaxed">
      {lines.map((line, i) => {
        const isSectionHeader = /^\[.+\]$/.test(line.trim());
        if (line.trim() === "") return <div key={i} className="h-3" />;
        if (isSectionHeader) {
          return (
            <div key={i} className="font-bold text-primary/80 text-xs uppercase tracking-wider mt-4 first:mt-0">
              {line.replace(/[\[\]]/g, "")}
            </div>
          );
        }
        return <div key={i} className="text-foreground/90">{line}</div>;
      })}
    </div>
  );
}

export default function SongDetail() {
  const [, params] = useRoute("/music/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyName, setTestimonyName] = useState("");
  const [testimonyText, setTestimonyText] = useState("");

  const { data: song, isLoading, isError } = useQuery<Song>({
    queryKey: [`/api/songs/by-slug/${slug}`],
    enabled: !!slug,
  });

  const player = useAudioPlayer(song?.audioUrl);

  useEffect(() => {
    if (!song) return;
    const favKey = `favorite_song_${song.id}`;
    setIsFavorite(localStorage.getItem(favKey) === "true");
  }, [song]);

  const toggleFavorite = () => {
    if (!song) return;
    const favKey = `favorite_song_${song.id}`;
    const next = !isFavorite;
    setIsFavorite(next);
    localStorage.setItem(favKey, String(next));
    toast({ title: next ? "❤️ Added to favorites" : "Removed from favorites" });
  };

  const handleShare = async () => {
    if (!song) return;
    const url = `${window.location.origin}/music/${song.slug}`;
    if (navigator.share) {
      await navigator.share({ title: song.title, text: `Listen to "${song.title}" — ${song.scriptureReference}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const submitTestimonyMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/song-testimonies", data),
    onSuccess: () => {
      toast({ title: "✓ Testimony submitted", description: "Thank you for sharing how this song touched your heart." });
      setShowTestimonyForm(false);
      setTestimonyName("");
      setTestimonyText("");
    },
    onError: () => toast({ title: "Could not submit", variant: "destructive" }),
  });

  const handleTestimonySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!song || !testimonyName.trim() || !testimonyText.trim()) return;
    submitTestimonyMutation.mutate({
      songId: song.id,
      songTitle: song.title,
      name: testimonyName.trim(),
      testimony: testimonyText.trim(),
      isAnonymous: false,
      consentToPublish: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !song) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <Music2 className="w-12 h-12 text-muted-foreground/40" />
        <h2 className="font-serif text-xl font-bold text-foreground">Song not found</h2>
        <p className="text-muted-foreground text-sm">This song may no longer be available.</p>
        <Link href="/music">
          <Button variant="outline" size="sm">← Back to Music Library</Button>
        </Link>
      </div>
    );
  }

  const hasCover = !!song.coverImageUrl;
  const downloadLabel =
    song.downloadStatus === "free"
      ? "Free Download"
      : song.downloadStatus === "disabled"
      ? "Download Unavailable"
      : "Coming Soon";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/music">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          All Songs
        </button>
      </Link>

      {/* Cinematic Header */}
      <div
        className="relative rounded-2xl overflow-hidden min-h-[240px] flex flex-col items-center justify-center text-center"
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
            background: "linear-gradient(to bottom, rgba(100,40,0,0.18) 0%, rgba(80,30,0,0.38) 50%, rgba(55,18,0,0.70) 100%)",
          }}
        />
        <div className="relative z-10 select-none px-4 py-6">
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: "clamp(1.6rem, 6vw, 2.6rem)",
              color: "#c9a840",
              textShadow: "0 0 30px rgba(201,168,64,0.5), 0 4px 20px rgba(0,0,0,0.9)",
            }}
          >
            {song.title}
          </div>
          {song.artist && (
            <div
              className="mt-1"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(0.8rem, 2.5vw, 1rem)",
                color: "#e8d8b0",
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              Performed by {song.artist}
              {song.featuredArtist ? ` ft. ${song.featuredArtist}` : ""}
            </div>
          )}
          <div
            className="mt-1 text-xs"
            style={{ color: "#c9a840", textShadow: "0 1px 4px rgba(0,0,0,0.9)", letterSpacing: "0.12em" }}
          >
            {song.labelName}
          </div>
        </div>
      </div>

      {/* Scripture */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold text-sm">{song.scriptureReference}</span>
        </div>
        {song.scriptureText && (
          <p className="text-sm italic text-foreground/80 leading-relaxed pl-6">
            "{song.scriptureText}"
          </p>
        )}
      </div>

      {/* Audio Player */}
      {song.audioUrl && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => player.skip(-10)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Rewind 10s"
            >
              <SkipBack className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={player.togglePlay}
              disabled={player.isLoading}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #d4a020 0%, #a07010 100%)" }}
              aria-label={player.isPlaying ? "Pause" : "Play"}
              data-testid="button-detail-play-pause"
            >
              {player.isLoading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : player.isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={() => player.skip(10)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Skip 10s"
            >
              <SkipForward className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={player.duration || 100}
              value={player.currentTime}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="w-full h-1.5 accent-amber-600 cursor-pointer"
              data-testid="input-song-progress"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(player.currentTime)}</span>
              <span>{formatTime(player.duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={player.volume}
              onChange={(e) => player.setVol(Number(e.target.value))}
              className="w-24 h-1 accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFavorite}
          className={isFavorite ? "border-rose-400 text-rose-500 bg-rose-50 dark:bg-rose-950/20" : ""}
          data-testid="button-favorite-song"
        >
          <Heart className={`w-4 h-4 mr-1.5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
          {isFavorite ? "Favorited" : "Favorite"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share-song">
          <Share2 className="w-4 h-4 mr-1.5" />
          Share
        </Button>
        {song.downloadStatus === "free" && song.audioUrl ? (
          <a href={song.audioUrl} download target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-download-song">
              <Download className="w-4 h-4 mr-1.5" />
              Free Download
            </Button>
          </a>
        ) : (
          <Button variant="outline" size="sm" disabled className="opacity-60" data-testid="button-download-unavailable">
            <Download className="w-4 h-4 mr-1.5" />
            {downloadLabel}
          </Button>
        )}
        <Link href="/donate">
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-support-ministry-song"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Support the Ministry
          </Button>
        </Link>
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
          {song.choir && (
            <>
              <span className="text-muted-foreground">Choir</span>
              <span className="text-foreground">{song.choir}</span>
            </>
          )}
          {song.instrumentalist && (
            <>
              <span className="text-muted-foreground">Instrumentalist</span>
              <span className="text-foreground">{song.instrumentalist}</span>
            </>
          )}
          {song.genre && (
            <>
              <span className="text-muted-foreground">Genre</span>
              <span className="text-foreground">{song.genre}</span>
            </>
          )}
          {song.language && (
            <>
              <span className="text-muted-foreground">Language</span>
              <span className="text-foreground">{song.language}</span>
            </>
          )}
          {song.releaseYear && (
            <>
              <span className="text-muted-foreground">Release Year</span>
              <span className="text-foreground">{song.releaseYear}</span>
            </>
          )}
        </div>
        {song.labelLogoUrl && (
          <img
            src={song.labelLogoUrl}
            alt={song.labelName}
            className="h-8 mt-2 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      {/* Full Description */}
      {song.description && (
        <div className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">About This Song</h3>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{song.description}</p>
        </div>
      )}

      {/* Lyrics */}
      {song.lyrics && (
        <div className="space-y-3">
          <h3 className="font-serif text-base font-bold text-foreground">Lyrics</h3>
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <LyricsBlock lyrics={song.lyrics} />
          </div>
        </div>
      )}

      {/* Testimony Section */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <h3 className="font-serif text-base font-bold text-foreground">Share Your Testimony</h3>
        <p className="text-xs text-muted-foreground">
          Has this song touched your heart? Share how God spoke to you through it.
        </p>
        {!showTestimonyForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestimonyForm(true)}
            data-testid="button-open-testimony-form"
          >
            Share a Testimony
          </Button>
        ) : (
          <form onSubmit={handleTestimonySubmit} className="space-y-3">
            <input
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Your name"
              value={testimonyName}
              onChange={(e) => setTestimonyName(e.target.value)}
              required
              data-testid="input-testimony-name"
            />
            <textarea
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Share how this song blessed you…"
              value={testimonyText}
              onChange={(e) => setTestimonyText(e.target.value)}
              rows={4}
              required
              data-testid="textarea-testimony-text"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={submitTestimonyMutation.isPending}
                data-testid="button-submit-testimony"
              >
                {submitTestimonyMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Submit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTestimonyForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Copyright */}
      {song.copyrightNotice && (
        <p className="text-[10px] text-muted-foreground/60 text-center">{song.copyrightNotice}</p>
      )}
    </div>
  );
}
