import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Loader2, HandHeart, Plus, CheckCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember, GroupPrayerRequest } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

function statusColor(status: string) {
  if (status === "answered") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status === "praying") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

export default function GroupPrayers() {
  const [, params] = useRoute("/group/:id/prayers");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const { data: groupData, isLoading: loadingGroup } = useGroupData(groupId);

  const { data: prayers = [], isLoading: loadingPrayers } = useQuery<GroupPrayerRequest[]>({
    queryKey: ["/api/groups", groupId, "prayers"],
    enabled: !!groupData,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/prayers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/prayers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "prayers"] });
      setText(""); setOpen(false);
      toast({ title: "Prayer request submitted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/prayers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "prayers"] }),
  });

  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      await fetch(`/api/groups/${groupId}/prayers/${id}/pray`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "prayers"] }),
  });

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (loadingGroup) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  return (
    <GroupModeShell group={groupData.group} myMember={groupData.myMember}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Prayer Requests</h2>
          <Button size="sm" onClick={() => setOpen(true)} data-testid="button-new-prayer" className="gap-1">
            <Plus className="w-4 h-4" /> Request
          </Button>
        </div>

        {loadingPrayers ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : prayers.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <HandHeart className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">No prayer requests yet. Be the first to share.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prayers.map(p => (
              <Card key={p.id} data-testid={`card-prayer-${p.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground leading-relaxed flex-1">{p.content}</p>
                    <Badge className={`${statusColor(p.status)} border-0 text-xs flex-shrink-0 capitalize`}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">{p.displayName ?? "Member"}</span>
                      {" · "}{p.createdAt ? format(new Date(p.createdAt), "MMM d") : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => prayMutation.mutate(p.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`button-pray-${p.id}`}
                      >
                        <Heart className="w-3.5 h-3.5" /> {p.prayingCount > 0 ? p.prayingCount : ""} Praying
                      </button>
                      {p.firebaseUid === user?.uid && p.status === "active" && (
                        <button
                          onClick={() => statusMutation.mutate({ id: p.id, status: "answered" })}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                          data-testid={`button-answered-${p.id}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Answered
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Prayer Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Share your prayer request with the group…"
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              data-testid="textarea-prayer-content"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => submitMutation.mutate(text)} disabled={!text.trim() || submitMutation.isPending} data-testid="button-submit-prayer">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GroupModeShell>
  );
}
