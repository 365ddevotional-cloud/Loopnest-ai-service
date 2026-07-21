import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface InvitePreview {
  church: { id: number; name: string; slug: string; description: string | null; denomination: string | null; logoUrl: string | null };
  invitation: { label: string | null; expiresAt: string | null };
}

export default function ChurchJoin() {
  const [, setLocation] = useLocation();
  const [matchCode, paramsCode] = useRoute("/church/join/:code");
  const { user, emailVerified, getIdToken } = useUser();
  const { toast } = useToast();
  const isSignedIn = !!user && !!emailVerified;

  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [consented, setConsented] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Auto-load if code in URL
  useEffect(() => {
    if (matchCode && paramsCode?.code) {
      const c = paramsCode.code.toUpperCase();
      setCode(c);
      loadPreview(c);
    }
  }, [matchCode]);

  const loadPreview = async (codeVal?: string) => {
    const c = (codeVal ?? code).trim().toUpperCase();
    if (!c) return;
    setPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const r = await fetch(`/api/church-invite/${c}`);
      if (!r.ok) {
        const err = await r.json();
        setPreviewError(err.message ?? "Invalid invitation code");
        return;
      }
      setPreview(await r.json());
    } catch {
      setPreviewError("Could not verify invitation code");
    } finally {
      setPreviewing(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || !consented) return;
    setJoining(true);
    try {
      const token = await getIdToken();
      if (!token) { setLocation("/signin"); return; }
      const r = await fetch("/api/churches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase(), email: user?.email ?? "", displayName: user?.displayName ?? null }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message ?? "Failed to join");
      }
      const res = await r.json();
      setJoined(true);
      setTimeout(() => setLocation(`/church/${res.church?.slug ?? preview.church.slug}`), 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <button
        onClick={() => setLocation("/church")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Church Mode
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
          <UserPlus className="w-6 h-6" style={{ color: "#b8962e" }} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold">Join a Church</h1>
          <p className="text-sm text-muted-foreground">Enter an invitation code shared by your church.</p>
        </div>
      </div>

      {joined ? (
        <Card className="border-green-300/60 bg-green-50/40">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
            <p className="font-semibold">You've joined {preview?.church.name}!</p>
            <p className="text-sm text-muted-foreground">Taking you to your church space…</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Code input */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-code">Invitation Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setPreviewError(null); }}
                    placeholder="e.g. ABC12DEF"
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
                    {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>

              {/* Preview error */}
              {previewError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {previewError}
                </div>
              )}

              {/* Church preview */}
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
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{preview.church.name}</p>
                      {preview.church.denomination && <p className="text-xs text-muted-foreground">{preview.church.denomination}</p>}
                      {preview.invitation.label && <p className="text-xs text-muted-foreground">Invitation: {preview.invitation.label}</p>}
                    </div>
                  </div>
                  {preview.church.description && <p className="text-sm text-muted-foreground">{preview.church.description}</p>}
                  {preview.invitation.expiresAt && (
                    <p className="text-xs text-muted-foreground">Expires: {new Date(preview.invitation.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {/* Join section */}
              {preview && (
                <>
                  {!isSignedIn ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-sm text-muted-foreground">Sign in to join this church community.</p>
                      <Button onClick={() => setLocation("/signin")} className="w-full">Sign In to Join</Button>
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
                          I understand that by joining, my display name and email may be visible to church leaders and administrators of <strong>{preview.church.name}</strong>.
                        </span>
                      </label>
                      <Button
                        onClick={handleJoin}
                        disabled={!consented || joining}
                        className="w-full"
                        data-testid="button-join-church-confirm"
                      >
                        {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining…</> : `Join ${preview.church.name}`}
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
