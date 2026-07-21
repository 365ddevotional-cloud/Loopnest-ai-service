import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pin, Calendar, Loader2, AlertCircle } from "lucide-react";
import type { Church, ChurchAnnouncement } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

export default function ChurchAnnouncements() {
  const [, params] = useRoute("/church/:slug/announcements");
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

  const { data: announcements, isLoading } = useQuery<ChurchAnnouncement[]>({
    queryKey: ["/api/churches", church?.id, "announcements"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isMember = !!myRole?.role && myRole.status === "active";
  const pinned = announcements?.filter(a => a.isPinned) ?? [];
  const regular = announcements?.filter(a => !a.isPinned) ?? [];

  const formatDate = (d: string | Date | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
            <Megaphone className="w-5 h-5" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Announcements</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>
              Church bulletins and updates
            </p>
          </div>
        </div>

        {!isMember ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>You must be a member to view announcements.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !announcements?.length ? (
          <div className="text-center py-16">
            <Megaphone className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
            <p className="font-semibold" style={{ color: "#1a2744" }}>No announcements yet</p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>Church announcements and bulletins will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4" style={{ color: "#b8962e" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#b8962e" }}>Pinned</span>
                </div>
                {pinned.map(ann => (
                  <Card key={ann.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                    <div className="h-0.5" style={{ backgroundColor: "#b8962e" }} />
                    <CardContent className="pt-5 pb-5 px-5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-base" style={{ color: "#1a2744" }}>{ann.title}</h3>
                        <Badge className="text-xs flex-shrink-0" style={{ backgroundColor: "#b8962e20", color: "#b8962e", border: "1px solid #b8962e30" }}>
                          Pinned
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "#5a5450" }}>{ann.body}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: "#9a9080" }}>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(ann.createdAt)}</span>
                        {ann.expiresAt && <span>Expires {formatDate(ann.expiresAt)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {regular.length > 0 && (
              <div className="space-y-3">
                {pinned.length > 0 && (
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>Recent</span>
                )}
                {regular.map(ann => (
                  <Card key={ann.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                    <CardContent className="pt-5 pb-5 px-5">
                      <h3 className="font-semibold text-base" style={{ color: "#1a2744" }}>{ann.title}</h3>
                      <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "#5a5450" }}>{ann.body}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: "#9a9080" }}>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(ann.createdAt)}</span>
                        {ann.expiresAt && <span>Expires {formatDate(ann.expiresAt)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
