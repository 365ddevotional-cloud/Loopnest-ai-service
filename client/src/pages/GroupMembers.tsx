import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Loader2, Users, Crown, Shield, UserX, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function useGroupData(groupId: number) {
  const { getIdToken } = useUser();
  return useQuery<{ group: Group; myMember: GroupMember; memberCount: number }>({
    queryKey: ["/api/groups", groupId],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });
}

function roleIcon(role: string) {
  if (role === "owner") return <Crown className="w-3.5 h-3.5 text-amber-500" />;
  if (role === "moderator") return <Shield className="w-3.5 h-3.5 text-blue-500" />;
  return null;
}

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "moderator") return "Moderator";
  return "Member";
}

export default function GroupMembers() {
  const [, params] = useRoute("/group/:id/members");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: groupData, isLoading: loadingGroup } = useGroupData(groupId);

  const { data: members = [], isLoading } = useQuery<GroupMember[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupData,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      toast({ title: "Role updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      await fetch(`/api/groups/${groupId}/members/${memberId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      toast({ title: "Member removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (loadingGroup) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  const myRole = groupData.myMember?.role;
  const isOwner = myRole === "owner";
  const myUid = user?.uid;

  return (
    <GroupModeShell group={groupData.group} myMember={groupData.myMember}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-xl font-bold">Members</h2>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const isMe = member.firebaseUid === myUid;
              const canManage = isOwner && !isMe && member.role !== "owner";
              return (
                <Card key={member.id} data-testid={`card-member-${member.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(member.displayName ?? member.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {roleIcon(member.role)}
                        <span className="font-medium text-sm truncate">{member.displayName ?? member.email}</span>
                        {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel(member.role)}{member.joinedAt ? ` · Joined ${format(new Date(member.joinedAt), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" data-testid={`button-manage-${member.id}`}>
                            Manage <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== "moderator" && (
                            <DropdownMenuItem onClick={() => roleMutation.mutate({ memberId: member.id, role: "moderator" })} data-testid={`menu-make-mod-${member.id}`}>
                              <Shield className="w-3.5 h-3.5 mr-2" /> Make Moderator
                            </DropdownMenuItem>
                          )}
                          {member.role !== "member" && (
                            <DropdownMenuItem onClick={() => roleMutation.mutate({ memberId: member.id, role: "member" })} data-testid={`menu-make-member-${member.id}`}>
                              <Users className="w-3.5 h-3.5 mr-2" /> Make Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => removeMutation.mutate(member.id)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-remove-${member.id}`}
                          >
                            <UserX className="w-3.5 h-3.5 mr-2" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </GroupModeShell>
  );
}
