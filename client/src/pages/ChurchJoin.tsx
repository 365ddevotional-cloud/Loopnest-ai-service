import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle,
  Copy, Share2, Clock, Users, Tag, CheckCircle
} from "lucide-react";

interface InvitePreview {
  church: {
    id: number; name: string; slug: string; description: string | null;
    denomination: string | null; logoUrl: string | null; approvalMode: string | null;
  };
  invitation: {
    id: number; label: string | null; expiresAt: string | null;
    invitationType: string | null; targetGroupId: number | null;
    targetGroupName: string | null; maxUses: number | null;
    approvedUses: number; remaining: number | null;
  };
  isDepartmentInvite?: boolean;
  deptId?: number;
}

function copyToClipboard(text: string, onSuccess: () => void) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      onSuccess();
    });
  } else {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand("copy"); document.body.removeChild(el);
    onSuccess();
  }
}

const PROD_URL = "https://365dailydevotional.com";

export default function ChurchJoin() {
  const [, setLocation] = useLocation();
  const [matchCode, paramsCode] = useRoute("/church/join/:code");
  const { user, emailVerified, getIdToken } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const isSignedIn = !!user && !!emailVerified;

  const INVITATION_TYPE_LABELS: Record<string, string> = {
    membership: t("cm_invTypeGeneralMembership"),
    group: t("cm_invTypeGroupMembership"),
    leadership: t("cm_invTypeLeadershipTeam"),
    ministry: t("cm_invTypeMinistryTeam"),
    event: t("cm_invTypeEventAttendee"),
    volunteer: t("cm_invTypeVolunteer"),
  };

  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [consented, setConsented] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (matchCode && paramsCode?.code) {
      const c = paramsCode.code.toUpperCase();
      setCode(c);
      loadPreview(c);
    } else {
      const savedCode = sessionStorage.getItem("church-join-code");
      if (savedCode) {
        setCode(savedCode);
        loadPreview(savedCode);
        sessionStorage.removeItem("church-join-code");
      }
    }
  }, [matchCode]);

  const loadPreview = async (codeVal?: string) => {
    const c = (codeVal ?? code).trim().toUpperCase().replace(/\s/g, "");
    if (!c) return;
    setPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const r = await fetch(`/api/church-invite/${c}`);
      if (!r.ok) {
        const err = await r.json();
        setPreviewError(err.message ?? t("cm_invalidCode"));
        return;
      }
      setPreview(await r.json());
    } catch {
      setPreviewError(t("cm_couldNotVerifyCode"));
    } finally {
      setPreviewing(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || !consented) return;
    const savedCode = code.trim().toUpperCase();
    if (!isSignedIn) {
      sessionStorage.setItem("church-join-code", savedCode);
      setLocation("/signin?return=/church/join");
      return;
    }
    setJoining(true);
    try {
      const token = await getIdToken();
      if (!token) {
        sessionStorage.setItem("church-join-code", savedCode);
        setLocation("/signin?return=/church/join");
        return;
      }
      const endpoint = preview.isDepartmentInvite
        ? "/api/churches/departments/join"
        : "/api/churches/join";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          inviteCode: savedCode,
          email: user?.email ?? "",
          displayName: user?.displayName ?? null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message ?? "Failed to join");
      }
      const res = await r.json();
      if (res.pending) {
        setPending(true);
      } else {
        setJoined(true);
        setTimeout(() => setLocation(`/church/${res.church?.slug ?? preview.church.slug}`), 1800);
      }
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const inviteLink = (() => {
    const origin = window.location.hostname === "localhost" ? window.location.origin : PROD_URL;
    return `${origin}/church/join/${code.trim().toUpperCase()}`;
  })();

  const handleCopyCode = () => copyToClipboard(code.trim().toUpperCase(), () => toast({ title: t("cm_codeCopied") }));
  const handleCopyLink = () => copyToClipboard(inviteLink, () => toast({ title: t("cm_linkCopied") }));
  const handleShare = async () => {
    if (navigator.share && preview) {
      try {
        await navigator.share({
          title: `Join ${preview.church.name}`,
          text: `You've been invited to join ${preview.church.name}. Use code: ${code.trim().toUpperCase()}`,
          url: inviteLink,
        });
      } catch { handleCopyLink(); }
    } else {
      handleCopyLink();
    }
  };

  const requiresApproval = preview?.church.approvalMode !== "auto_approve";

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <button
        onClick={() => setLocation("/church")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("cm_backToChurchMode")}
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
          <UserPlus className="w-6 h-6" style={{ color: "#b8962e" }} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold">{t("cm_joinAChurchHeading")}</h1>
          <p className="text-sm text-muted-foreground">{t("cm_enterInviteCode")}</p>
        </div>
      </div>

      {joined && (
        <Card className="border-green-300/60 bg-green-50/40">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
            <p className="font-semibold">{t("cm_joinedSuccessfullyHeading")} {preview?.church.name}!</p>
            <p className="text-sm text-muted-foreground">{t("cm_loading")}</p>
          </CardContent>
        </Card>
      )}

      {pending && (
        <Card className="border-amber-300/60 bg-amber-50/40">
          <CardContent className="pt-6 text-center space-y-3">
            <Clock className="w-10 h-10 mx-auto text-amber-600" />
            <p className="font-semibold text-amber-900">{t("cm_requestSubmitted")}</p>
            <p className="text-sm text-muted-foreground">
              {t("cm_pendingApprovalStart")} <strong>{preview?.church.name}</strong> {t("cm_pendingApprovalEnd")}
            </p>
            <Button variant="outline" onClick={() => setLocation("/church")} className="mt-2">
              {t("cm_returnToChurchMode")}
            </Button>
          </CardContent>
        </Card>
      )}

      {!joined && !pending && (
        <>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-code">{t("cm_invitationCodeHeading")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setPreviewError(null); }}
                    placeholder="e.g. AXJ-4823"
                    className="font-mono tracking-widest uppercase"
                    maxLength={12}
                    data-testid="input-invite-code"
                  />
                  <Button
                    onClick={() => loadPreview()}
                    disabled={!code.trim() || previewing}
                    variant="outline"
                    data-testid="button-verify-code"
                  >
                    {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : t("cm_verify")}
                  </Button>
                </div>
              </div>

              {previewError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {previewError}
                </div>
              )}

              {preview && (
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#b8962e44", backgroundColor: "#b8962e08" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a274418" }}>
                      {preview.church.logoUrl ? (
                        <img src={preview.church.logoUrl} alt={preview.church.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6" style={{ color: "#1a2744" }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate" style={{ color: "#1a2744" }}>{preview.church.name}</p>
                      {preview.church.denomination && <p className="text-xs text-muted-foreground">{preview.church.denomination}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {preview.invitation.label && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a4e3d" }}>
                        <Tag className="w-3 h-3" />
                        <span>{preview.invitation.label}</span>
                      </div>
                    )}
                    {preview.invitation.invitationType && preview.invitation.invitationType !== "membership" && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a4e3d" }}>
                        <CheckCircle className="w-3 h-3" />
                        <span>{t("cm_purpose")}: {INVITATION_TYPE_LABELS[preview.invitation.invitationType] ?? preview.invitation.invitationType}</span>
                      </div>
                    )}
                    {preview.invitation.targetGroupName && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a4e3d" }}>
                        <Users className="w-3 h-3" />
                        <span>{t("cm_youllBeAddedTo")}: <strong>{preview.invitation.targetGroupName}</strong></span>
                      </div>
                    )}
                    {preview.invitation.expiresAt && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a4e3d" }}>
                        <Clock className="w-3 h-3" />
                        <span>{t("cm_expires")} {new Date(preview.invitation.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {preview.invitation.remaining !== null && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5a4e3d" }}>
                        <Users className="w-3 h-3" />
                        <span>{preview.invitation.remaining} {preview.invitation.remaining === 1 ? t("cm_spotRemaining") : t("cm_spotsRemaining")}</span>
                      </div>
                    )}
                    {requiresApproval && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
                        {t("cm_requiresApproval")}
                      </Badge>
                    )}
                  </div>

                  {preview.church.description && (
                    <p className="text-sm text-muted-foreground border-t pt-3" style={{ borderColor: "#b8962e22" }}>{preview.church.description}</p>
                  )}

                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleCopyCode} data-testid="button-copy-invite-code">
                      <Copy className="w-3 h-3 mr-1.5" />{t("cm_copyCode")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCopyLink} data-testid="button-copy-invite-link">
                      <Copy className="w-3 h-3 mr-1.5" />{t("cm_copyLink")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleShare} data-testid="button-share-invite">
                      <Share2 className="w-3 h-3 mr-1.5" />{t("cm_share") ?? "Share"}</Button>
                  </div>
                </div>
              )}

              {preview && (
                <>
                  {!isSignedIn ? (
                    <div className="space-y-3 pt-1 p-4 rounded-xl border" style={{ borderColor: "#1a274433", backgroundColor: "#1a274408" }}>
                      <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{t("cm_signInToJoinCommunity")}</p>
                      <p className="text-xs text-muted-foreground">{t("cm_needAccountToJoin")}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            sessionStorage.setItem("church-join-code", code.trim().toUpperCase());
                            setLocation("/signin?return=/church/join");
                          }}
                          style={{ backgroundColor: "#1a2744" }}
                          className="flex-1"
                          data-testid="button-signin-to-join"
                        >
                          {t("cm_signIn")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            sessionStorage.setItem("church-join-code", code.trim().toUpperCase());
                            setLocation("/signin?return=/church/join&tab=signup");
                          }}
                          className="flex-1"
                          data-testid="button-signup-to-join"
                        >
                          {t("cm_createAccount")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consented}
                          onChange={e => setConsented(e.target.checked)}
                          className="mt-0.5 w-4 h-4 flex-shrink-0"
                          data-testid="checkbox-join-consent"
                        />
                        <span className="text-sm text-muted-foreground">
                          {t("cm_joinConsentText")} <strong>{preview.church.name}</strong>.
                          {requiresApproval && ` ${t("cm_reviewBeforeAccess")}`}
                        </span>
                      </label>
                      <Button
                        onClick={handleJoin}
                        disabled={!consented || joining}
                        className="w-full"
                        style={{ backgroundColor: "#1a2744" }}
                        data-testid="button-join-church-confirm"
                      >
                        {joining ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_joining")}</>
                        ) : requiresApproval ? (
                          `${t("cm_requestToJoin")} ${preview.church.name}`
                        ) : (
                          `${t("cm_join")} ${preview.church.name}`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
