import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Group, GroupMember } from "@shared/schema";
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

export default function GroupLeave() {
  const [, params] = useRoute("/group/:id/leave");
  const [, navigate] = useLocation();
  const groupId = Number((params as any)?.id);
  const { user, emailVerified, getIdToken } = useUser();
  const { toast } = useToast();

  const { data: groupData, isLoading } = useGroupData(groupId);
  const isOwner = groupData?.myMember?.role === "owner";

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (isOwner) {
        const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.json()).message);
      } else {
        const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.json()).message);
      }
    },
    onSuccess: () => {
      toast({ title: isOwner ? "Group deleted" : "You have left the group" });
      navigate("/groups");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user || !emailVerified) { navigate("/signin"); return null; }
  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!groupData) return null;

  const { group } = groupData;

  return (
    <div className="max-w-sm mx-auto py-10 space-y-5">
      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-lg">{isOwner ? "Delete Group" : "Leave Group"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isOwner
                ? `Are you sure you want to delete "${group.name}"? This will permanently remove the group and all its data.`
                : `Are you sure you want to leave "${group.name}"?`}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/group/${groupId}`)} data-testid="button-cancel-leave">
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              data-testid="button-confirm-leave"
            >
              {leaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {isOwner ? "Delete" : "Leave"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
