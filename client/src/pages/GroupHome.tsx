import { useUser } from "@/contexts/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Loader2, HandHeart, MessageSquare, BookOpen, Megaphone, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type GroupWithMember = GroupMember & { group: Group };

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

function ActionCard({ href, icon: Icon, label, color }: { href: string; icon: any; label: string; color: string }) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow h-full" data-testid={`card-action-${label.toLowerCase().replace(/\s/g, "-")}`}>
        <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GroupHome() {
  const [, params] = useRoute("/group/:id");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified } = useUser();
  const { data, isLoading, error } = useGroupData(groupId);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error || !data) return <div className="text-center py-10 text-muted-foreground">Group not found or you don't have access.</div>;

  const { group, myMember, memberCount } = data;

  function copyCode() {
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Invite code copied!" });
    });
  }

  return (
    <GroupModeShell group={group} myMember={myMember}>
      <div className="space-y-6">
        {/* Group header */}
        <div className="flex flex-col items-center text-center gap-3 py-4">
          {group.logoUrl ? (
            <img src={group.logoUrl} alt={group.name} className="w-20 h-20 rounded-full object-cover shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl shadow-md">
              {group.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">{group.name}</h2>
            {group.description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{group.description}</p>}
            <p className="text-sm text-muted-foreground mt-1">{memberCount} member{memberCount !== 1 ? "s" : ""}{group.country ? ` · ${group.country}` : ""}</p>
          </div>

          {/* Invite code */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-mono hover:bg-muted/70 transition-colors"
            data-testid="button-copy-code-home"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="text-primary font-semibold">{group.inviteCode}</span>
            <span className="text-muted-foreground">· tap to copy</span>
          </button>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-2 gap-3">
          <ActionCard href={`/group/${groupId}/prayers`} icon={HandHeart} label="Prayer Requests" color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
          <ActionCard href={`/group/${groupId}/messages`} icon={MessageSquare} label="Messages" color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <ActionCard href={`/group/${groupId}/devotionals`} icon={BookOpen} label="Devotional Sharing" color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          <ActionCard href={`/group/${groupId}/announcements`} icon={Megaphone} label="Announcements" color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        </div>

        {/* Members quick view */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{memberCount} Members</span>
            </div>
            <Link href={`/group/${groupId}/members`} className="text-sm text-primary hover:underline" data-testid="link-view-members">
              View all
            </Link>
          </CardContent>
        </Card>
      </div>
    </GroupModeShell>
  );
}
