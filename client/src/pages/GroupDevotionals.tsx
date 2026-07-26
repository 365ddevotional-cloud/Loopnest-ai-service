import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Loader2, BookOpen, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GroupModeShell from "@/components/GroupModeShell";
import type { Group, GroupMember, GroupDevotionalShare, GroupDevotionalReaction } from "@shared/schema";
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

type ShareWithReactions = GroupDevotionalShare & { reactions: GroupDevotionalReaction[] };

const REACTIONS = [
  { key: "amen", emoji: "🙏", label: "Amen" },
  { key: "praying", emoji: "💙", label: "Praying" },
  { key: "thank_you", emoji: "🙌", label: "Thank You" },
];

export default function GroupDevotionals() {
  const [, params] = useRoute("/group/:id/devotionals");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const { data: groupData, isLoading: loadingGroup } = useGroupData(groupId);

  const { data: shares = [], isLoading } = useQuery<ShareWithReactions[]>({
    queryKey: ["/api/groups", groupId, "devotionals"],
    enabled: !!groupData,
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/devotionals`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const token = await getIdToken();
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/groups/${groupId}/devotionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ devotionalDate: today, note: noteText }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "devotionals"] });
      setNote(""); setOpen(false);
      toast({ title: "Devotional shared with the group!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reactMutation = useMutation({
    mutationFn: async ({ shareId, reaction }: { shareId: number; reaction: string }) => {
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/devotionals/${shareId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "devotionals"] }),
  });

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (loadingGroup) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  const myUid = user?.uid;

  return (
    <GroupModeShell group={groupData.group} myMember={groupData.myMember}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Devotional Sharing</h2>
          <Button size="sm" onClick={() => setOpen(true)} data-testid="button-share-devotional" className="gap-1">
            <Plus className="w-4 h-4" /> Share
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : shares.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">No devotionals shared yet. Share today's devotional with your group!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map(share => {
              const reactionCounts = REACTIONS.map(r => ({
                ...r,
                count: share.reactions.filter(rx => rx.reaction === r.key).length,
                myReaction: share.reactions.some(rx => rx.reaction === r.key && rx.firebaseUid === myUid),
              }));
              return (
                <Card key={share.id} data-testid={`card-share-${share.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">
                          {share.devotionalDate ? `Devotional · ${format(new Date(share.devotionalDate + "T00:00:00"), "MMM d, yyyy")}` : "Devotional"}
                        </span>
                      </div>
                      {share.note && <p className="text-sm text-foreground italic">"{share.note}"</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Shared by <span className="font-medium">{share.displayName ?? "Member"}</span>
                        {share.createdAt ? ` · ${format(new Date(share.createdAt), "MMM d")}` : ""}
                      </p>
                    </div>

                    {/* Reactions */}
                    <div className="flex gap-2">
                      {reactionCounts.map(({ key, emoji, label, count, myReaction }) => (
                        <button
                          key={key}
                          onClick={() => reactMutation.mutate({ shareId: share.id, reaction: key })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${myReaction ? "bg-primary/10 border-primary/30 text-primary font-semibold" : "border-border hover:bg-muted/60 text-muted-foreground"}`}
                          data-testid={`button-react-${share.id}-${key}`}
                        >
                          <span>{emoji}</span>
                          <span>{label}</span>
                          {count > 0 && <span className="font-bold">{count}</span>}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share Today's Devotional</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Share today's devotional with your group. Add a personal note if you'd like.</p>
            <Textarea
              placeholder="Add a reflection or encouraging note (optional)…"
              rows={4}
              value={note}
              onChange={e => setNote(e.target.value)}
              data-testid="textarea-devotional-note"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => shareMutation.mutate(note)} disabled={shareMutation.isPending} data-testid="button-submit-share">
                {shareMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Share Devotional
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GroupModeShell>
  );
}
