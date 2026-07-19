import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Music2, Play, ExternalLink, Loader2, Clock, RotateCcw, Sparkles } from "lucide-react";
import type { Song } from "@shared/schema";
import { useMusicPlayer, type RecentlyPlayedEntry } from "@/contexts/MusicPlayerContext";

function SongCard({ song, isFeatured }: { song: Song; isFeatured?: boolean }) {
  return (
    <Link href={`/music/${song.slug}`}>
      <div
        className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
          isFeatured
            ? "border-amber-300/60 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 dark:border-amber-800/40"
            : "border-border/50 bg-card hover:border-primary/20"
        }`}
        data-testid={`card-song-library-${song.id}`}
      >
        <div
          className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f0d080 0%, #c89820 100%)" }}
        >
          {song.coverImageUrl ? (
            <img
              src={song.coverImageUrl}
              alt={song.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Music2 className="w-8 h-8 text-amber-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isFeatured && (
            <div className="text-[9px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">
              🎵 Song of the Week
            </div>
          )}
          <h3 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight truncate">
            {song.title}
          </h3>
          {song.artist && (
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {song.labelName} · {song.scriptureReference}
          </p>
          {song.shortDescription && (
            <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{song.shortDescription}</p>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {song.audioUrl && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Play className="w-3 h-3" />
              <span>Play</span>
            </div>
          )}
          <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function RecentCard({ entry, isContinue }: { entry: RecentlyPlayedEntry; isContinue?: boolean }) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(entry.lastPlayedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <Link href={`/music/${entry.slug}`}>
      <div
        className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99]"
        data-testid={`card-recent-song-${entry.songId}`}
      >
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f0d080 0%, #c89820 100%)" }}
        >
          {entry.coverImageUrl ? (
            <img
              src={entry.coverImageUrl}
              alt={entry.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Music2 className="w-6 h-6 text-amber-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate leading-tight group-hover:text-primary transition-colors">
            {entry.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{entry.artist}</p>
          {isContinue && entry.duration > 0 && (
            <div className="mt-1.5 space-y-0.5">
              <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: `${entry.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/70">
                {entry.progressPercent}% · {timeAgo}
              </span>
            </div>
          )}
          {!isContinue && (
            <span className="text-[10px] text-muted-foreground/60">{timeAgo}</span>
          )}
        </div>

        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/50 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

export default function Music() {
  const { data: songs = [], isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs/library"],
  });

  const { continueListening, recentlyPlayed, recommendations } = useMusicPlayer();

  const today = new Date().toISOString().split("T")[0];
  const featured = songs.find(
    (s) =>
      s.featuredWeekStart &&
      s.featuredWeekEnd &&
      s.featuredWeekStart <= today &&
      s.featuredWeekEnd >= today,
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Music2 className="w-5 h-5 text-amber-600" />
          <span className="text-xs uppercase font-bold tracking-widest text-amber-600">
            SpiritTone Records
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          SpiritTone Music
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Scripture-based devotional music to uplift, encourage, and strengthen your faith.
        </p>
      </div>

      {/* Continue Listening */}
      {continueListening.length > 0 && (
        <div className="space-y-2" data-testid="section-continue-listening">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            Continue Listening
          </h2>
          <div className="space-y-2">
            {continueListening.slice(0, 3).map((entry) => (
              <RecentCard key={entry.songId} entry={entry} isContinue />
            ))}
          </div>
        </div>
      )}

      {/* Song of the Week */}
      {featured && (
        <div className="space-y-2">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
            Song of the Week
          </h2>
          <SongCard song={featured} isFeatured />
        </div>
      )}

      {/* Recommended For You */}
      {recommendations.length > 0 && (
        <div className="space-y-2" data-testid="section-recommendations">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Recommended For You
          </h2>
          <div className="space-y-3">
            {recommendations.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <div className="space-y-2" data-testid="section-recently-played">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recently Played
          </h2>
          <div className="space-y-2">
            {recentlyPlayed.slice(0, 10).map((entry) => (
              <RecentCard key={entry.songId} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Music Library */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Music Library
          {songs.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({songs.length} {songs.length === 1 ? "song" : "songs"})
            </span>
          )}
        </h2>
        {songs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Music2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">No songs available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} isFeatured={song.id === featured?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
