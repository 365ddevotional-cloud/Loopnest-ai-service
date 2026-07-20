import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookMarked, Heart, Download, Play, ExternalLink, Trash2, Music2, UserCircle, Clock, BookOpen, Flame, Share2, Bookmark, HandHeart, CheckCircle2, Pencil, X } from "lucide-react";
import { Link } from "wouter";
import type { Song, Devotional, PrayerRequest } from "@shared/schema";
import { ShareButton } from "@/components/ShareButton";
import { format, parseISO } from "date-fns";
import { useState } from "react";

interface LibraryEntry {
  id: number;
  songId: number;
  firebaseUid: string;
  savedAt?: string | null;
  createdAt?: string | null;
  downloadedAt?: string | null;
  song: Song;
}

function SongCard({
  entry,
  onRemove,
  removePending,
  showDownloadDate,
}: {
  entry: LibraryEntry;
  onRemove: () => void;
  removePending: boolean;
  showDownloadDate?: boolean;
}) {
  const [, setLocation] = useLocation();
  const song = entry.song;
  const hasCover = !!song.coverImageUrl;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors"
      data-testid={`card-library-song-${song.id}`}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center">
        {hasCover ? (
          <img src={song.coverImageUrl!} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music2 className="w-5 h-5 text-amber-800/60" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{song.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {song.labelName}{song.scriptureReference ? ` · ${song.scriptureReference}` : ""}
        </div>
        {showDownloadDate && entry.downloadedAt && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            Downloaded {new Date(entry.downloadedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {song.audioUrl && (
          <Button
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0"
            onClick={() => setLocation(`/music/${song.slug}`)}
            data-testid={`button-library-play-${song.id}`}
            title="Open song"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="w-8 h-8 p-0"
          onClick={() => setLocation(`/music/${song.slug}`)}
          data-testid={`button-library-open-${song.id}`}
          title="Open song page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          disabled={removePending}
          data-testid={`button-library-remove-${song.id}`}
          title="Remove from library"
        >
          {removePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

async function authedFetch(path: string, getIdToken: () => Promise<string | null>, options: RequestInit = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
}

export default function MyLibrary() {
  const [, setLocation] = useLocation();
  const { user, loading, emailVerified, getIdToken, signUserOut } = useUser();

  const { data: savedSongs = [], isLoading: savedLoading } = useQuery<LibraryEntry[]>({
    queryKey: ["/api/user/library/saved"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/library/saved", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: favoriteSongs = [], isLoading: favsLoading } = useQuery<LibraryEntry[]>({
    queryKey: ["/api/user/library/favorites"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/library/favorites", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: downloadHistory = [], isLoading: downloadsLoading } = useQuery<LibraryEntry[]>({
    queryKey: ["/api/user/library/downloads"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/library/downloads", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: savedDevotionals = [], isLoading: savedDevsLoading } = useQuery<(any & { devotional: Devotional })[]>({
    queryKey: ["/api/user/devotional/saved"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/devotional/saved", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: devHistory = [], isLoading: devHistoryLoading } = useQuery<(any & { devotional: Devotional })[]>({
    queryKey: ["/api/user/devotional/history"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/devotional/history", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: streakData } = useQuery<{ currentStreak: number; longestStreak: number; lastReadDate: string | null }>({
    queryKey: ["/api/user/devotional/streak"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/devotional/streak", getIdToken);
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, lastReadDate: null };
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const { data: myPrayers = [], isLoading: prayersLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/user/prayers"],
    queryFn: async () => {
      const res = await authedFetch("/api/user/prayers", getIdToken);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && emailVerified,
  });

  const answerPrayerMutation = useMutation({
    mutationFn: async ({ id, answerNote }: { id: number; answerNote?: string }) => {
      const res = await authedFetch(`/api/user/prayers/${id}/answered`, getIdToken, {
        method: "POST",
        body: JSON.stringify({ answerNote }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/prayers"] }),
  });

  const withdrawPrayerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authedFetch(`/api/user/prayers/${id}`, getIdToken, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/prayers"] }),
  });

  const editPrayerMutation = useMutation({
    mutationFn: async ({ id, subject, message }: { id: number; subject?: string; message: string }) => {
      const res = await authedFetch(`/api/user/prayers/${id}`, getIdToken, {
        method: "PATCH",
        body: JSON.stringify({ subject, message }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/prayers"] }),
  });

  const unsaveDevMutation = useMutation({
    mutationFn: async (devotionalId: number) => {
      const res = await authedFetch(`/api/user/devotional/saved/${devotionalId}`, getIdToken, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] }),
  });

  const unsaveMutation = useMutation({
    mutationFn: async (songId: number) => {
      const res = await authedFetch(`/api/user/library/saved/${songId}`, getIdToken, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] }),
  });

  const unfavoriteMutation = useMutation({
    mutationFn: async (songId: number) => {
      const res = await authedFetch(`/api/user/library/favorites/${songId}`, getIdToken, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] }),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !emailVerified) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <UserCircle className="w-14 h-14 mx-auto text-primary/40" />
        <h2 className="font-serif text-2xl text-primary">My Library</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your free account to access your saved songs, favorites, and download history — on any device.
        </p>
        <Button onClick={() => setLocation("/signin?return=/my-library")} data-testid="button-library-signin">
          Sign In or Create Account
        </Button>
      </div>
    );
  }

  const isLoading = savedLoading || favsLoading || downloadsLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-primary">My Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signUserOut}
          data-testid="button-library-signout"
        >
          Sign Out
        </Button>
      </div>

      {/* Reading Streak */}
      {streakData && (streakData.currentStreak ?? 0) > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40" data-testid="section-reading-streak">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <div className="font-bold text-lg text-orange-700 dark:text-orange-400 leading-none">{streakData.currentStreak} {streakData.currentStreak === 1 ? "day" : "days"}</div>
              <div className="text-xs text-muted-foreground">Current streak</div>
            </div>
          </div>
          {(streakData.longestStreak ?? 0) > 1 && (
            <div className="border-l border-amber-200/60 dark:border-amber-800/40 pl-4">
              <div className="font-semibold text-sm text-foreground">{streakData.longestStreak} days</div>
              <div className="text-xs text-muted-foreground">Longest streak</div>
            </div>
          )}
          <p className="ml-auto text-xs text-muted-foreground italic hidden sm:block">Keep growing in God's Word.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Saved Songs */}
      <section data-testid="section-saved-songs">
        <div className="flex items-center gap-2 mb-3">
          <BookMarked className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg text-foreground">Saved Songs</h2>
          {savedSongs.length > 0 && (
            <Badge variant="secondary" className="text-xs">{savedSongs.length}</Badge>
          )}
        </div>
        {!savedLoading && savedSongs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-xl">
            No saved songs yet. Visit any song page and tap "Save to My Library."
          </p>
        ) : (
          <div className="space-y-2">
            {savedSongs.map((entry) => (
              <SongCard
                key={entry.id}
                entry={entry}
                onRemove={() => unsaveMutation.mutate(entry.songId)}
                removePending={unsaveMutation.isPending && unsaveMutation.variables === entry.songId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Favorite Songs */}
      <section data-testid="section-favorite-songs">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-rose-500" />
          <h2 className="font-serif text-lg text-foreground">Favorite Songs</h2>
          {favoriteSongs.length > 0 && (
            <Badge variant="secondary" className="text-xs">{favoriteSongs.length}</Badge>
          )}
        </div>
        {!favsLoading && favoriteSongs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-xl">
            No favorites yet. Tap the heart icon on any song to add it here.
          </p>
        ) : (
          <div className="space-y-2">
            {favoriteSongs.map((entry) => (
              <SongCard
                key={entry.id}
                entry={entry}
                onRemove={() => unfavoriteMutation.mutate(entry.songId)}
                removePending={unfavoriteMutation.isPending && unfavoriteMutation.variables === entry.songId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Download History */}
      <section data-testid="section-download-history">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg text-foreground">Download History</h2>
          {downloadHistory.length > 0 && (
            <Badge variant="secondary" className="text-xs">{downloadHistory.length}</Badge>
          )}
        </div>
        {!downloadsLoading && downloadHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-xl">
            No downloads recorded. Download a free promotional song to see it here.
          </p>
        ) : (
          <div className="space-y-2">
            {downloadHistory.map((entry) => (
              <SongCard
                key={entry.id}
                entry={entry}
                onRemove={() => {}}
                removePending={false}
                showDownloadDate
              />
            ))}
          </div>
        )}
      </section>

      {/* Saved Devotionals */}
      <section data-testid="section-saved-devotionals">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg text-foreground">Saved Devotionals</h2>
          {savedDevotionals.length > 0 && (
            <Badge variant="secondary" className="text-xs">{savedDevotionals.length}</Badge>
          )}
        </div>
        {savedDevsLoading ? (
          <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : savedDevotionals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-xl">
            No saved devotionals yet. Tap "Save" on any devotional to keep it here.
          </p>
        ) : (
          <div className="space-y-2">
            {savedDevotionals.map((entry: any) => (
              <SavedDevotionalCard
                key={entry.id}
                entry={entry}
                onRemove={() => unsaveDevMutation.mutate(entry.devotionalId)}
                removePending={unsaveDevMutation.isPending && unsaveDevMutation.variables === entry.devotionalId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently Read Devotionals */}
      {devHistory.length > 0 && (
        <section data-testid="section-recently-read">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-secondary" />
            <h2 className="font-serif text-lg text-foreground">Recently Read</h2>
            <Badge variant="secondary" className="text-xs">{Math.min(devHistory.length, 20)}</Badge>
          </div>
          <div className="space-y-2">
            {devHistory.slice(0, 20).map((entry: any) => (
              <RecentlyReadCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* My Prayers */}
      <section data-testid="section-my-prayers">
        <div className="flex items-center gap-2 mb-3">
          <HandHeart className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg text-foreground">My Prayers</h2>
          {myPrayers.length > 0 && (
            <Badge variant="secondary" className="text-xs">{myPrayers.length}</Badge>
          )}
        </div>
        {prayersLoading ? (
          <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : myPrayers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-xl">
            No prayer requests linked to your account yet.{" "}
            <Link href="/prayer" className="underline text-primary/70">Submit a prayer request</Link> while signed in to track it here.
          </p>
        ) : (
          <div className="space-y-3">
            {myPrayers.map((prayer) => (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                onAnswer={(id, note) => answerPrayerMutation.mutate({ id, answerNote: note })}
                onWithdraw={(id) => withdrawPrayerMutation.mutate(id)}
                onEdit={(id, subject, message) => editPrayerMutation.mutate({ id, subject, message: message ?? "" })}
                answerPending={answerPrayerMutation.isPending}
                withdrawPending={withdrawPrayerMutation.isPending && withdrawPrayerMutation.variables === prayer.id}
                editPending={editPrayerMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <RecentlyPlayedSection />

      <p className="text-[11px] text-muted-foreground/50 text-center">
        My Library syncs across all your signed-in devices automatically.
      </p>
    </div>
  );
}

function RecentlyPlayedSection() {
  const { recentlyPlayed } = useMusicPlayer();

  if (recentlyPlayed.length === 0) return null;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <section data-testid="section-recently-played-library">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-serif text-lg text-foreground">Recently Played</h2>
        <Badge variant="secondary" className="text-xs">{recentlyPlayed.length}</Badge>
      </div>
      <div className="space-y-2">
        {recentlyPlayed.slice(0, 10).map((entry) => (
          <Link key={entry.songId} href={`/music/${entry.slug}`}>
            <div
              className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer"
              data-testid={`card-recent-library-${entry.songId}`}
            >
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center">
                {entry.coverImageUrl ? (
                  <img src={entry.coverImageUrl} alt={entry.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-4 h-4 text-amber-800/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">{entry.title}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(entry.lastPlayedAt)}</div>
                {entry.duration > 0 && entry.progressPercent > 0 && (
                  <div className="mt-1 w-full h-1 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${entry.progressPercent}%` }} />
                  </div>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SavedDevotionalCard({
  entry,
  onRemove,
  removePending,
}: {
  entry: any & { devotional: Devotional };
  onRemove: () => void;
  removePending: boolean;
}) {
  const [, setLocation] = useLocation();
  const dev = entry.devotional as Devotional;
  const preview = dev.content?.slice(0, 100) + (dev.content?.length > 100 ? "…" : "");

  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors"
      data-testid={`card-saved-devotional-${dev.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-primary/70 font-semibold uppercase tracking-wide mb-0.5">
            {format(parseISO(dev.date), "MMMM d, yyyy")}
          </div>
          <div className="font-serif font-semibold text-foreground truncate">{dev.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{dev.scriptureReference}</div>
          <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{preview}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={() => setLocation(`/devotional/${dev.date}`)}
          data-testid={`button-open-saved-devotional-${dev.id}`}
        >
          <BookOpen className="w-3 h-3" />
          Open
        </Button>
        <ShareButton
          title={dev.title}
          text={`${dev.title}\n${dev.scriptureReference}\n\n${dev.content}`}
          className="text-xs h-8 px-3 gap-1"
        />
        <Button
          size="sm"
          variant="ghost"
          className="text-xs gap-1 text-muted-foreground hover:text-destructive ml-auto"
          onClick={onRemove}
          disabled={removePending}
          data-testid={`button-remove-saved-devotional-${dev.id}`}
        >
          {removePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Remove
        </Button>
      </div>
    </div>
  );
}

function RecentlyReadCard({ entry }: { entry: any & { devotional: Devotional } }) {
  const [, setLocation] = useLocation();
  const dev = entry.devotional as Devotional;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(entry.lastOpenedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => setLocation(`/devotional/${dev.date}`)}
      data-testid={`card-recently-read-${dev.id}`}
    >
      <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-primary/10">
        <BookOpen className="w-4 h-4 text-primary/50" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-primary/60 font-medium">{format(parseISO(dev.date), "MMM d, yyyy")}</div>
        <div className="font-semibold text-sm text-foreground truncate">{dev.title}</div>
        <div className="text-xs text-muted-foreground">{dev.scriptureReference} · {timeAgo}</div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
    </div>
  );
}

const PRAYER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Submitted", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
  replied: { label: "Being Prayed For", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" },
  answered: { label: "Answered", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" },
  closed: { label: "Closed", color: "text-muted-foreground bg-muted/40" },
};

function PrayerCard({
  prayer,
  onAnswer,
  onWithdraw,
  onEdit,
  answerPending,
  withdrawPending,
  editPending,
}: {
  prayer: PrayerRequest;
  onAnswer: (id: number, note?: string) => void;
  onWithdraw: (id: number) => void;
  onEdit: (id: number, subject?: string, message?: string) => void;
  answerPending: boolean;
  withdrawPending: boolean;
  editPending: boolean;
}) {
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerNote, setAnswerNote] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editSubject, setEditSubject] = useState(prayer.subject ?? "");
  const [editMessage, setEditMessage] = useState(prayer.message);

  const statusInfo = PRAYER_STATUS_LABELS[prayer.status] ?? PRAYER_STATUS_LABELS.closed;
  const canEdit = prayer.status === "new";
  const canWithdraw = prayer.status === "new";
  const canAnswer = prayer.status !== "answered" && prayer.status !== "closed";
  const summary = prayer.subject || prayer.message.slice(0, 80) + (prayer.message.length > 80 ? "…" : "");

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl border border-border/40 bg-card"
      data-testid={`card-prayer-${prayer.id}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-0.5">
            {prayer.createdAt ? format(new Date(prayer.createdAt), "MMM d, yyyy") : ""}
          </div>
          <div className="font-semibold text-sm text-foreground">{summary}</div>
          {prayer.category && (
            <div className="text-xs text-muted-foreground/70 capitalize mt-0.5">{prayer.category}</div>
          )}
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Answered note */}
      {prayer.status === "answered" && prayer.answerNote && (
        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 italic">
          "{prayer.answerNote}"
        </div>
      )}

      {/* Edit form */}
      {showEdit && (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <div className="text-xs font-medium text-muted-foreground">Edit your prayer request</div>
          <input
            className="w-full text-sm border border-border/50 rounded-lg px-3 py-1.5 bg-background"
            placeholder="Subject (optional)"
            value={editSubject}
            onChange={e => setEditSubject(e.target.value)}
            data-testid={`input-prayer-subject-${prayer.id}`}
          />
          <textarea
            className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 bg-background resize-none"
            rows={3}
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            data-testid={`input-prayer-message-${prayer.id}`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs gap-1"
              disabled={editPending}
              onClick={() => { onEdit(prayer.id, editSubject || undefined, editMessage); setShowEdit(false); }}
              data-testid={`button-save-prayer-edit-${prayer.id}`}
            >
              {editPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save changes
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowEdit(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Mark as answered form */}
      {showAnswerForm && (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400">God has answered this prayer!</div>
          <textarea
            className="w-full text-sm border border-border/50 rounded-lg px-3 py-2 bg-background resize-none"
            rows={2}
            placeholder="Briefly describe how God answered (optional)…"
            value={answerNote}
            onChange={e => setAnswerNote(e.target.value)}
            data-testid={`input-prayer-answer-note-${prayer.id}`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={answerPending}
              onClick={() => { onAnswer(prayer.id, answerNote || undefined); setShowAnswerForm(false); }}
              data-testid={`button-confirm-answered-${prayer.id}`}
            >
              {answerPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Mark as Answered
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowAnswerForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showEdit && !showAnswerForm && (
        <div className="flex items-center gap-2 flex-wrap border-t border-border/20 pt-2">
          <Link href="/prayer">
            <Button size="sm" variant="outline" className="text-xs gap-1 h-7" data-testid={`button-open-prayer-${prayer.id}`}>
              <ExternalLink className="w-3 h-3" />
              View Thread
            </Button>
          </Link>
          {canAnswer && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 h-7 text-amber-600 hover:text-amber-700"
              onClick={() => setShowAnswerForm(true)}
              data-testid={`button-answer-prayer-${prayer.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Answered
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 h-7 text-muted-foreground"
              onClick={() => setShowEdit(true)}
              data-testid={`button-edit-prayer-${prayer.id}`}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>
          )}
          {canWithdraw && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 h-7 text-muted-foreground hover:text-destructive ml-auto"
              disabled={withdrawPending}
              onClick={() => onWithdraw(prayer.id)}
              data-testid={`button-withdraw-prayer-${prayer.id}`}
            >
              {withdrawPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Withdraw
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
