import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Link as LinkIcon, Copy, Trash2, Plus, Loader2, AlertCircle,
  Users, Calendar, Hash
} from "lucide-react";
import type { Church, ChurchInvitation } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

export default function ChurchAdminPage() {
  const [, params] = useRoute("/church/:slug/admin");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [activeSection, setActiveSection] = useState<"settings" | "invitations">("settings");
  const [saving, setSaving] = useState(false);

  const { data: church, isLoading: churchLoading } = useQuery<Church>({
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

  const { data: invitations, isLoading: invLoading } = useQuery<ChurchInvitation[]>({
    queryKey: ["/api/churches", church?.id, "invitations"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/invitations`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const isAuthorized = ["owner", "administrator", "lead_pastor"].includes(myRole?.role ?? "");

  // Settings form
  const [form, setForm] = useState<Partial<Church>>({});
  const formVal = (field: keyof Church) => (field in form ? form[field] : church?.[field]) as string ?? "";

  const saveSettings = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] });
      setForm({});
      toast({ title: "Church settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Invite creation state
  const [invLabel, setInvLabel] = useState("");
  const [invExpiry, setInvExpiry] = useState("");
  const [invMaxUses, setInvMaxUses] = useState("");
  const [creatingInv, setCreatingInv] = useState(false);

  const createInvitation = async () => {
    if (!church?.id) return;
    setCreatingInv(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: invLabel || undefined,
          expiresAt: invExpiry || undefined,
          maxUses: invMaxUses ? Number(invMaxUses) : undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "invitations"] });
      setInvLabel(""); setInvExpiry(""); setInvMaxUses("");
      toast({ title: "Invitation created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreatingInv(false);
    }
  };

  const deactivateInv = useMutation({
    mutationFn: async (invId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/invitations/${invId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "invitations"] }); toast({ title: "Invitation deactivated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/church/join/${code}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied to clipboard" }));
  };

  if (churchLoading) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} />
        </div>
      </ChurchModeShell>
    );
  }

  if (!isAuthorized) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Access Denied</p>
              <p className="text-xs text-muted-foreground">Only church owners, administrators, and lead pastors can access Church Administration.</p>
            </div>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6" style={{ color: "#b8962e" }} />
          <div>
            <h2 className="font-serif text-2xl font-semibold">Church Administration</h2>
            <p className="text-sm text-muted-foreground">Manage your church space, invitations, and settings.</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 border-b border-border/60">
          {(["settings", "invitations"] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeSection === s ? "border-[#b8962e] text-[#b8962e]" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-church-admin-${s}`}
            >
              {s === "settings" ? "Church Settings" : "Invitations"}
            </button>
          ))}
        </div>

        {/* Church Settings */}
        {activeSection === "settings" && church && (
          <Card style={{ borderColor: "#1a274420" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Church Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Church Name</Label>
                <Input value={formVal("name")} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-admin-church-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Denomination</Label>
                <Input value={formVal("denomination") as string} onChange={e => setForm(f => ({ ...f, denomination: e.target.value || null }))} placeholder="e.g. Baptist, Pentecostal, Non-denominational" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={formVal("description") as string} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={formVal("address") as string} onChange={e => setForm(f => ({ ...f, address: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Website URL</Label>
                <Input type="url" value={formVal("websiteUrl") as string} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value || null }))} />
              </div>
              <Button
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending || Object.keys(form).length === 0}
                data-testid="button-save-church-settings"
              >
                {saveSettings.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invitations */}
        {activeSection === "invitations" && (
          <div className="space-y-5">
            {/* Create invitation */}
            <Card style={{ borderColor: "#b8962e33" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Invitation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input value={invLabel} onChange={e => setInvLabel(e.target.value)} placeholder="e.g. Sunday Service, Youth Group" data-testid="input-invite-label" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Uses <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input type="number" min="1" value={invMaxUses} onChange={e => setInvMaxUses(e.target.value)} placeholder="Unlimited" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="datetime-local" value={invExpiry} onChange={e => setInvExpiry(e.target.value)} />
                </div>
                <Button onClick={createInvitation} disabled={creatingInv} data-testid="button-create-invitation">
                  {creatingInv ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Generate Invitation"}
                </Button>
              </CardContent>
            </Card>

            {/* Invitation list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Invitations</h3>
              {invLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#b8962e" }} /></div>
              ) : !invitations?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No invitations yet. Create one above to start inviting members.</p>
              ) : (
                invitations.map(inv => (
                  <Card key={inv.id} className={`${!inv.isActive ? "opacity-60" : ""}`} style={{ borderColor: "#1a274418" }}>
                    <CardContent className="pt-4 pb-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-mono font-bold tracking-widest" style={{ color: "#1a2744" }}>{inv.inviteCode}</code>
                          {inv.label && <Badge variant="outline" className="text-xs">{inv.label}</Badge>}
                          {!inv.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inv.usedCount}{inv.maxUses ? `/${inv.maxUses}` : ""} uses</span>
                          {inv.expiresAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {inv.isActive && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => copyInviteLink(inv.inviteCode)} data-testid={`button-copy-invite-${inv.id}`}>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copy Link
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Deactivate this invitation?")) deactivateInv.mutate(inv.id); }} data-testid={`button-deactivate-invite-${inv.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
