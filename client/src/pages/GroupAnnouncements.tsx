import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember, GroupAnnouncement } from "@shared/schema";
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

export default function GroupAnnouncements() {
  const [, params] = useRoute("/group/:id/announcements");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: groupData, isLoading: loadingGroup } = useGroupData(groupId);

  const { data: announcements = [], isLoading } = useQuery<GroupAnnouncement[]>({
    queryKey: ["/api/groups", groupId, "announcements"],
    enabled: !!groupData,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "announcements"] });
      setTitle(""); setContent(""); setOpen(false);
      toast({ title: "Announcement posted!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      await fetch(`/api/groups/${groupId}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "announcements"] }),
  });

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (loadingGroup) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  const role = groupData.myMember?.role;
  const canPost = role === "owner" || role === "moderator";

  return (
    <GroupModeShell group={groupData.group} myMember={groupData.myMember}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Announcements</h2>
          {canPost && (
            <Button size="sm" onClick={() => setOpen(true)} data-testid="button-new-announcement" className="gap-1">
              <Plus className="w-4 h-4" /> Post
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">No announcements yet.</p>
            {canPost && <p className="text-xs text-muted-foreground">Post an announcement for your group.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <Card key={ann.id} data-testid={`card-announcement-${ann.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{ann.title}</h3>
                    {canPost && (
                      <button
                        onClick={() => deleteMutation.mutate(ann.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        data-testid={`button-delete-announcement-${ann.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{ann.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {ann.displayName ?? "Member"} · {ann.createdAt ? format(new Date(ann.createdAt), "MMM d, yyyy") : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              data-testid="input-announcement-title"
            />
            <Textarea
              placeholder="Write your announcement…"
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              data-testid="textarea-announcement-content"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => postMutation.mutate()} disabled={!title.trim() || !content.trim() || postMutation.isPending} data-testid="button-submit-announcement">
                {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GroupModeShell>
  );
}
