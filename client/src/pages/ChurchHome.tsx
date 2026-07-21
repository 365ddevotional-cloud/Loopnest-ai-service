import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, MapPin, Globe, Info, Settings, Loader2,
  Mic2, Megaphone, Heart, Pin, Calendar, ExternalLink, FileText, Image as ImageIcon,
} from "lucide-react";
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

  const pinnedAnnouncements = announcements?.filter(a => a.isPinned) ?? [];
  const recentAnnouncements = announcements?.filter(a => !a.isPinned).slice(0, 3) ?? [];
  const displayAnnouncements = [...pinnedAnnouncements, ...recentAnnouncements].slice(0, 4);
  const upcomingSermons = sermons?.filter(s => s.scheduledDate && new Date(s.scheduledDate) > new Date()).slice(0, 2) ?? [];
  const recentSermons = sermons?.filter(s => !s.scheduledDate || new Date(s.scheduledDate) <= new Date()).slice(0, 2) ?? [];

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

  const themeColor = church.themeColor ?? "#1a2744";

  return (
    <ChurchModeShell church={church} currentRole={currentRole}>
      <div className="space-y-6">

        {/* Church Identity Banner */}
        <Card className="overflow-hidden border-0 shadow-md" style={{ backgroundColor: "#fff" }}>
          {church.bannerUrl ? (
            <div className="relative h-36 sm:h-44 overflow-hidden">
              <img src={church.bannerUrl} alt={church.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 100%)" }} />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end gap-3">
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-md"
                    style={{ border: "2px solid rgba(255,255,255,0.4)" }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ backgroundColor: themeColor, border: "2px solid rgba(255,255,255,0.3)" }}>
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif font-bold text-white leading-tight text-xl drop-shadow">{church.name}</h2>
                  {church.denomination && (
                    <p className="text-xs font-medium mt-0.5" style={{ color: "#f5c842" }}>{church.denomination}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${themeColor} 0%, #b8962e 100%)` }} />
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                    style={{ border: `2px solid ${themeColor}20` }}>
                    {church.logoUrl ? (
                      <img src={church.logoUrl} alt={church.name} className="w-16 h-16 object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8" style={{ color: themeColor }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif font-bold leading-tight" style={{ color: "#1a2744", fontSize: "1.5rem" }}>{church.name}</h2>
                    {church.denomination && (
                      <p className="text-sm mt-0.5 font-medium" style={{ color: "#b8962e" }}>{church.denomination}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}
          {/* Info row below banner */}
          {(church.description || church.address || church.websiteUrl) && (
            <CardContent className="pt-0 pb-5 px-5">
              {church.description && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#5a5450" }}>{church.description}</p>
              )}
              <div className="flex flex-wrap gap-4">
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
            </CardContent>
          )}
        </Card>

        {/* Sign-in prompt */}
        {!isSignedIn && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: `4px solid ${themeColor}` }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Info className="w-5 h-5 flex-shrink-0" style={{ color: themeColor }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>Sign in to access your church community</p>
                <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>You need to be signed in to view member content.</p>
              </div>
              <Button size="sm" onClick={() => setLocation("/signin")} style={{ backgroundColor: themeColor }}>Sign In</Button>
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
                { label: "Members", value: members?.length ?? "—", icon: Users, path: `/church/${slug}/members` },
                { label: "Sermons", value: sermons?.length ?? "—", icon: Mic2, path: `/church/${slug}/sermons` },
                { label: "Announcements", value: announcements?.length ?? "—", icon: Megaphone, path: `/church/${slug}/announcements` },
                { label: "Prayer Wall", value: "Open", icon: Heart, path: `/church/${slug}/prayer` },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <button key={stat.label} onClick={() => setLocation(stat.path)} className="text-left" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-4">
                        <Icon className="w-5 h-5 mb-2" style={{ color: themeColor }} />
                        <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{stat.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{stat.label}</p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>

            {/* Upcoming Sermons */}
            {upcomingSermons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-lg" style={{ color: "#1a2744" }}>Coming Up</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {upcomingSermons.map(sermon => (
                    <Card key={sermon.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                      {sermon.imageUrl && (
                        <div className="h-28 overflow-hidden">
                          <img src={sermon.imageUrl} alt={sermon.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-3">
                          {!sermon.imageUrl && (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${themeColor}15` }}>
                              <Calendar className="w-5 h-5" style={{ color: themeColor }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Badge className="text-xs mb-1.5" style={{ backgroundColor: `${themeColor}15`, color: themeColor, border: "none" }}>
                              Upcoming
                            </Badge>
                            <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{sermon.title}</p>
                            {sermon.speakerName && <p className="text-xs mt-0.5" style={{ color: "#b8962e" }}>{sermon.speakerName}</p>}
                            {sermon.scheduledDate && (
                              <p className="text-xs mt-1" style={{ color: "#7a7570" }}>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {new Date(sermon.scheduledDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
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

            {/* Recent Announcements */}
            {displayAnnouncements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-lg" style={{ color: "#1a2744" }}>Announcements</h3>
                  <button onClick={() => setLocation(`/church/${slug}/announcements`)} className="text-xs font-medium hover:underline" style={{ color: "#b8962e" }}>
                    View all →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {displayAnnouncements.map(ann => (
                    <Card key={ann.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                      {ann.imageUrl && (
                        <div className="h-28 overflow-hidden">
                          <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-2">
                          {ann.isPinned && <Pin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#b8962e" }} />}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{ann.title}</p>
                            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#5a5450" }}>{ann.body}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs" style={{ color: "#9a9080" }}>
                                {new Date(ann.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                              {ann.pdfUrl && (
                                <a href={ann.pdfUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-medium" style={{ color: themeColor }}>
                                  <FileText className="w-3 h-3" />PDF
                                </a>
                              )}
                              {ann.externalLink && (
                                <a href={ann.externalLink} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-medium" style={{ color: themeColor }}>
                                  <ExternalLink className="w-3 h-3" />Link
                                </a>
                              )}
                            </div>
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
                    <Card key={sermon.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                      {sermon.imageUrl && (
                        <div className="h-28 overflow-hidden">
                          <img src={sermon.imageUrl} alt={sermon.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-3">
                          {!sermon.imageUrl && (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${themeColor}15` }}>
                              <Mic2 className="w-5 h-5" style={{ color: themeColor }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{sermon.title}</p>
                            {sermon.speakerName && <p className="text-xs mt-0.5" style={{ color: "#b8962e" }}>{sermon.speakerName}</p>}
                            {sermon.bibleReference && <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{sermon.bibleReference}</p>}
                            <div className="flex items-center gap-3 mt-1.5">
                              {sermon.sermonDate && (
                                <p className="text-xs" style={{ color: "#9a9080" }}>
                                  {new Date(sermon.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                              )}
                              {sermon.audioUrl && (
                                <span className="text-xs font-medium" style={{ color: themeColor }}>🎧 Audio</span>
                              )}
                              {sermon.videoUrl && (
                                <span className="text-xs font-medium" style={{ color: themeColor }}>▶ Video</span>
                              )}
                            </div>
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
              <button onClick={() => setLocation(`/church/${slug}/admin`)} className="w-full text-left" data-testid="card-church-admin-link">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: themeColor }}>
                  <CardContent className="pt-4 pb-4 px-5 flex items-center gap-3">
                    <Settings className="w-5 h-5 flex-shrink-0" style={{ color: "#d4a83a" }} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-white">Church Administration</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Manage sermons, announcements, members &amp; settings</p>
                    </div>
                    <Settings className="w-4 h-4 opacity-40 text-white" />
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
