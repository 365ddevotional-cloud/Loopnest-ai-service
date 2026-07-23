import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Lock, Plus, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";
import type { Church, ChurchPrayerRequest } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const ADMIN_CAN_SEE_CONFIDENTIAL = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "prayer_team"];

export default function ChurchPrayer() {
  const [, params] = useRoute("/church/:slug/prayer");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [prayedFor, setPrayedFor] = useState<Set<number>>(new Set());

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

  const { data: prayers, isLoading } = useQuery<ChurchPrayerRequest[]>({
    queryKey: ["/api/churches", church?.id, "prayer"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/prayer`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const submitPrayer = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/prayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body, isConfidential }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "prayer"] });
      setTitle(""); setBody(""); setIsConfidential(false); setShowForm(false);
      toast({ title: t("cm_prayerSubmitted") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const prayFor = async (prayerId: number) => {
    if (prayedFor.has(prayerId)) return;
    const token = await getIdToken();
    await fetch(`/api/churches/${church!.id}/prayer/${prayerId}/pray`, {
      method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    setPrayedFor(s => new Set(s).add(prayerId));
    qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "prayer"] });
    toast({ title: t("cm_amen"), description: t("cm_yourPrayerCounted") });
  };

  const isMember = !!myRole?.role && myRole.status === "active";
  const canSeeConfidential = ADMIN_CAN_SEE_CONFIDENTIAL.includes(myRole?.role ?? "");
  const isAdmin = ["owner", "lead_pastor", "administrator", "associate_pastor"].includes(myRole?.role ?? "");
  const activeRequests = prayers?.filter(p => p.status === "active") ?? [];
  const answeredRequests = prayers?.filter(p => p.status === "answered") ?? [];

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#7a152015" }}>
              <Heart className="w-5 h-5" style={{ color: "#7a1520" }} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>{t("cm_prayerWallHeading")}</h2>
              <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>{t("cm_prayerWallSubtitle")}</p>
            </div>
          </div>
          {isMember && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} style={{ backgroundColor: "#1a2744" }}
              data-testid="button-add-prayer">
              <Plus className="w-4 h-4 mr-1.5" />
              {t("cm_requestPrayer")}
            </Button>
          )}
        </div>

        {!isMember ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderLeft: "4px solid #7a1520" }}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#7a1520" }} />
              <p className="text-sm" style={{ color: "#1a2744" }}>{t("cm_mustBeMemberForPrayer")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {showForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-5 pb-5 px-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_newPrayerRequest")}</h3>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cm_titleLabel")}</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("cm_prayerRequestTitle")} data-testid="input-prayer-title" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cm_requestPrayer")}</Label>
                    <Textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
                      placeholder={t("cm_prayerRequestBody")} data-testid="input-prayer-body" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isConfidential}
                      onChange={e => setIsConfidential(e.target.checked)}
                      className="mt-0.5 rounded"
                      data-testid="checkbox-confidential"
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{t("cm_keepConfidential")}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_confidentialNote")}</p>
                    </div>
                  </label>
                  <Button
                    onClick={() => submitPrayer.mutate()}
                    disabled={submitPrayer.isPending || !title.trim() || !body.trim()}
                    style={{ backgroundColor: "#1a2744" }}
                    data-testid="button-submit-prayer"
                  >
                    {submitPrayer.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_submitting")}</> : t("cm_submitPrayerRequest")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
              </div>
            ) : !prayers?.length ? (
              <div className="text-center py-16">
                <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: "#c9b99060" }} />
                <p className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_noPrayerRequests")}</p>
                <p className="text-sm mt-1" style={{ color: "#7a7570" }}>{t("cm_firstPrayer")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeRequests.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
                      {t("cm_activeRequests")} ({activeRequests.length})
                    </span>
                    {activeRequests.map(pr => {
                      const hasPrayed = prayedFor.has(pr.id);
                      return (
                        <Card key={pr.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                          <CardContent className="pt-4 pb-4 px-5">
                            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm" style={{ color: "#1a2744" }}>{pr.title}</h4>
                                {pr.isConfidential && canSeeConfidential && (
                                  <Badge className="text-xs gap-1" style={{ backgroundColor: "#7a152015", color: "#7a1520", border: "1px solid #7a152020" }}>
                                    <Lock className="w-3 h-3" />{t("cm_confidential")}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs flex-shrink-0" style={{ color: "#9a9080" }}>
                                {new Date(pr.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "#5a5450" }}>{pr.body}</p>
                            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium" style={{ color: "#7a7570" }}>
                                  — {pr.isConfidential && !canSeeConfidential ? t("cm_anonymous") : (pr.displayName ?? t("cm_anonymous"))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => prayFor(pr.id)}
                                  disabled={hasPrayed}
                                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                  style={{
                                    backgroundColor: hasPrayed ? "#7a152015" : "#fff",
                                    color: hasPrayed ? "#7a1520" : "#7a7570",
                                    border: `1px solid ${hasPrayed ? "#7a152030" : "#e0dcd8"}`,
                                  }}
                                  data-testid={`button-pray-${pr.id}`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${hasPrayed ? "fill-current" : ""}`} />
                                  {hasPrayed ? t("cm_praying") : t("cm_imPraying")} · {pr.prayerCount}
                                </button>
                                {isAdmin && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1"
                                    onClick={async () => {
                                      const token = await getIdToken();
                                      await fetch(`/api/churches/${church!.id}/prayer/${pr.id}/status`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ status: "answered" }),
                                      });
                                      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "prayer"] });
                                      toast({ title: t("cm_markedAsAnswered") });
                                    }}
                                    data-testid={`button-mark-answered-${pr.id}`}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {t("cm_answered")}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {answeredRequests.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#1a5744" }}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t("cm_answeredPrayers")} ({answeredRequests.length})
                    </span>
                    {answeredRequests.map(pr => (
                      <Card key={pr.id} className="border-0 shadow-sm opacity-80" style={{ backgroundColor: "#1a574408" }}>
                        <CardContent className="pt-4 pb-4 px-5">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#1a5744" }} />
                            <h4 className="font-semibold text-sm" style={{ color: "#1a5744" }}>{pr.title}</h4>
                          </div>
                          <p className="text-xs" style={{ color: "#5a7566" }}>
                            {pr.isConfidential && !canSeeConfidential ? t("cm_anonymous") : (pr.displayName ?? t("cm_anonymous"))} · {t("cm_answered")}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ChurchModeShell>
  );
}
