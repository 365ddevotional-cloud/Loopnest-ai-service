import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, Loader2, UserMinus, AlertCircle } from "lucide-react";
import type { Church, ChurchMember } from "@shared/schema";
import { CHURCH_ROLE_LABELS, CHURCH_ROLES, type ChurchRole } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const roleColors: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-300",
  lead_pastor: "bg-blue-100 text-blue-800 border-blue-300",
  administrator: "bg-purple-100 text-purple-800 border-purple-300",
  ministry_leader: "bg-green-100 text-green-800 border-green-300",
  member: "bg-gray-100 text-gray-700 border-gray-300",
};

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

  const isAdmin = ["owner", "administrator"].includes(myRole?.role ?? "");

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

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" style={{ color: "#1a2744" }} />
          <div>
            <h2 className="font-serif text-2xl font-semibold">Members</h2>
            <p className="text-sm text-muted-foreground">{members?.length ?? 0} {members?.length === 1 ? "member" : "members"} in {church?.name ?? "this church"}</p>
          </div>
        </div>

        {!myRole?.role ? (
          <Card className="border-amber-300/50 bg-amber-50/30">
            <CardContent className="pt-5 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm">You must be a member to view the member list.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : (
          <div className="space-y-3">
            {(members ?? []).map(m => {
              const isCurrentUser = m.firebaseUid === user?.uid;
              const canManage = isAdmin && !isCurrentUser && m.role !== "owner";
              return (
                <Card key={m.id} className="overflow-hidden" style={{ borderColor: "#1a274415" }}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: "#1a274418", color: "#1a2744" }}>
                      {(m.displayName ?? m.email)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{m.displayName ?? m.email}</span>
                        {m.role === "owner" && <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#b8962e" }} />}
                        {m.role === "lead_pastor" && <Shield className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />}
                        {isCurrentUser && <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">You</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManage ? (
                        <Select
                          value={m.role}
                          onValueChange={role => roleUpdate.mutate({ memberId: m.id, role })}
                        >
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm(`Remove ${m.displayName ?? m.email} from this church?`)) removeMember.mutate(m.id); }}
                          data-testid={`button-remove-member-${m.id}`}
                        >
                          <UserMinus className="w-4 h-4" />
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
    </ChurchModeShell>
  );
}
