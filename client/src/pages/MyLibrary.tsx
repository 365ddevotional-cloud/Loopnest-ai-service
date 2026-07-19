import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookMarked, Heart, Download, Play, ExternalLink, Trash2, Music2, UserCircle } from "lucide-react";
import type { Song } from "@shared/schema";

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

      <p className="text-[11px] text-muted-foreground/50 text-center">
        My Library syncs across all your signed-in devices automatically.
      </p>
    </div>
  );
}
