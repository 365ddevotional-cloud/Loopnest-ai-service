import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, UserPlus, ChevronRight, Crown, Users, Shield } from "lucide-react";
import type { Church, ChurchMember, ChurchRole } from "@shared/schema";
import { CHURCH_ROLE_LABELS } from "@shared/schema";

type Membership = ChurchMember & { church: Church };

const roleIcon: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3.5 h-3.5" />,
  lead_pastor: <Shield className="w-3.5 h-3.5" />,
  administrator: <Shield className="w-3.5 h-3.5" />,
  ministry_leader: <Users className="w-3.5 h-3.5" />,
  member: <Users className="w-3.5 h-3.5" />,
};

export default function ChurchLanding() {
  const [, setLocation] = useLocation();
  const { user, emailVerified, getIdToken } = useUser();
  const isSignedIn = !!user && !!emailVerified;

  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ["/api/churches/my"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch("/api/churches/my", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: isSignedIn,
  });

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: "#1a2744" }}>
            <Building2 className="w-8 h-8" style={{ color: "#b8962e" }} />
          </div>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Church Mode</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          A dedicated space for your church community — organize, connect, and grow together in faith.
        </p>
      </div>

      {/* Not signed in */}
      {!isSignedIn && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Sign in to create a church space or access your existing church community.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setLocation("/signin")} data-testid="button-church-signin">
                Sign In to Continue
              </Button>
              <Button variant="outline" onClick={() => setLocation("/church/join")} data-testid="button-church-join-guest">
                <UserPlus className="w-4 h-4 mr-2" />
                Join with Invite Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signed in — My Churches */}
      {isSignedIn && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
            </div>
          ) : memberships && memberships.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Churches</h2>
              {memberships.map(m => (
                <button
                  key={m.id}
                  onClick={() => setLocation(`/church/${m.church.slug}`)}
                  className="w-full text-left group"
                  data-testid={`card-church-${m.church.slug}`}
                >
                  <Card className="border-primary/15 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                    <CardContent className="pt-4 pb-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a274415" }}>
                        {m.church.logoUrl ? (
                          <img src={m.church.logoUrl} alt={m.church.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6" style={{ color: "#1a2744" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{m.church.name}</p>
                        {m.church.denomination && (
                          <p className="text-xs text-muted-foreground truncate">{m.church.denomination}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          {roleIcon[m.role]}
                          <span className="text-xs" style={{ color: "#b8962e" }}>
                            {CHURCH_ROLE_LABELS[m.role as ChurchRole] ?? m.role}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-primary/25">
              <CardContent className="pt-6 text-center space-y-2">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">You are not part of any church yet.</p>
              </CardContent>
            </Card>
          )}

          {/* Action cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setLocation("/church/create")}
              className="group text-left"
              data-testid="button-create-church"
            >
              <Card className="h-full border-primary/15 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-5 pb-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a274418" }}>
                    <Plus className="w-5 h-5" style={{ color: "#1a2744" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Create a Church Space</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Set up your own church community on 365 Daily Devotional.</p>
                  </div>
                </CardContent>
              </Card>
            </button>
            <button
              onClick={() => setLocation("/church/join")}
              className="group text-left"
              data-testid="button-join-church"
            >
              <Card className="h-full border-primary/15 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-5 pb-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#b8962e18" }}>
                    <UserPlus className="w-5 h-5" style={{ color: "#b8962e" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Join a Church</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter an invitation code to join your church's space.</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
