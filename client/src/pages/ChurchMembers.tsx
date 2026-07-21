import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, Star, Loader2, Trash2, AlertCircle } from "lucide-react";
import type { Church, ChurchMember } from "@shared/schema";
import { CHURCH_ROLE_LABELS, CHURCH_ROLES, type ChurchRole } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const roleColors: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-300",
  lead_pastor: "bg-blue-100 text-blue-800 border-blue-300",
  administrator: "bg-purple-100 text-purple-800 border-purple-300",
  associate_pastor: "bg-sky-100 text-sky-800 border-sky-300",
  ministry_leader: "bg-green-100 text-green-800 border-green-300",
  group_leader: "bg-teal-100 text-teal-800 border-teal-300",
  counselor: "bg-pink-100 text-pink-800 border-pink-300",
  prayer_team: "bg-rose-100 text-rose-800 border-rose-300",
  member: "bg-gray-100 text-gray-700 border-gray-300",
};

const roleIcon = (role: string) => {
  if (role === "owner") return <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#b8962e" }} />;
  if (["lead_pastor", "administrator", "associate_pastor"].includes(role)) return <Shield className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />;
  if (["ministry_leader", "group_leader"].includes(role)) return <Star className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />;
  return null;
};

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const LEADER_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "ministry_leader", "group_leader", "prayer_team"];

export default function ChurchMembers() {
  const [, params] = useRoute("/church/:slug/members");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
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

  const { data: members, isLoading } = useQuery<ChurchMember[]>({
    queryKey: ["/api/churches", church?.id, "members"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");
  const isLeader = LEADER_ROLES.includes(myRole?.role ?? "");

  const roleUpdate = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: "Role updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: "Member removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const grouped = members ? {
    leadership: members.filter(m => ADMIN_ROLES.includes(m.role) || ["ministry_leader", "group_leader", "counselor", "prayer_team"].includes(m.role)),
    congregation: members.filter(m => m.role === "member"),
  } : { leadership: [], congregation: [] };

  // Display name — never show email to non-leaders
  const getDisplayName = (m: ChurchMember) => {
    if (isLeader) return m.displayName ?? m.email;
    return m.displayName ?? "Member";
  };

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274412" }}>
            <Users className="w-5 h-5" style={{ color: "#1a2744" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Members</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>
              {members?.length ?? 0} {members?.length === 1 ? "member" : "members"} in {church?.name ?? "this church"}
            </p>
          </div>
        </div>

        {!myRole?.role ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>You must be a member to view the member list.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Leadership section */}
            {grouped.leadership.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#7a7570" }}>
                  <Shield className="w-3.5 h-3.5" />
                  Leadership &amp; Ministry Team ({grouped.leadership.length})
                </p>
                {grouped.leadership.map(m => {
                  const isCurrentUser = m.firebaseUid === user?.uid;
                  const canManage = isAdmin && !isCurrentUser && m.role !== "owner";
                  return (
                    <Card key={m.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: "#1a274418", color: "#1a2744" }}>
                          {getDisplayName(m)[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {roleIcon(m.role)}
                            <span className="font-medium text-sm truncate" style={{ color: "#1a2744" }}>{getDisplayName(m)}</span>
                            {isCurrentUser && <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">You</Badge>}
                          </div>
                          {/* Only leaders/admins see email */}
                          {isLeader && m.email && (
                            <p className="text-xs truncate mt-0.5" style={{ color: "#7a7570" }}>{m.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canManage ? (
                            <Select value={m.role} onValueChange={role => roleUpdate.mutate({ memberId: m.id, role })}>
                              <SelectTrigger className={`h-7 text-xs w-36 border ${roleColors[m.role] ?? ""}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CHURCH_ROLES.filter(r => r !== "owner").map(r => (
                                  <SelectItem key={r} value={r}>{CHURCH_ROLE_LABELS[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[m.role] ?? ""}`}>
                              {CHURCH_ROLE_LABELS[m.role as ChurchRole] ?? m.role}
                            </span>
                          )}
                          {canManage && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm(`Remove ${getDisplayName(m)} from this church?`)) removeMember.mutate(m.id); }}
                              data-testid={`button-remove-member-${m.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Congregation section */}
            {grouped.congregation.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#7a7570" }}>
                  <Users className="w-3.5 h-3.5" />
                  Congregation ({grouped.congregation.length})
                </p>
                {grouped.congregation.map(m => {
                  const isCurrentUser = m.firebaseUid === user?.uid;
                  const canManage = isAdmin && !isCurrentUser;
                  return (
                    <Card key={m.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-3.5 pb-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ backgroundColor: "#1a274410", color: "#1a2744" }}>
                          {getDisplayName(m)[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm truncate" style={{ color: "#1a2744" }}>{getDisplayName(m)}</span>
                            {isCurrentUser && <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">You</Badge>}
                          </div>
                          {/* Only leaders/admins see email */}
                          {isLeader && m.email && (
                            <p className="text-xs truncate mt-0.5" style={{ color: "#7a7570" }}>{m.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canManage ? (
                            <Select value={m.role} onValueChange={role => roleUpdate.mutate({ memberId: m.id, role })}>
                              <SelectTrigger className={`h-7 text-xs w-36 border ${roleColors[m.role] ?? ""}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CHURCH_ROLES.filter(r => r !== "owner").map(r => (
                                  <SelectItem key={r} value={r}>{CHURCH_ROLE_LABELS[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[m.role] ?? ""}`}>
                              Member
                            </span>
                          )}
                          {canManage && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm(`Remove ${getDisplayName(m)}?`)) removeMember.mutate(m.id); }}
                              data-testid={`button-remove-member-${m.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
