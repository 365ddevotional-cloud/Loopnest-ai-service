import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, MapPin, Globe, Info, Settings, Loader2, Mic2, Megaphone, Heart, Pin } from "lucide-react";
import type { Church, ChurchMember, ChurchAnnouncement, ChurchSermon } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];

export default function ChurchHome() {
  const [, params] = useRoute("/church/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;

  const { data: church, isLoading: churchLoading } = useQuery<Church>({
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

  const { data: members } = useQuery<ChurchMember[]>({
    queryKey: ["/api/churches", church?.id, "members"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isSignedIn && !!myRole?.role,
  });

  const { data: announcements } = useQuery<ChurchAnnouncement[]>({
    queryKey: ["/api/churches", church?.id, "announcements"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const { data: sermons } = useQuery<ChurchSermon[]>({
    queryKey: ["/api/churches", church?.id, "sermons"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/sermons`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const currentRole = myRole?.role ?? null;
  const isMember = !!currentRole && myRole?.status === "active";
  const isAdmin = ADMIN_ROLES.includes(currentRole ?? "");

  const recentAnnouncements = announcements?.slice(0, 3) ?? [];
  const recentSermons = sermons?.slice(0, 2) ?? [];

  if (churchLoading) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} />
        </div>
      </ChurchModeShell>
    );
  }

  if (!church) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="text-center py-20 space-y-4">
          <Building2 className="w-14 h-14 mx-auto" style={{ color: "#c9b99060" }} />
          <div>
            <p className="font-semibold text-lg" style={{ color: "#1a2744" }}>Church not found</p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>This church space may have been removed or the link is incorrect.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/church")}>Return to Church Mode</Button>
        </div>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church} currentRole={currentRole}>
      <div className="space-y-6">

        {/* Church Identity Banner */}
        <Card className="overflow-hidden border-0 shadow-md" style={{ backgroundColor: "#fff" }}>
          <div className="h-1.5" style={{ background: "linear-gradient(90deg, #1a2744 0%, #2d4270 50%, #b8962e 100%)" }} />
          <CardContent className="pt-5 pb-6 px-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: "#1a274412", border: "2px solid #1a274420" }}>
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <Building2 className="w-8 h-8" style={{ color: "#1a2744" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif font-bold leading-tight" style={{ color: "#1a2744", fontSize: "1.5rem" }}>{church.name}</h2>
                {church.denomination && (
                  <p className="text-sm mt-0.5 font-medium" style={{ color: "#b8962e" }}>{church.denomination}</p>
                )}
                {church.description && (
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: "#5a5450" }}>{church.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3">
                  {church.address && (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "#7a7570" }}>
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {church.address}
                    </span>
                  )}
                  {church.websiteUrl && (
                    <a href={church.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: "#b8962e" }}>
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign-in prompt */}
        {!isSignedIn && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #1a2744" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Info className="w-5 h-5 flex-shrink-0" style={{ color: "#1a2744" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>Sign in to access your church community</p>
                <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>You need to be signed in to view member content.</p>
              </div>
              <Button size="sm" onClick={() => setLocation("/signin")} style={{ backgroundColor: "#1a2744" }}>Sign In</Button>
            </CardContent>
          </Card>
        )}

        {/* Not a member */}
        {isSignedIn && !isMember && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Info className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>You are not a member of this church</p>
                <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>You need an invitation to join this community.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/church/join")}>Join with Code</Button>
            </CardContent>
          </Card>
        )}

        {/* Member dashboard */}
        {isMember && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Members", value: members?.length ?? "—", icon: Users, path: `/church/${slug}/members`, color: "#1a2744" },
                { label: "Sermons", value: sermons?.length ?? "—", icon: Mic2, path: `/church/${slug}/sermons`, color: "#1a2744" },
                { label: "Announcements", value: announcements?.length ?? "—", icon: Megaphone, path: `/church/${slug}/announcements`, color: "#b8962e" },
                { label: "Prayer Wall", value: "Open", icon: Heart, path: `/church/${slug}/prayer`, color: "#7a1520" },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <button key={stat.label} onClick={() => setLocation(stat.path)} className="text-left group" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5" style={{ color: stat.color }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{stat.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{stat.label}</p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>

            {/* Recent Announcements */}
            {recentAnnouncements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-lg" style={{ color: "#1a2744" }}>Announcements</h3>
                  <button onClick={() => setLocation(`/church/${slug}/announcements`)} className="text-xs font-medium hover:underline" style={{ color: "#b8962e" }}>
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {recentAnnouncements.map(ann => (
                    <Card key={ann.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-2">
                          {ann.isPinned && <Pin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#b8962e" }} />}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{ann.title}</p>
                            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#5a5450" }}>{ann.body}</p>
                            <p className="text-xs mt-1.5" style={{ color: "#9a9080" }}>
                              {new Date(ann.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sermons */}
            {recentSermons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-lg" style={{ color: "#1a2744" }}>Recent Sermons</h3>
                  <button onClick={() => setLocation(`/church/${slug}/sermons`)} className="text-xs font-medium hover:underline" style={{ color: "#b8962e" }}>
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {recentSermons.map(sermon => (
                    <Card key={sermon.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "#1a274412" }}>
                            <Mic2 className="w-5 h-5" style={{ color: "#1a2744" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{sermon.title}</p>
                            {sermon.speakerName && <p className="text-xs mt-0.5" style={{ color: "#b8962e" }}>{sermon.speakerName}</p>}
                            {sermon.bibleReference && <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{sermon.bibleReference}</p>}
                            {sermon.sermonDate && (
                              <p className="text-xs mt-1" style={{ color: "#9a9080" }}>
                                {new Date(sermon.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Admin quick action */}
            {isAdmin && (
              <button onClick={() => setLocation(`/church/${slug}/admin`)} className="w-full text-left group" data-testid="card-church-admin-link">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: "#1a2744" }}>
                  <CardContent className="pt-4 pb-4 px-5 flex items-center gap-3">
                    <Settings className="w-5 h-5 flex-shrink-0" style={{ color: "#d4a83a" }} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: "#f5ede0" }}>Church Administration</p>
                      <p className="text-xs mt-0.5" style={{ color: "#f5ede070" }}>Manage sermons, announcements, members &amp; settings</p>
                    </div>
                    <Settings className="w-4 h-4 opacity-40" style={{ color: "#d4a83a" }} />
                  </CardContent>
                </Card>
              </button>
            )}
          </>
        )}
      </div>
    </ChurchModeShell>
  );
}
