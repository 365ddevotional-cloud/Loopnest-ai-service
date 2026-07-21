import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, MapPin, Globe, Info, Settings, Loader2 } from "lucide-react";
import type { Church, ChurchMember } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

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
      if (!church?.id) return [];
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isSignedIn && !!myRole?.role,
  });

  const currentRole = myRole?.role ?? null;
  const isMember = !!currentRole && myRole?.status === "active";
  const isAdmin = ["owner", "administrator", "lead_pastor"].includes(currentRole ?? "");

  if (churchLoading) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} />
        </div>
      </ChurchModeShell>
    );
  }

  if (!church) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="text-center py-16 space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="font-semibold text-lg">Church not found</p>
          <p className="text-sm text-muted-foreground">This church space may have been removed or the link is incorrect.</p>
          <Button variant="outline" onClick={() => setLocation("/church")}>Return to Church Mode</Button>
        </div>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church} currentRole={currentRole}>
      <div className="space-y-6">
        {/* Church identity card */}
        <Card className="overflow-hidden" style={{ borderColor: "#c9b99044" }}>
          <div className="h-2" style={{ background: "linear-gradient(90deg, #1a2744, #2d4270, #b8962e)" }} />
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#1a274418", border: "2px solid #1a274420" }}>
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <Building2 className="w-8 h-8" style={{ color: "#1a2744" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-2xl font-semibold text-foreground leading-tight">{church.name}</h2>
                {church.denomination && (
                  <p className="text-sm mt-0.5" style={{ color: "#b8962e" }}>{church.denomination}</p>
                )}
                {church.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{church.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3">
                  {church.address && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {church.address}
                    </span>
                  )}
                  {church.websiteUrl && (
                    <a href={church.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs hover:underline" style={{ color: "#b8962e" }}>
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Not a member — prompt to join or return */}
        {isSignedIn && !isMember && (
          <Card className="border-amber-300/50 bg-amber-50/30">
            <CardContent className="pt-5 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">You are not a member of this church</p>
                <p className="text-xs text-muted-foreground">You need an invitation to join this community.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/church/join")}>Join with Code</Button>
            </CardContent>
          </Card>
        )}

        {!isSignedIn && (
          <Card className="border-primary/20">
            <CardContent className="pt-5 flex items-center gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Sign in to access your church community</p>
                <p className="text-xs text-muted-foreground">You need to be signed in to view member content.</p>
              </div>
              <Button size="sm" onClick={() => setLocation("/signin")}>Sign In</Button>
            </CardContent>
          </Card>
        )}

        {/* Quick stats — visible to members */}
        {isMember && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setLocation(`/church/${slug}/members`)}
              className="group"
              data-testid="card-church-members-count"
            >
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer" style={{ borderColor: "#1a274420" }}>
                <CardContent className="pt-5 pb-5 text-center">
                  <Users className="w-7 h-7 mx-auto mb-2" style={{ color: "#1a2744" }} />
                  <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{members?.length ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Members</p>
                </CardContent>
              </Card>
            </button>
            {isAdmin && (
              <button
                onClick={() => setLocation(`/church/${slug}/admin`)}
                className="group"
                data-testid="card-church-admin-link"
              >
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer" style={{ borderColor: "#b8962e33" }}>
                  <CardContent className="pt-5 pb-5 text-center">
                    <Settings className="w-7 h-7 mx-auto mb-2" style={{ color: "#b8962e" }} />
                    <p className="text-sm font-semibold mt-1" style={{ color: "#b8962e" }}>Administration</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage your church</p>
                  </CardContent>
                </Card>
              </button>
            )}
          </div>
        )}

        {/* Welcome message */}
        {isMember && (
          <Card style={{ backgroundColor: "#1a274408", borderColor: "#1a274420" }}>
            <CardContent className="pt-5 pb-5 space-y-1">
              <p className="font-serif text-sm font-semibold" style={{ color: "#1a2744" }}>Welcome to your Church Space</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is your church's dedicated space on 365 Daily Devotional. More features — sermons, bulletins, church giving, and communication tools — are coming in future updates.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ChurchModeShell>
  );
}
