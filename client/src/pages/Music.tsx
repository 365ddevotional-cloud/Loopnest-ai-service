import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Music2, Play, ExternalLink, Loader2, Clock, RotateCcw, Sparkles,
  Search, ListMusic, X, ChevronDown,
} from "lucide-react";
import type { Song, SongCollection } from "@shared/schema";
import { useMusicPlayer, type RecentlyPlayedEntry } from "@/contexts/MusicPlayerContext";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMusicLibrary, saveMusicLibrary,
  getMusicCollections, saveMusicCollections,
} from "@/lib/offlineDb";

const CUSTOM_LANG = "__custom__";

function SongCard({
  song,
  isFeatured,
  onPlay,
}: {
  song: Song;
  isFeatured?: boolean;
  onPlay?: (song: Song) => void;
}) {
  const [, setLocation] = useLocation();
  // Track whether this thumbnail has failed so we never retry it
  const [imgBroken, setImgBroken] = useState(false);

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
        isFeatured
          ? "border-amber-300/60 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 dark:border-amber-800/40"
          : "border-border/50 bg-card hover:border-primary/20"
      }`}
      data-testid={`card-song-library-${song.id}`}
      onClick={() => {
        if (onPlay) onPlay(song);
        setLocation(`/music/${song.slug}`);
      }}
    >
      <div
        className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f0d080 0%, #c89820 100%)" }}
      >
        {song.coverImageUrl && !imgBroken ? (
          <img
            src={song.coverImageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgBroken(true)}
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
  );
}

function RecentCard({ entry, isContinue }: { entry: RecentlyPlayedEntry; isContinue?: boolean }) {
  const [imgBroken, setImgBroken] = useState(false);

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
          {entry.coverImageUrl && !imgBroken ? (
            <img
              src={entry.coverImageUrl}
              alt={entry.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setImgBroken(true)}
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
  // ── IndexedDB cache: load last-known good data so the page is never blank ──
  const [cachedSongs, setCachedSongs] = useState<Song[]>([]);
  const [cachedCollections, setCachedCollections] = useState<(SongCollection & { songs?: Song[] })[]>([]);

  useEffect(() => {
    getMusicLibrary().then((data) => {
      if (data.length) setCachedSongs(data as Song[]);
    }).catch(() => {});
    getMusicCollections().then((data) => {
      if (data.length) setCachedCollections(data as (SongCollection & { songs?: Song[] })[]);
    }).catch(() => {});
  }, []);

  // ── Network queries (stale-while-revalidate via service worker) ────────────
  const { data: fetchedSongs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs/library"],
  });

  const { data: fetchedCollections } = useQuery<(SongCollection & { songs?: Song[] })[]>({
    queryKey: ["/api/songs/collections"],
  });

  // Merge: prefer fresh network data; fall back to IndexedDB cache
  const songs: Song[] = fetchedSongs ?? cachedSongs;
  const collections: (SongCollection & { songs?: Song[] })[] = fetchedCollections ?? cachedCollections;

  // ── Persist successful network responses to IndexedDB ─────────────────────
  useEffect(() => {
    if (fetchedSongs && fetchedSongs.length) {
      saveMusicLibrary(fetchedSongs).catch(() => {});
    }
  }, [fetchedSongs]);

  useEffect(() => {
    if (fetchedCollections && fetchedCollections.length) {
      saveMusicCollections(fetchedCollections).catch(() => {});
    }
  }, [fetchedCollections]);

  const { continueListening, recentlyPlayed, recommendations, settings, setQueue, playSong } = useMusicPlayer();

  // Filter state
  const [search, setSearch] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterGenre, setFilterGenre] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const featured = songs.find(
    (s) =>
      s.featuredWeekStart &&
      s.featuredWeekEnd &&
      s.featuredWeekStart <= today &&
      s.featuredWeekEnd >= today,
  );

  // Build unique filter options from songs
  const languages = useMemo(() => {
    const langs = [...new Set(songs.map(s => s.language).filter(Boolean))] as string[];
    return langs.sort();
  }, [songs]);

  const genres = useMemo(() => {
    const gs = [...new Set(songs.map(s => s.genre).filter(Boolean))] as string[];
    return gs.sort();
  }, [songs]);

  const songTypes = useMemo(() => {
    const ts = [...new Set(songs.map(s => (s as any).songType).filter(Boolean))] as string[];
    return ts.sort();
  }, [songs]);

  // Filtered songs
  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
          !(s.artist ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterLanguage !== "all" && s.language !== filterLanguage) return false;
      if (filterGenre !== "all" && s.genre !== filterGenre) return false;
      if (filterType !== "all" && (s as any).songType !== filterType) return false;
      return true;
    });
  }, [songs, search, filterLanguage, filterGenre, filterType]);

  const hasActiveFilters = search || filterLanguage !== "all" || filterGenre !== "all" || filterType !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterLanguage("all");
    setFilterGenre("all");
    setFilterType("all");
  };

  // Play All: set the queue to filteredSongs and play the first
  const handlePlayAll = () => {
    const playable = filteredSongs.filter(s => s.audioUrl && s.isActive);
    if (playable.length === 0) return;
    setQueue(playable, 0);
    playSong(playable[0]);
  };

  // When user clicks a song card in the library: set queue to filtered list starting at that song
  const handleSongClick = (song: Song) => {
    const playable = filteredSongs.filter(s => s.audioUrl && s.isActive);
    const idx = playable.findIndex(s => s.id === song.id);
    if (idx >= 0 && (settings.repeatMode === "play-all" || settings.repeatMode === "all")) {
      setQueue(playable, idx);
    }
  };

  // Show a spinner only when the network is still loading AND we have no cached
  // data at all (first-ever visit, nothing in SW cache or IndexedDB)
  if (songsLoading && songs.length === 0) {
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
          <SongCard song={featured} isFeatured onPlay={handleSongClick} />
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
              <SongCard key={song.id} song={song} onPlay={handleSongClick} />
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

      {/* Collections */}
      {collections.filter(c => c.isPublished).length > 0 && (
        <div className="space-y-3" data-testid="section-collections">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="text-amber-500">♫</span>
            Collections
          </h2>
          {collections.filter(c => c.isPublished).map(col => (
            <div key={col.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-3 border-b border-border/30">
                {col.coverImageUrl && (
                  <img
                    src={col.coverImageUrl}
                    alt={col.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{col.title}</p>
                  {col.description && <p className="text-xs text-muted-foreground truncate">{col.description}</p>}
                </div>
                {col.releaseDate && <span className="text-xs text-muted-foreground flex-shrink-0">{col.releaseDate}</span>}
                {/* Play all in collection */}
                {col.songs && col.songs.filter(s => s.audioUrl && s.isActive).length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-amber-600"
                    onClick={() => {
                      const playable = col.songs!.filter(s => s.audioUrl && s.isActive);
                      setQueue(playable, 0);
                      playSong(playable[0]);
                    }}
                  >
                    <Play className="w-3 h-3" />
                    Play All
                  </Button>
                )}
              </div>
              {col.songs && col.songs.length > 0 && (
                <div className="p-2 space-y-1">
                  {col.songs.map(song => <SongCard key={song.id} song={song} onPlay={handleSongClick} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Music Library */}
      <div className="space-y-3">
        {/* Library header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-serif text-lg font-semibold text-foreground flex-1 min-w-0">
            Music Library
            {filteredSongs.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredSongs.length}{hasActiveFilters && songs.length !== filteredSongs.length ? ` of ${songs.length}` : ""}{" "}
                {filteredSongs.length === 1 ? "song" : "songs"})
              </span>
            )}
          </h2>

          {/* Play All button */}
          {filteredSongs.filter(s => s.audioUrl && s.isActive).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 flex-shrink-0"
              onClick={handlePlayAll}
              data-testid="button-play-all"
            >
              <ListMusic className="w-3.5 h-3.5" />
              Play All
            </Button>
          )}

          {/* Filter toggle */}
          <Button
            size="sm"
            variant={showFilters || hasActiveFilters ? "secondary" : "ghost"}
            className="h-8 px-2.5 gap-1 text-xs flex-shrink-0"
            onClick={() => setShowFilters(v => !v)}
            data-testid="button-toggle-filters"
          >
            <Search className="w-3.5 h-3.5" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search songs or artists…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-song-search"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Language filter */}
              {languages.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Language:</label>
                  <select
                    value={filterLanguage}
                    onChange={e => setFilterLanguage(e.target.value)}
                    className="text-xs h-7 px-2 rounded-md border border-border bg-background"
                    data-testid="select-filter-language"
                  >
                    <option value="all">All</option>
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              {/* Genre filter */}
              {genres.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Genre:</label>
                  <select
                    value={filterGenre}
                    onChange={e => setFilterGenre(e.target.value)}
                    className="text-xs h-7 px-2 rounded-md border border-border bg-background"
                    data-testid="select-filter-genre"
                  >
                    <option value="all">All</option>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}

              {/* Song Type filter */}
              {songTypes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Type:</label>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="text-xs h-7 px-2 rounded-md border border-border bg-background"
                    data-testid="select-filter-type"
                  >
                    <option value="all">All</option>
                    {songTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {filteredSongs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Music2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            {hasActiveFilters ? (
              <>
                <p className="text-muted-foreground">No songs match your filters.</p>
                <button onClick={clearFilters} className="text-primary text-sm hover:underline">
                  Clear filters
                </button>
              </>
            ) : (
              <p className="text-muted-foreground">No songs available yet. Check back soon.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isFeatured={song.id === featured?.id}
                onPlay={handleSongClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
