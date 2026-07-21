import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic2, BookOpen, Calendar, Play, Headphones, Loader2, AlertCircle } from "lucide-react";
import type { Church, ChurchSermon } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

export default function ChurchSermons() {
  const [, params] = useRoute("/church/:slug/sermons");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: () => fetch(`/api/churches/slug/${slug}`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });

  const { data: myRole } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const { data: sermons, isLoading } = useQuery<ChurchSermon[]>({
    queryKey: ["/api/churches", church?.id, "sermons"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/sermons`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isMember = !!myRole?.role && myRole.status === "active";

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274412" }}>
            <Mic2 className="w-5 h-5" style={{ color: "#1a2744" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Sermons</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>
              {sermons?.length ?? 0} {sermons?.length === 1 ? "sermon" : "sermons"} available
            </p>
          </div>
        </div>

        {!isMember ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>You must be a member to view sermons.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !sermons?.length ? (
          <div className="text-center py-16">
            <Mic2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
            <p className="font-semibold" style={{ color: "#1a2744" }}>No sermons yet</p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>Sermon recordings and notes will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sermons.map(sermon => (
              <Card key={sermon.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                <div className="h-0.5" style={{ backgroundColor: "#1a274418" }} />
                <CardContent className="pt-5 pb-5 px-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: "#1a274412", border: "1px solid #1a274418" }}>
                      <Mic2 className="w-6 h-6" style={{ color: "#1a2744" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-base leading-snug" style={{ color: "#1a2744" }}>{sermon.title}</h3>
                        {sermon.sermonDate && (
                          <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: "#9a9080" }}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(sermon.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {sermon.speakerName && (
                          <Badge variant="outline" className="text-xs font-normal" style={{ borderColor: "#b8962e50", color: "#b8962e" }}>
                            {sermon.speakerName}
                          </Badge>
                        )}
                        {sermon.bibleReference && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#7a7570" }}>
                            <BookOpen className="w-3.5 h-3.5" />
                            {sermon.bibleReference}
                          </span>
                        )}
                      </div>

                      {sermon.description && (
                        <p className="text-sm mt-2 leading-relaxed line-clamp-3" style={{ color: "#5a5450" }}>
                          {sermon.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {sermon.videoUrl && (
                          <a href={sermon.videoUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                            style={{ backgroundColor: "#1a274412", color: "#1a2744" }}
                            data-testid={`link-sermon-video-${sermon.id}`}>
                            <Play className="w-3.5 h-3.5" />
                            Watch Video
                          </a>
                        )}
                        {sermon.audioUrl && (
                          <a href={sermon.audioUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                            style={{ backgroundColor: "#b8962e15", color: "#b8962e" }}
                            data-testid={`link-sermon-audio-${sermon.id}`}>
                            <Headphones className="w-3.5 h-3.5" />
                            Listen
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
