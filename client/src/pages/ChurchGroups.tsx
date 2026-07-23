import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, UserMinus, Clock, Tag, Loader2, AlertCircle } from "lucide-react";
import type { Church } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }
interface GroupWithMeta {
  id: number; churchId: number; name: string; description: string | null;
  category: string | null; leaderId: string | null; leaderName: string | null;
  meetingSchedule: string | null; isPublic: boolean; createdAt: string | null;
  memberCount: number; isMember: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Youth: "#1a2744", Women: "#7a1520", Men: "#1a5744", Bible: "#b8962e",
  Prayer: "#44185a", Outreach: "#1a4a22", Music: "#4a1a44",
};

export default function ChurchGroups() {
  const [, params] = useRoute("/church/:slug/groups");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
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

  const { data: groups, isLoading } = useQuery<GroupWithMeta[]>({
    queryKey: ["/api/churches", church?.id, "groups"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/groups`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/groups/${groupId}/join`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "groups"] });
      toast({ title: t("cm_joinedGroup") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const leaveGroup = useMutation({
    mutationFn: async (groupId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/groups/${groupId}/leave`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "groups"] });
      toast({ title: t("cm_leftGroup") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const isMember = !!myRole?.role && myRole.status === "active";

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274412" }}>
            <Users className="w-5 h-5" style={{ color: "#1a2744" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>{t("cm_groupsHeading")}</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>{t("cm_smallGroupsDesc")}</p>
          </div>
        </div>

        {!isMember ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #b8962e" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#b8962e" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>{t("cm_mustBeMemberForGroups")}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
          </div>
        ) : !groups?.length ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
            <p className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_noGroupsYet")}</p>
            <p className="text-sm mt-1" style={{ color: "#7a7570" }}>{t("cm_groupsWillAppear")}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.map(group => {
              const catColor = CATEGORY_COLORS[group.category ?? ""] ?? "#1a2744";
              return (
                <Card key={group.id} className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: "#fff" }}>
                  <div className="h-1" style={{ backgroundColor: catColor + "60" }} />
                  <CardContent className="pt-4 pb-5 px-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base leading-snug" style={{ color: "#1a2744" }}>{group.name}</h3>
                      {group.isMember && (
                        <Badge className="flex-shrink-0 text-xs" style={{ backgroundColor: "#1a274412", color: "#1a2744", border: "1px solid #1a274420" }}>
                          {t("cm_joined")}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {group.category && (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: catColor + "15", color: catColor }}>
                          <Tag className="w-3 h-3" />
                          {group.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#7a7570" }}>
                        <Users className="w-3.5 h-3.5" />
                        {group.memberCount} {t("cm_memberCount")}
                      </span>
                    </div>

                    {group.description && (
                      <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: "#5a5450" }}>
                        {group.description}
                      </p>
                    )}

                    <div className="space-y-1.5 mb-4">
                      {group.leaderName && (
                        <p className="text-xs" style={{ color: "#7a7570" }}>
                          {t("cm_ledBy")} <span className="font-medium" style={{ color: "#1a2744" }}>{group.leaderName}</span>
                        </p>
                      )}
                      {group.meetingSchedule && (
                        <p className="flex items-center gap-1.5 text-xs" style={{ color: "#7a7570" }}>
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          {group.meetingSchedule}
                        </p>
                      )}
                    </div>

                    {group.isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => { if (confirm(t("cm_leaveGroup") + `"${group.name}"?`)) leaveGroup.mutate(group.id); }}
                        disabled={leaveGroup.isPending}
                        data-testid={`button-leave-group-${group.id}`}
                      >
                        <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                        {t("cm_leaveGroup")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        style={{ backgroundColor: "#1a2744" }}
                        onClick={() => joinGroup.mutate(group.id)}
                        disabled={joinGroup.isPending}
                        data-testid={`button-join-group-${group.id}`}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        {t("cm_joinGroup")}
                      </Button>
                    )}
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
