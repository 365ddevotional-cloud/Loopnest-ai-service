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
  Settings, Copy, Trash2, Plus, Loader2, AlertCircle,
  Users, Calendar, Mic2, Megaphone, Heart, BarChart3, Link as LinkIcon
} from "lucide-react";
import type { Church, ChurchInvitation, ChurchSermon, ChurchAnnouncement, ChurchMember, ChurchPrayerRequest, ChurchActivity } from "@shared/schema";
import { CHURCH_ROLE_LABELS, CHURCH_ROLES, type ChurchRole } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const PROD_URL = "https://365dailydevotional.com";

type AdminTab = "settings" | "invitations" | "sermons" | "announcements" | "members" | "prayer" | "insights";

const roleColors: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-300",
  lead_pastor: "bg-blue-100 text-blue-800 border-blue-300",
  administrator: "bg-purple-100 text-purple-800 border-purple-300",
  associate_pastor: "bg-sky-100 text-sky-800 border-sky-300",
  ministry_leader: "bg-green-100 text-green-800 border-green-300",
  group_leader: "bg-teal-100 text-teal-800 border-teal-300",
  counselor: "bg-pink-100 text-pink-800 border-pink-300",
  prayer_team: "bg-rose-100 text-rose-800 border-rose-300",
  member: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function ChurchAdminPage() {
  const [, params] = useRoute("/church/:slug/admin");
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;

  const [activeTab, setActiveTab] = useState<AdminTab>("settings");

  // Settings form state
  const [form, setForm] = useState<Partial<Church>>({});

  // Invitation state
  const [invLabel, setInvLabel] = useState("");
  const [invExpiry, setInvExpiry] = useState("");
  const [invMaxUses, setInvMaxUses] = useState("");
  const [creatingInv, setCreatingInv] = useState(false);

  // Sermon form state
  const [sermonForm, setSermonForm] = useState({ title: "", description: "", speakerName: "", videoUrl: "", audioUrl: "", bibleReference: "", sermonDate: "" });
  const [addingSermon, setAddingSermon] = useState(false);
  const [showSermonForm, setShowSermonForm] = useState(false);

  // Announcement form state
  const [annForm, setAnnForm] = useState({ title: "", body: "", isPinned: false, expiresAt: "" });
  const [showAnnForm, setShowAnnForm] = useState(false);

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

  const { data: invitations } = useQuery<ChurchInvitation[]>({
    queryKey: ["/api/churches", church?.id, "invitations"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/invitations`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role && activeTab === "invitations",
  });

  const { data: sermons } = useQuery<ChurchSermon[]>({
    queryKey: ["/api/churches", church?.id, "sermons"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/sermons`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "sermons",
  });

  const { data: announcements } = useQuery<ChurchAnnouncement[]>({
    queryKey: ["/api/churches", church?.id, "announcements"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && (activeTab === "announcements" || activeTab === "settings"),
  });

  const { data: members } = useQuery<ChurchMember[]>({
    queryKey: ["/api/churches", church?.id, "members"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "members",
  });

  const { data: prayers } = useQuery<ChurchPrayerRequest[]>({
    queryKey: ["/api/churches", church?.id, "prayer"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/prayer`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "prayer",
  });

  const { data: activity } = useQuery<ChurchActivity[]>({
    queryKey: ["/api/churches", church?.id, "activity"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/activity`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "insights",
  });

  const isAuthorized = ADMIN_ROLES.includes(myRole?.role ?? "");
  const formVal = (field: keyof Church) => (field in form ? form[field] : church?.[field]) as string ?? "";

  // Save settings
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] }); setForm({}); toast({ title: "Settings saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Create invitation
  const createInvitation = async () => {
    if (!church?.id) return;
    setCreatingInv(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: invLabel || undefined, expiresAt: invExpiry || undefined, maxUses: invMaxUses ? Number(invMaxUses) : undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "invitations"] });
      setInvLabel(""); setInvExpiry(""); setInvMaxUses("");
      toast({ title: "Invitation created" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setCreatingInv(false); }
  };

  const deactivateInv = useMutation({
    mutationFn: async (invId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/invitations/${invId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "invitations"] }); toast({ title: "Invitation deactivated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyInviteLink = (code: string) => {
    const origin = window.location.hostname === "localhost" ? window.location.origin : PROD_URL;
    const url = `${origin}/church/join/${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied" })).catch(() => {
        const el = document.createElement("textarea");
        el.value = url; document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
        toast({ title: "Link copied" });
      });
    } else {
      const el = document.createElement("textarea");
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      toast({ title: "Link copied" });
    }
  };

  // Create sermon
  const createSermon = async () => {
    if (!church?.id || !sermonForm.title.trim()) return;
    setAddingSermon(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/sermons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(sermonForm),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "sermons"] });
      setSermonForm({ title: "", description: "", speakerName: "", videoUrl: "", audioUrl: "", bibleReference: "", sermonDate: "" });
      setShowSermonForm(false);
      toast({ title: "Sermon added" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setAddingSermon(false); }
  };

  const deleteSermon = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/sermons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "sermons"] }); toast({ title: "Sermon deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Create announcement
  const createAnnouncement = async () => {
    if (!church?.id || !annForm.title.trim() || !annForm.body.trim()) return;
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(annForm),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "announcements"] });
      setAnnForm({ title: "", body: "", isPinned: false, expiresAt: "" });
      setShowAnnForm(false);
      toast({ title: "Announcement published" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const deleteAnn = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "announcements"] }); toast({ title: "Announcement deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Member role update
  const roleUpdate = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: "Role updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: "Member removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete prayer request
  const deletePrayer = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/prayer/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "prayer"] }); toast({ title: "Request removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (churchLoading) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} />
        </div>
      </ChurchModeShell>
    );
  }

  if (!isAuthorized) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
        <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #dc2626", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Access Denied</p>
              <p className="text-xs text-muted-foreground">Only church administrators can access this area.</p>
            </div>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: typeof Settings }[] = [
    { key: "settings", label: "Settings", icon: Settings },
    { key: "invitations", label: "Invitations", icon: LinkIcon },
    { key: "sermons", label: "Sermons", icon: Mic2 },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "members", label: "Members", icon: Users },
    { key: "prayer", label: "Prayer", icon: Heart },
    { key: "insights", label: "Insights", icon: BarChart3 },
  ];

  const activityLabels: Record<string, string> = {
    joined: "Joined the church",
    sermon_viewed: "Viewed a sermon",
    prayer_submitted: "Submitted a prayer request",
    announcement_read: "Read an announcement",
    group_joined: "Joined a group",
  };

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
            <Settings className="w-5 h-5" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>Church Administration</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>Manage your church space and community</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto gap-0 border-b" style={{ borderColor: "#e0dcd8" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 flex-shrink-0 transition-colors"
              style={{ borderColor: activeTab === key ? "#b8962e" : "transparent", color: activeTab === key ? "#b8962e" : "#7a7570" }}
              data-testid={`tab-admin-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && church && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>Church Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label>Church Name</Label>
                <Input value={formVal("name")} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-admin-church-name" /></div>
              <div className="space-y-1.5"><Label>Denomination</Label>
                <Input value={formVal("denomination") as string} onChange={e => setForm(f => ({ ...f, denomination: e.target.value || null }))} placeholder="e.g. Baptist, Pentecostal, Non-denominational" /></div>
              <div className="space-y-1.5"><Label>Description</Label>
                <Textarea value={formVal("description") as string} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} rows={3} /></div>
              <div className="space-y-1.5"><Label>Address</Label>
                <Input value={formVal("address") as string} onChange={e => setForm(f => ({ ...f, address: e.target.value || null }))} /></div>
              <div className="space-y-1.5"><Label>Website URL</Label>
                <Input type="url" value={formVal("websiteUrl") as string} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value || null }))} /></div>
              <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || Object.keys(form).length === 0}
                style={{ backgroundColor: "#1a2744" }} data-testid="button-save-church-settings">
                {saveSettings.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="space-y-5">
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}><Plus className="w-4 h-4" />Create Invitation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input value={invLabel} onChange={e => setInvLabel(e.target.value)} placeholder="e.g. Sunday Service" data-testid="input-invite-label" /></div>
                  <div className="space-y-1.5"><Label>Max Uses <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input type="number" min="1" value={invMaxUses} onChange={e => setInvMaxUses(e.target.value)} placeholder="Unlimited" /></div>
                </div>
                <div className="space-y-1.5"><Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="datetime-local" value={invExpiry} onChange={e => setInvExpiry(e.target.value)} /></div>
                <Button onClick={createInvitation} disabled={creatingInv} style={{ backgroundColor: "#1a2744" }} data-testid="button-create-invitation">
                  {creatingInv ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Generate Invitation"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>Active Invitations</h3>
              {!invitations?.length ? (
                <p className="text-sm text-center py-6" style={{ color: "#7a7570" }}>No invitations yet.</p>
              ) : invitations.map(inv => (
                <Card key={inv.id} className={`border-0 shadow-sm ${!inv.isActive ? "opacity-60" : ""}`} style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono font-bold tracking-widest" style={{ color: "#1a2744" }}>{inv.inviteCode}</code>
                        {inv.label && <Badge variant="outline" className="text-xs">{inv.label}</Badge>}
                        {!inv.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs" style={{ color: "#7a7570" }}>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inv.usedCount}{inv.maxUses ? `/${inv.maxUses}` : ""} uses</span>
                        {inv.expiresAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {inv.isActive && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyInviteLink(inv.inviteCode)} data-testid={`button-copy-invite-${inv.id}`}>
                          <Copy className="w-3.5 h-3.5 mr-1" />Copy Link
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Deactivate this invitation?")) deactivateInv.mutate(inv.id); }}
                          data-testid={`button-deactivate-invite-${inv.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sermons Tab */}
        {activeTab === "sermons" && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button onClick={() => setShowSermonForm(v => !v)} style={{ backgroundColor: "#1a2744" }} data-testid="button-add-sermon">
                <Plus className="w-4 h-4 mr-1.5" />{showSermonForm ? "Cancel" : "Add Sermon"}
              </Button>
            </div>
            {showSermonForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>New Sermon</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Title *</Label>
                      <Input value={sermonForm.title} onChange={e => setSermonForm(f => ({ ...f, title: e.target.value }))} data-testid="input-sermon-title" /></div>
                    <div className="space-y-1.5"><Label>Speaker</Label>
                      <Input value={sermonForm.speakerName} onChange={e => setSermonForm(f => ({ ...f, speakerName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Bible Reference</Label>
                      <Input value={sermonForm.bibleReference} onChange={e => setSermonForm(f => ({ ...f, bibleReference: e.target.value }))} placeholder="e.g. John 3:16" /></div>
                    <div className="space-y-1.5"><Label>Sermon Date</Label>
                      <Input type="date" value={sermonForm.sermonDate} onChange={e => setSermonForm(f => ({ ...f, sermonDate: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Video URL</Label>
                      <Input type="url" value={sermonForm.videoUrl} onChange={e => setSermonForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube, Vimeo, etc." /></div>
                    <div className="space-y-1.5"><Label>Audio URL</Label>
                      <Input type="url" value={sermonForm.audioUrl} onChange={e => setSermonForm(f => ({ ...f, audioUrl: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Description / Notes</Label>
                    <Textarea value={sermonForm.description} onChange={e => setSermonForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                  <Button onClick={createSermon} disabled={addingSermon || !sermonForm.title.trim()} style={{ backgroundColor: "#1a2744" }}>
                    {addingSermon ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Sermon"}
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {!sermons?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>No sermons yet. Add your first one above.</p>
              ) : sermons.map(s => (
                <Card key={s.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>
                        {s.speakerName && `${s.speakerName} · `}{s.bibleReference && `${s.bibleReference} · `}
                        {s.sermonDate ? new Date(s.sermonDate).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => { if (confirm("Delete this sermon?")) deleteSermon.mutate(s.id); }}
                      data-testid={`button-delete-sermon-${s.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button onClick={() => setShowAnnForm(v => !v)} style={{ backgroundColor: "#1a2744" }} data-testid="button-add-announcement">
                <Plus className="w-4 h-4 mr-1.5" />{showAnnForm ? "Cancel" : "New Announcement"}
              </Button>
            </div>
            {showAnnForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>New Announcement</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5"><Label>Title *</Label>
                    <Input value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} data-testid="input-ann-title" /></div>
                  <div className="space-y-1.5"><Label>Body *</Label>
                    <Textarea value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} rows={4} data-testid="input-ann-body" /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input type="datetime-local" value={annForm.expiresAt} onChange={e => setAnnForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" id="pin-ann" checked={annForm.isPinned} onChange={e => setAnnForm(f => ({ ...f, isPinned: e.target.checked }))} className="rounded" />
                      <Label htmlFor="pin-ann">Pin to top</Label>
                    </div>
                  </div>
                  <Button onClick={createAnnouncement} disabled={!annForm.title.trim() || !annForm.body.trim()} style={{ backgroundColor: "#1a2744" }}>
                    Publish Announcement
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {!announcements?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>No announcements yet.</p>
              ) : announcements.map(a => (
                <Card key={a.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{a.title}</p>
                        {a.isPinned && <Badge className="text-xs" style={{ backgroundColor: "#b8962e20", color: "#b8962e", border: "1px solid #b8962e30" }}>Pinned</Badge>}
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: "#5a5450" }}>{a.body}</p>
                      <p className="text-xs mt-1" style={{ color: "#9a9080" }}>{new Date(a.createdAt!).toLocaleDateString()}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => { if (confirm("Delete this announcement?")) deleteAnn.mutate(a.id); }}
                      data-testid={`button-delete-announcement-${a.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
              {members?.length ?? 0} Members
            </p>
            {!members?.length ? (
              <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>No members yet.</p>
            ) : members.map(m => {
              const isCurrentUser = m.firebaseUid === user?.uid;
              const canManage = !isCurrentUser && m.role !== "owner";
              return (
                <Card key={m.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ backgroundColor: "#1a274418", color: "#1a2744" }}>
                      {(m.displayName ?? m.email)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate" style={{ color: "#1a2744" }}>{m.displayName ?? m.email}</span>
                        {isCurrentUser && <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">You</Badge>}
                      </div>
                      <p className="text-xs truncate" style={{ color: "#7a7570" }}>{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManage ? (
                        <Select value={m.role} onValueChange={role => roleUpdate.mutate({ memberId: m.id, role })}>
                          <SelectTrigger className={`h-7 text-xs w-38 border ${roleColors[m.role] ?? ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHURCH_ROLES.filter(r => r !== "owner").map(r => (
                              <SelectItem key={r} value={r}>{CHURCH_ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColors[m.role] ?? ""}`}>
                          {CHURCH_ROLE_LABELS[m.role as ChurchRole] ?? m.role}
                        </span>
                      )}
                      {canManage && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm(`Remove ${m.displayName ?? m.email}?`)) removeMember.mutate(m.id); }}
                          data-testid={`button-remove-member-${m.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Prayer Tab */}
        {activeTab === "prayer" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
              All Prayer Requests (admin view — including confidential)
            </p>
            {!prayers?.length ? (
              <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>No prayer requests yet.</p>
            ) : prayers.map(pr => (
              <Card key={pr.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-4 pb-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{pr.title}</p>
                      {pr.isConfidential && (
                        <Badge className="text-xs gap-1" style={{ backgroundColor: "#7a152015", color: "#7a1520", border: "1px solid #7a152020" }}>
                          Confidential
                        </Badge>
                      )}
                      {pr.status === "answered" && (
                        <Badge className="text-xs" style={{ backgroundColor: "#1a574420", color: "#1a5744", border: "1px solid #1a574430" }}>
                          Answered
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "#5a5450" }}>{pr.body}</p>
                    <p className="text-xs mt-1" style={{ color: "#9a9080" }}>
                      {pr.displayName ?? "Anonymous"} · {pr.prayerCount} praying · {new Date(pr.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => { if (confirm("Remove this prayer request?")) deletePrayer.mutate(pr.id); }}
                    data-testid={`button-delete-prayer-${pr.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Members", count: members?.length },
                { label: "Sermons", count: sermons?.length },
                { label: "Prayer Requests", count: prayers?.length },
                { label: "Announcements", count: announcements?.length },
              ].map(stat => (
                <Card key={stat.label} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 px-4">
                    <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{stat.count ?? "—"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7a7570" }}>Recent Activity</p>
              {!activity?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>No activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 50).map(act => (
                    <Card key={act.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-3 pb-3 px-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#1a274412" }}>
                          <span className="text-xs font-bold" style={{ color: "#1a2744" }}>
                            {(act.displayName ?? "?")[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: "#1a2744" }}>
                            <span className="font-medium">{act.displayName ?? "Anonymous"}</span>
                            {" "}{activityLabels[act.activityType] ?? act.activityType}
                          </p>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: "#9a9080" }}>
                          {new Date(act.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
