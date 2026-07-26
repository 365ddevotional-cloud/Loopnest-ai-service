import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Users, Calendar, Mic2, Megaphone, Heart, BarChart3, Link as LinkIcon,
  HandCoins, Upload, ImageIcon, X, DollarSign, ToggleLeft, ToggleRight,
  Building2, CreditCard, ArrowDownToLine, Share2, Tag, CheckCircle2, XCircle, Globe, ExternalLink,
  ClockIcon
} from "lucide-react";
import type { Church, ChurchInvitation, ChurchSermon, ChurchAnnouncement, ChurchMember, ChurchPrayerRequest, ChurchActivity, ChurchGivingSettings, ChurchGivingCategory, ChurchPayoutConfig, ChurchTransaction } from "@shared/schema";
import { CHURCH_ROLE_LABELS, CHURCH_ROLES, type ChurchRole } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const DEPT_TYPES = ["Youth Ministry","Children's Ministry","Women's Fellowship","Men's Fellowship","Choir","Ushering","Media","Evangelism","Prayer Team","Sunday School","Hospitality","Finance","Protocol","Follow-Up","Missions","Custom"];

function AdminDepartmentsPanel({ church, getIdToken }: { church: Church; getIdToken: () => Promise<string | null> }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptType, setDeptType] = useState("Custom");
  const [creating, setCreating] = useState(false);
  // Edit state
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Custom");
  const [savingEdit, setSavingEdit] = useState(false);

  const { data: departments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/churches", church.id, "departments-admin"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church.id}/departments`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
  });

  const handleCreate = async () => {
    if (!deptName.trim()) return;
    setCreating(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ name: deptName.trim(), type: deptType }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      toast({ title: t("cm_deptCreated") });
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "departments-admin"] });
      setShowCreate(false); setDeptName(""); setDeptType("Custom");
    } finally { setCreating(false); }
  };

  const handleDelete = async (deptId: number) => {
    const token = await getIdToken();
    await fetch(`/api/churches/departments/${deptId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
    qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "departments-admin"] });
    toast({ title: t("cm_deptRemoved") });
  };

  const startEdit = (dept: any) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditType(dept.type ?? "Custom");
    setShowCreate(false);
  };

  const handleSaveEdit = async () => {
    if (!editingDept || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/departments/${editingDept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ name: editName.trim(), type: editType }),
      });
      if (!r.ok) { toast({ title: t("cm_error"), description: (await r.json()).message, variant: "destructive" }); return; }
      toast({ title: t("cm_deptUpdated") });
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "departments-admin"] });
      setEditingDept(null);
    } finally { setSavingEdit(false); }
  };

  const handleArchive = async (dept: any) => {
    if (!confirm(t("cm_archiveDeptConfirm"))) return;
    const token = await getIdToken();
    const r = await fetch(`/api/churches/departments/${dept.id}/archive`, { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` } });
    if (!r.ok) { toast({ title: t("cm_error"), variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "departments-admin"] });
    toast({ title: t("cm_deptArchived") });
  };

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => { setShowCreate(true); setEditingDept(null); }} className="gap-2" style={{ backgroundColor: "#1a2744" }}
        data-testid="button-admin-create-dept">
        <Plus className="w-4 h-4" />{t("cm_createDepartment")}
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#b8962e" }} /></div>
      ) : !departments?.length ? (
        <div className="text-center py-10">
          <Building2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#c9b99060" }} />
          <p className="text-sm" style={{ color: "#7a7570" }}>{t("cm_noDepartmentsYet")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept: any) => (
            <div key={dept.id}>
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-3 pb-3 px-4 flex items-center gap-3">
                  <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: "#1a2744" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{dept.name}</p>
                    <p className="text-xs" style={{ color: "#7a7570" }}>{dept.type} · Invite: {dept.inviteCode}</p>
                  </div>
                  <a href={`/church/${church.slug}/departments/${dept.slug}`}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: "#1a274412", color: "#1a2744" }}>{t("cm_open")}</a>
                  <button onClick={() => startEdit(dept)} className="p-1.5 rounded hover:bg-blue-50" data-testid={`button-edit-dept-${dept.id}`} title={t("cm_editDept")}>
                    <Settings className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                  <button onClick={() => handleArchive(dept)} className="p-1.5 rounded hover:bg-amber-50" data-testid={`button-archive-dept-${dept.id}`} title={t("cm_archiveDept")}>
                    <ArrowDownToLine className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button onClick={() => handleDelete(dept.id)} className="p-1.5 rounded hover:bg-red-50" data-testid={`button-delete-dept-${dept.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </CardContent>
              </Card>
              {editingDept?.id === dept.id && (
                <Card className="border border-blue-200 mt-1 mb-1" style={{ backgroundColor: "#f0f7ff" }}>
                  <CardContent className="pt-3 pb-3 px-4 space-y-3">
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_deptEditTitle")}</p>
                    <div className="space-y-1.5">
                      <Label>{t("cm_deptNameLabel")}</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} data-testid="input-edit-dept-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("cm_deptTypeLabel")}</Label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                        value={editType} onChange={e => setEditType(e.target.value)}>
                        {DEPT_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm" onClick={() => setEditingDept(null)} className="flex-1">{t("cm_cancel")}</Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()} className="flex-1"
                        style={{ backgroundColor: "#1a2744" }} data-testid="button-save-edit-dept">
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}{t("cm_saveChanges2")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Card className="border" style={{ borderColor: "#e8e3dc" }}>
          <CardContent className="pt-4 pb-4 px-4 space-y-3">
            <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_newDept")}</p>
            <Input value={deptName} onChange={e => setDeptName(e.target.value)} placeholder={t("cm_deptNamePlaceholder")} data-testid="input-admin-dept-name" />
            <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
              value={deptType} onChange={e => setDeptType(e.target.value)}>
              {DEPT_TYPES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating || !deptName.trim()} className="flex-1"
                style={{ backgroundColor: "#1a2744" }} data-testid="button-admin-confirm-dept">
                {creating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}{t("cm_createDepartment")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const PROD_URL = "https://365dailydevotional.com";

type AdminTab = "settings" | "branding" | "invitations" | "sermons" | "announcements" | "members" | "prayer" | "giving" | "reports" | "insights" | "departments" | "website";

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
  const { t } = useI18n();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("settings");

  // Settings form state
  const [form, setForm] = useState<Partial<Church>>({});

  // Invitation state
  const [invLabel, setInvLabel] = useState("");
  const [invExpiry, setInvExpiry] = useState("");
  const [invMaxUses, setInvMaxUses] = useState("");
  const [invType, setInvType] = useState("membership");
  const [invGroupId, setInvGroupId] = useState("");
  const [creatingInv, setCreatingInv] = useState(false);
  const [showInvForm, setShowInvForm] = useState(false);

  // Sermon form state
  const [sermonForm, setSermonForm] = useState({ title: "", description: "", speakerName: "", videoUrl: "", audioUrl: "", audioUrl2: "", pdfNotesUrl: "", outlineUrl: "", imageUrl: "", bibleReference: "", sermonDate: "", scheduledDate: "", isPublished: true });
  const [addingSermon, setAddingSermon] = useState(false);
  const [showSermonForm, setShowSermonForm] = useState(false);

  // Announcement form state
  const [annForm, setAnnForm] = useState({ title: "", body: "", isPinned: false, expiresAt: "", imageUrl: "", pdfUrl: "", externalLink: "" });
  const [showAnnForm, setShowAnnForm] = useState(false);

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);

  // Branding form state
  const [brandingForm, setBrandingForm] = useState({ logoUrl: "", bannerUrl: "", themeColor: "" });
  const [savingBranding, setSavingBranding] = useState(false);

  // Website settings form state
  const [websiteForm, setWebsiteForm] = useState({
    pastorName: "", phone: "", email: "", welcomeMessage: "",
    missionStatement: "", vision: "", visitorInfo: "",
    mapEmbedUrl: "", websiteHeroImage: "",
    publicWebsiteEnabled: true,
    facebookUrl: "", instagramUrl: "", youtubeUrl: "", twitterUrl: "", whatsappNumber: "",
    serviceTimesRaw: "", publicPhotosRaw: "",
  });
  const [savingWebsite, setSavingWebsite] = useState(false);

  // Giving state
  const [givingSettingsForm, setGivingSettingsForm] = useState<Partial<ChurchGivingSettings>>({});
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [payoutForm, setPayoutForm] = useState<Partial<ChurchPayoutConfig>>({});
  const [savingPayout, setSavingPayout] = useState(false);
  const [savingGivingSettings, setSavingGivingSettings] = useState(false);

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

  // Pending member count (for admin tab badge and shell badge)
  const { data: pendingCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/churches", church?.id, "pending-count"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return { count: 0 };
      const r = await fetch(`/api/churches/${church.id}/members/pending-count`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : { count: 0 };
    },
    enabled: !!church?.id && !!myRole?.role && ADMIN_ROLES.includes(myRole.role),
    refetchInterval: 30000,
  });
  const pendingCount = pendingCountData?.count ?? 0;

  // Deletion request state
  const [deletionForm, setDeletionForm] = useState({ reason: "", explanation: "", ownerEmail: "", ownerName: "" });
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  const { data: myDeletionRequest } = useQuery<any>({
    queryKey: ["/api/churches", church?.id, "deletion-request"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return null;
      const r = await fetch(`/api/churches/${church.id}/deletion-request`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : null;
    },
    enabled: !!church?.id && myRole?.role === "owner",
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

  const { data: groups } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/churches", church?.id, "groups"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/groups`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "invitations",
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

  const { data: givingSettings } = useQuery<ChurchGivingSettings>({
    queryKey: ["/api/churches", church?.id, "giving", "settings"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) throw new Error();
      const r = await fetch(`/api/churches/${church.id}/giving/settings`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : null;
    },
    enabled: !!church?.id && activeTab === "giving",
  });

  const { data: givingCategories, refetch: refetchCategories } = useQuery<ChurchGivingCategory[]>({
    queryKey: ["/api/churches", church?.id, "giving", "categories"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/giving/categories`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "giving",
  });

  const { data: payoutConfig, refetch: refetchPayout } = useQuery<ChurchPayoutConfig | null>({
    queryKey: ["/api/churches", church?.id, "payout-config"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return null;
      const r = await fetch(`/api/churches/${church.id}/payout-config`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : null;
    },
    enabled: !!church?.id && activeTab === "giving",
  });

  const { data: transactions } = useQuery<ChurchTransaction[]>({
    queryKey: ["/api/churches", church?.id, "giving", "transactions"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return [];
      const r = await fetch(`/api/churches/${church.id}/giving/transactions`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && activeTab === "giving",
  });

  const { data: givingReports } = useQuery<{
    today: { gross: number; fee: number; net: number; count: number };
    week: { gross: number; fee: number; net: number; count: number };
    month: { gross: number; fee: number; net: number; count: number };
    year: { gross: number; fee: number; net: number; count: number };
    all: { gross: number; fee: number; net: number; count: number };
    recent: ChurchTransaction[];
  }>({
    queryKey: ["/api/churches", church?.id, "giving", "reports"],
    queryFn: async () => {
      const token = await getIdToken(); if (!token || !church?.id) return null;
      const r = await fetch(`/api/churches/${church.id}/giving/reports`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : null;
    },
    enabled: !!church?.id && activeTab === "reports",
  });

  const isAuthorized = ADMIN_ROLES.includes(myRole?.role ?? "");
  const formVal = (field: keyof Church) => (field in form ? form[field] : church?.[field]) as string ?? "";

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !church?.id) return;
    setLogoUploading(true);
    try {
      const token = await getIdToken();
      // Step 1: get presigned URL
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      // Step 2: upload file directly
      const uploadRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error("Upload failed");
      // Step 3: save logo URL to church
      const saveRes = await fetch(`/api/churches/${church.id}/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ logoUrl: objectPath }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).message ?? "Save failed");
      qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] });
      toast({ title: t("cm_logoUpdated") });
    } catch (err: any) {
      toast({ title: t("cm_uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  // Save giving settings
  const saveGivingSettings = async () => {
    if (!church?.id) return;
    setSavingGivingSettings(true);
    try {
      const token = await getIdToken();
      const current = givingSettings ?? {};
      const merged = { ...current, ...givingSettingsForm };
      const r = await fetch(`/api/churches/${church.id}/giving/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(merged),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "giving", "settings"] });
      setGivingSettingsForm({});
      toast({ title: t("cm_givingSettingsSaved") });
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally { setSavingGivingSettings(false); }
  };

  // Add giving category
  const addCategory = async () => {
    if (!church?.id || !newCatName.trim()) return;
    setAddingCat(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/giving/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() || undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      setNewCatName(""); setNewCatDesc("");
      refetchCategories();
      toast({ title: t("cm_categoryAdded") });
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally { setAddingCat(false); }
  };

  const toggleCategory = async (cat: ChurchGivingCategory) => {
    if (!church?.id) return;
    try {
      const token = await getIdToken();
      await fetch(`/api/churches/${church.id}/giving/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      refetchCategories();
    } catch { toast({ title: t("cm_errorUpdatingCategory"), variant: "destructive" }); }
  };

  const deleteCategory = async (catId: number) => {
    if (!church?.id) return;
    try {
      const token = await getIdToken();
      await fetch(`/api/churches/${church.id}/giving/categories/${catId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      refetchCategories();
      toast({ title: t("cm_categoryRemoved") });
    } catch { toast({ title: t("cm_error"), variant: "destructive" }); }
  };

  // Save payout config
  const savePayout = async () => {
    if (!church?.id) return;
    setSavingPayout(true);
    try {
      const token = await getIdToken();
      const current = payoutConfig ?? {};
      const merged = { ...current, ...payoutForm };
      const r = await fetch(`/api/churches/${church.id}/payout-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(merged),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      refetchPayout();
      setPayoutForm({});
      toast({ title: t("cm_payoutSaved") });
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally { setSavingPayout(false); }
  };

  // Save branding
  const saveBranding = async () => {
    if (!church?.id) return;
    setSavingBranding(true);
    try {
      const token = await getIdToken();
      const update: Record<string, string | null> = {};
      if (brandingForm.logoUrl !== undefined) update.logoUrl = brandingForm.logoUrl || null;
      if (brandingForm.bannerUrl !== undefined) update.bannerUrl = brandingForm.bannerUrl || null;
      if (brandingForm.themeColor !== undefined) update.themeColor = brandingForm.themeColor || null;
      const r = await fetch(`/api/churches/${church.id}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(update),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] });
      setBrandingForm({ logoUrl: "", bannerUrl: "", themeColor: "" });
      toast({ title: t("cm_brandingUpdated") });
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally { setSavingBranding(false); }
  };

  // Save website settings
  const saveWebsite = async () => {
    if (!church?.id) return;
    setSavingWebsite(true);
    try {
      const token = await getIdToken();
      let serviceTimes: Array<{ day: string; time: string; type: string }> = [];
      if (websiteForm.serviceTimesRaw.trim()) {
        serviceTimes = websiteForm.serviceTimesRaw.split("\n").map(line => {
          const parts = line.split("|").map(p => p.trim());
          return { day: parts[0] ?? "", time: parts[1] ?? "", type: parts[2] ?? "" };
        }).filter(s => s.day && s.time);
      }
      let publicPhotos: string[] = [];
      if (websiteForm.publicPhotosRaw.trim()) {
        publicPhotos = websiteForm.publicPhotosRaw.split("\n").map(l => l.trim()).filter(Boolean);
      }
      const socialLinks: Record<string, string> = {};
      if (websiteForm.facebookUrl) socialLinks.facebook = websiteForm.facebookUrl;
      if (websiteForm.instagramUrl) socialLinks.instagram = websiteForm.instagramUrl;
      if (websiteForm.youtubeUrl) socialLinks.youtube = websiteForm.youtubeUrl;
      if (websiteForm.twitterUrl) socialLinks.twitter = websiteForm.twitterUrl;
      if (websiteForm.whatsappNumber) socialLinks.whatsapp = websiteForm.whatsappNumber;
      const update: Record<string, any> = {
        pastorName: websiteForm.pastorName || null,
        phone: websiteForm.phone || null,
        email: websiteForm.email || null,
        welcomeMessage: websiteForm.welcomeMessage || null,
        missionStatement: websiteForm.missionStatement || null,
        vision: websiteForm.vision || null,
        visitorInfo: websiteForm.visitorInfo || null,
        mapEmbedUrl: websiteForm.mapEmbedUrl || null,
        websiteHeroImage: websiteForm.websiteHeroImage || null,
        publicWebsiteEnabled: websiteForm.publicWebsiteEnabled,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        serviceTimes: serviceTimes.length > 0 ? serviceTimes : null,
        publicPhotos: publicPhotos.length > 0 ? publicPhotos : null,
      };
      const r = await fetch(`/api/churches/${church.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(update),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] });
      toast({ title: t("cm_websiteSettingsSaved") });
    } catch (err: any) {
      toast({ title: t("cm_error"), description: err.message, variant: "destructive" });
    } finally { setSavingWebsite(false); }
  };

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches/slug", slug] }); setForm({}); toast({ title: t("cm_settingsSaved") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
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
        body: JSON.stringify({
          label: invLabel || undefined,
          expiresAt: invExpiry || undefined,
          maxUses: invMaxUses ? Number(invMaxUses) : undefined,
          invitationType: invType,
          targetGroupId: invGroupId ? Number(invGroupId) : undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "invitations"] });
      setInvLabel(""); setInvExpiry(""); setInvMaxUses(""); setInvType("membership"); setInvGroupId("");
      setShowInvForm(false);
      toast({ title: t("cm_invitationCreated") });
    } catch (e: any) { toast({ title: t("cm_error"), description: e.message, variant: "destructive" }); }
    finally { setCreatingInv(false); }
  };

  const deactivateInv = useMutation({
    mutationFn: async (invId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/invitations/${invId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "invitations"] }); toast({ title: t("cm_invitationDeactivated") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const deleteInv = useMutation({
    mutationFn: async (invId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/invitations/${invId}?permanent=true`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "invitations"] }); toast({ title: t("cm_invitationDeleted") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const approveMember = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] });
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "pending-count"] });
      toast({ title: t("cm_memberApproved") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const declineMember = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}/decline`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] });
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "pending-count"] });
      toast({ title: t("cm_requestDeclined") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  function copyText(text: string, label = "Copied") {
    const fallback = () => { const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast({ title: label })).catch(fallback);
    else { fallback(); toast({ title: label }); }
  }

  const copyInviteLink = (code: string) => {
    const origin = window.location.hostname === "localhost" ? window.location.origin : PROD_URL;
    copyText(`${origin}/church/join/${code}`, "Link copied");
  };

  const copyInviteCode = (code: string) => copyText(code, "Code copied");

  const shareInvite = async (code: string, churchName: string) => {
    const origin = window.location.hostname === "localhost" ? window.location.origin : PROD_URL;
    const url = `${origin}/church/join/${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${churchName}`, text: `You're invited to join ${churchName}. Code: ${code}`, url }); return; } catch { /* fall through */ }
    }
    copyInviteLink(code);
  };

  // Create sermon
  const createSermon = async () => {
    if (!church?.id || !sermonForm.title.trim()) return;
    setAddingSermon(true);
    try {
      const token = await getIdToken();
      const { audioUrl2: _, ...payload } = sermonForm;
      const r = await fetch(`/api/churches/${church.id}/sermons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...payload, sermonDate: payload.sermonDate || null, scheduledDate: payload.scheduledDate || null }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "sermons"] });
      setSermonForm({ title: "", description: "", speakerName: "", videoUrl: "", audioUrl: "", audioUrl2: "", pdfNotesUrl: "", outlineUrl: "", imageUrl: "", bibleReference: "", sermonDate: "", scheduledDate: "", isPublished: true });
      setShowSermonForm(false);
      toast({ title: t("cm_sermonCreated") });
    } catch (e: any) { toast({ title: t("cm_error"), description: e.message, variant: "destructive" }); }
    finally { setAddingSermon(false); }
  };

  const deleteSermon = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/sermons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "sermons"] }); toast({ title: t("cm_sermonDeleted") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  // Create announcement
  const createAnnouncement = async () => {
    if (!church?.id || !annForm.title.trim() || !annForm.body.trim()) return;
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...annForm,
          expiresAt: annForm.expiresAt || null,
          imageUrl: annForm.imageUrl || null,
          pdfUrl: annForm.pdfUrl || null,
          externalLink: annForm.externalLink || null,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "announcements"] });
      setAnnForm({ title: "", body: "", isPinned: false, expiresAt: "", imageUrl: "", pdfUrl: "", externalLink: "" });
      setShowAnnForm(false);
      toast({ title: t("cm_announcementPosted") });
    } catch (e: any) { toast({ title: t("cm_error"), description: e.message, variant: "destructive" }); }
  };

  const deleteAnn = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "announcements"] }); toast({ title: t("cm_announcementDeleted") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: t("cm_roleUpdated") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/members/${memberId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "members"] }); toast({ title: t("cm_memberRemoved") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  // Delete prayer request
  const deletePrayer = useMutation({
    mutationFn: async (id: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/prayer/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "prayer"] }); toast({ title: t("cm_prayerRequestRemoved") }); },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
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
              <p className="font-semibold text-sm">{t("cm_accessDenied")}</p>
              <p className="text-xs text-muted-foreground">{t("cm_accessDeniedDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: typeof Settings }[] = [
    { key: "settings", label: t("cm_settings"), icon: Settings },
    { key: "branding", label: t("cm_branding"), icon: ImageIcon },
    { key: "invitations", label: t("cm_invitationsTab"), icon: LinkIcon },
    { key: "sermons", label: t("cm_sermons"), icon: Mic2 },
    { key: "announcements", label: t("cm_announcements"), icon: Megaphone },
    { key: "members", label: t("cm_membersTab"), icon: Users },
    { key: "prayer", label: t("cm_prayerTab"), icon: Heart },
    { key: "giving", label: t("cm_benefitGiving"), icon: HandCoins },
    { key: "departments", label: t("cm_departments"), icon: Building2 },
    { key: "website", label: t("cm_websiteSettings"), icon: Globe },
    { key: "reports", label: t("cm_reports"), icon: BarChart3 },
    { key: "insights", label: t("cm_insightsTab"), icon: BarChart3 },
  ];

  const activityLabels: Record<string, string> = {
    joined: "Joined the church",
    sermon_viewed: "Viewed a sermon",
    prayer_submitted: "Submitted a prayer request",
    announcement_read: "Read an announcement",
    group_joined: "Joined a group",
  };

  const submitDeletionRequest = async () => {
    if (!church || !deletionForm.reason.trim() || !deletionForm.ownerEmail.trim()) return;
    setSubmittingDeletion(true);
    try {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church.id}/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify(deletionForm),
      });
      const data = await r.json();
      if (r.status === 409) { toast({ title: t("cm_deletionRequestPending") }); return; }
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "deletion-request"] });
      toast({ title: t("cm_deletionRequestSubmitted") });
    } finally { setSubmittingDeletion(false); }
  };

  return (
    <ChurchModeShell church={church ?? null} currentRole={myRole?.role ?? null} pendingMembers={pendingCount}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#b8962e18" }}>
            <Settings className="w-5 h-5" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>{t("cm_churchAdministration")}</h2>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>{t("cm_manageChurchSpace")}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto gap-0 border-b scrollbar-hide" style={{ borderColor: "#e0dcd8" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 flex-shrink-0 transition-colors"
              style={{ borderColor: activeTab === key ? "#b8962e" : "transparent", color: activeTab === key ? "#b8962e" : "#7a7570" }}
              data-testid={`tab-admin-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key === "members" && pendingCount > 0 && (
                <span className="ml-1 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none" style={{ backgroundColor: "#f59e0b", color: "#fff" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && church && (
          <div className="space-y-5">
            {/* Church Logo */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <ImageIcon className="w-4 h-4" />{t("cm_churchLogo")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden border-2 flex items-center justify-center"
                    style={{ borderColor: "#e8e3dc", backgroundColor: "#f8f4ee" }}>
                    {church.logoUrl ? (
                      <img src={church.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8" style={{ color: "#c9b990" }} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: "#4a4540" }}>
                      {t("cm_logoSquareHint")}
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ backgroundColor: "#1a2744", color: "#fff" }}
                      data-testid="button-upload-logo">
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? t("cm_uploading") : t("cm_uploadLogo")}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                    {church.logoUrl && (
                      <p className="text-xs" style={{ color: "#9a9080" }}>{t("cm_logoIsSet")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Church Identity */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_churchIdentity")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {myRole?.role === "owner" && (
                  <div className="space-y-1.5">
                    <Label>{t("cm_churchName")}</Label>
                    <Input value={formVal("name")} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-admin-church-name" />
                    {form.name !== undefined && form.name !== church?.name && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {t("cm_nameChangeAlert")}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5"><Label>{t("cm_denomination")}</Label>
                  <Input value={formVal("denomination") as string} onChange={e => setForm(f => ({ ...f, denomination: e.target.value || null }))} placeholder="e.g. Baptist, Pentecostal, Non-denominational" /></div>
                <div className="space-y-1.5"><Label>{t("cm_deptDescription")}</Label>
                  <Textarea value={formVal("description") as string} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} rows={3} /></div>
                <div className="space-y-1.5"><Label>{t("cm_addressLabel")}</Label>
                  <Input value={formVal("address") as string} onChange={e => setForm(f => ({ ...f, address: e.target.value || null }))} /></div>
                <div className="space-y-1.5"><Label>{t("cm_websiteUrl")}</Label>
                  <Input type="url" value={formVal("websiteUrl") as string} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value || null }))} /></div>
                <Button
                  onClick={() => {
                    const nameChanging = form.name !== undefined && form.name !== church?.name;
                    if (nameChanging) { setShowReauthDialog(true); return; }
                    saveSettings.mutate();
                  }}
                  disabled={saveSettings.isPending || Object.keys(form).length === 0}
                  style={{ backgroundColor: "#1a2744" }} data-testid="button-save-church-settings">
                  {saveSettings.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_saveChanges")}
                </Button>
              </CardContent>
            </Card>

            {/* Church Deletion Request (owner only) */}
            {myRole?.role === "owner" && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff", borderTop: "3px solid #dc2626" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />{t("cm_deletionRequestTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myDeletionRequest ? (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: "#4a4540" }}>{t("cm_deletionRequestStatus")}: <strong>{myDeletionRequest.status}</strong></p>
                      {myDeletionRequest.adminNote && <p className="text-sm text-muted-foreground">{myDeletionRequest.adminNote}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(myDeletionRequest.createdAt).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm" style={{ color: "#6b6560" }}>{t("cm_deletionRequestDesc")}</p>
                      <div className="space-y-1.5">
                        <Label className="text-red-700">{t("cm_deletionReason")} *</Label>
                        <Textarea value={deletionForm.reason} onChange={e => setDeletionForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("cm_deletionReasonPlaceholder")} rows={2} data-testid="textarea-deletion-reason" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_deletionExplanation")}</Label>
                        <Textarea value={deletionForm.explanation} onChange={e => setDeletionForm(f => ({ ...f, explanation: e.target.value }))} placeholder={t("cm_deletionExplanationPlaceholder")} rows={2} data-testid="textarea-deletion-explanation" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>{t("cm_deletionOwnerName")}</Label>
                          <Input value={deletionForm.ownerName} onChange={e => setDeletionForm(f => ({ ...f, ownerName: e.target.value }))} data-testid="input-deletion-owner-name" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-red-700">{t("cm_deletionOwnerEmail")} *</Label>
                          <Input type="email" value={deletionForm.ownerEmail} onChange={e => setDeletionForm(f => ({ ...f, ownerEmail: e.target.value }))} data-testid="input-deletion-owner-email" />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={submittingDeletion || !deletionForm.reason.trim() || !deletionForm.ownerEmail.trim()}
                        onClick={submitDeletionRequest}
                        data-testid="button-submit-deletion-request"
                      >
                        {submittingDeletion ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_submitDeletionRequest")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && church && (
          <div className="space-y-5">
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <ImageIcon className="w-4 h-4" />{t("cm_churchBranding")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Logo */}
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: "#1a2744" }}>{t("cm_logoLabel")}</p>
                  <div className="flex items-center gap-5 mb-3">
                    <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden border-2 flex items-center justify-center"
                      style={{ borderColor: "#e8e3dc", backgroundColor: "#f8f4ee" }}>
                      {church.logoUrl ? (
                        <img src={church.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8" style={{ color: "#c9b990" }} />
                      )}
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-upload-logo">
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? t("cm_uploading") : t("cm_uploadLogo")}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("cm_logoUrlDirect")}</Label>
                    <Input value={brandingForm.logoUrl} onChange={e => setBrandingForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." data-testid="input-branding-logo-url" />
                  </div>
                </div>

                {/* Banner */}
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("cm_bannerImageUrl")}</Label>
                  <p className="text-xs" style={{ color: "#7a7570" }}>{t("cm_bannerImageHint")}</p>
                  {church.bannerUrl && (
                    <div className="h-20 rounded-lg overflow-hidden border" style={{ borderColor: "#e8e3dc" }}>
                      <img src={church.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <Input value={brandingForm.bannerUrl} onChange={e => setBrandingForm(f => ({ ...f, bannerUrl: e.target.value }))} placeholder="https://..." data-testid="input-branding-banner-url" />
                </div>

                {/* Theme Color */}
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("cm_headerThemeColor")}</Label>
                  <p className="text-xs" style={{ color: "#7a7570" }}>{t("cm_headerThemeHint")}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingForm.themeColor || church.themeColor || "#1d3461"}
                      onChange={e => setBrandingForm(f => ({ ...f, themeColor: e.target.value }))}
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                      style={{ borderColor: "#e8e3dc" }}
                      data-testid="input-branding-theme-color"
                    />
                    <Input
                      value={brandingForm.themeColor || church.themeColor || ""}
                      onChange={e => setBrandingForm(f => ({ ...f, themeColor: e.target.value }))}
                      placeholder="#1d3461"
                      className="w-32 font-mono"
                      data-testid="input-branding-theme-hex"
                    />
                    <button onClick={() => setBrandingForm(f => ({ ...f, themeColor: "" }))} className="text-xs px-2 py-1 rounded" style={{ color: "#7a7570" }}>
                      {t("cm_reset")}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {["#1d3461", "#7a1520", "#1a5276", "#145a32", "#784212", "#4a235a"].map(c => (
                      <button key={c} onClick={() => setBrandingForm(f => ({ ...f, themeColor: c }))}
                        className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ backgroundColor: c, borderColor: brandingForm.themeColor === c ? "#fff" : "transparent", outline: brandingForm.themeColor === c ? `2px solid ${c}` : "none" }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={saveBranding} disabled={savingBranding} style={{ backgroundColor: "#1a2744", color: "#fff" }} data-testid="button-save-branding">
                  {savingBranding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_saveBranding")}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button onClick={() => setShowInvForm(v => !v)} style={{ backgroundColor: "#1a2744" }} data-testid="button-create-invitation">
                <Plus className="w-4 h-4 mr-1.5" />{showInvForm ? t("cm_cancel") : t("cm_newInvitation")}
              </Button>
            </div>

            {showInvForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}><LinkIcon className="w-4 h-4" />{t("cm_createInvitationCode")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("cm_purpose")}</Label>
                      <Select value={invType} onValueChange={setInvType}>
                        <SelectTrigger data-testid="select-invite-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="membership">{t("cm_generalMembership")}</SelectItem>
                          <SelectItem value="group">{t("cm_groupMembership")}</SelectItem>
                          <SelectItem value="leadership">{t("cm_leadershipTeam")}</SelectItem>
                          <SelectItem value="ministry">{t("cm_ministryTeam")}</SelectItem>
                          <SelectItem value="event">{t("cm_eventAttendee")}</SelectItem>
                          <SelectItem value="volunteer">{t("cm_volunteer")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {invType === "group" && (groups?.length ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <Label>{t("cm_targetGroup")}</Label>
                        <Select value={invGroupId} onValueChange={setInvGroupId}>
                          <SelectTrigger data-testid="select-invite-group"><SelectValue placeholder={t("cm_selectGroupAdmin")} /></SelectTrigger>
                          <SelectContent>
                            {groups?.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("cm_inviteLabel")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input value={invLabel} onChange={e => setInvLabel(e.target.value)} placeholder="e.g. Sunday Service Invite" data-testid="input-invite-label" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("cm_maxUses")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input type="number" min="1" value={invMaxUses} onChange={e => setInvMaxUses(e.target.value)} placeholder={t("cm_unlimited")} data-testid="input-invite-max-uses" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cm_expiryDate")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                    <Input type="datetime-local" value={invExpiry} onChange={e => setInvExpiry(e.target.value)} data-testid="input-invite-expiry" />
                  </div>
                  <Button onClick={createInvitation} disabled={creatingInv} style={{ backgroundColor: "#1a2744" }} data-testid="button-generate-invitation">
                    {creatingInv ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_generating")}</> : t("cm_generateInvitationCode")}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
                {invitations?.filter(i => i.isActive).length ?? 0} {t("cm_activeInvitations")}{(invitations?.filter(i => i.isActive).length ?? 0) !== 1 ? "s" : ""}
              </h3>
              {!invitations?.length ? (
                <p className="text-sm text-center py-6" style={{ color: "#7a7570" }}>{t("cm_noInvitationsYet")}</p>
              ) : invitations.map(inv => (
                <Card key={inv.id} className={`border-0 shadow-sm ${!inv.isActive ? "opacity-50" : ""}`} style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-base font-mono font-bold tracking-widest px-2 py-0.5 rounded" style={{ color: "#1a2744", backgroundColor: "#1a274410" }}>
                            {inv.inviteCode}
                          </code>
                          {inv.label && <Badge variant="outline" className="text-xs"><Tag className="w-2.5 h-2.5 mr-1" />{inv.label}</Badge>}
                          {(inv as any).invitationType && (inv as any).invitationType !== "membership" && (
                            <Badge variant="outline" className="text-xs" style={{ borderColor: "#b8962e55", color: "#7a5c1e" }}>
                              {(inv as any).invitationType}
                            </Badge>
                          )}
                          {!inv.isActive && <Badge variant="secondary" className="text-xs">{t("cm_inactive")}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs" style={{ color: "#7a7570" }}>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {(inv as any).approvedUses ?? inv.usedCount}{inv.maxUses ? `/${inv.maxUses}` : ""} {t("cm_approved")}
                          </span>
                          {(inv as any).targetGroupName && (
                            <span className="flex items-center gap-1">→ {(inv as any).targetGroupName}</span>
                          )}
                          {inv.expiresAt && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t("cm_expires")} {new Date(inv.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {inv.isActive && (
                        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          <Button size="sm" variant="outline" onClick={() => copyInviteCode(inv.inviteCode)} data-testid={`button-copy-code-${inv.id}`}>
                            <Copy className="w-3 h-3 mr-1" />{t("cm_code")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyInviteLink(inv.inviteCode)} data-testid={`button-copy-link-${inv.id}`}>
                            <Copy className="w-3 h-3 mr-1" />{t("cm_link")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => shareInvite(inv.inviteCode, church?.name ?? "")} data-testid={`button-share-invite-${inv.id}`}>
                            <Share2 className="w-3 h-3 mr-1" />{t("cm_share")}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                            title="Deactivate (keep record)"
                            onClick={() => { if (confirm("Deactivate this invitation link? It will no longer work but can be tracked.")) deactivateInv.mutate(inv.id); }}
                            data-testid={`button-deactivate-invite-${inv.id}`}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete permanently"
                            onClick={() => { if (confirm("Permanently delete this invitation? This cannot be undone.")) deleteInv.mutate(inv.id); }}
                            data-testid={`button-delete-invite-${inv.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
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
                <Plus className="w-4 h-4 mr-1.5" />{showSermonForm ? t("cm_cancel") : t("cm_addSermon")}
              </Button>
            </div>
            {showSermonForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_newSermon")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>{t("cm_sermonTitleLabel")} *</Label>
                      <Input value={sermonForm.title} onChange={e => setSermonForm(f => ({ ...f, title: e.target.value }))} data-testid="input-sermon-title" /></div>
                    <div className="space-y-1.5"><Label>{t("cm_speaker")}</Label>
                      <Input value={sermonForm.speakerName} onChange={e => setSermonForm(f => ({ ...f, speakerName: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_bibleReference")}</Label>
                      <Input value={sermonForm.bibleReference} onChange={e => setSermonForm(f => ({ ...f, bibleReference: e.target.value }))} placeholder="e.g. John 3:16" /></div>
                    <div className="space-y-1.5"><Label>{t("cm_sermonDate")}</Label>
                      <Input type="date" value={sermonForm.sermonDate} onChange={e => setSermonForm(f => ({ ...f, sermonDate: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_videoUrl")}</Label>
                      <Input type="url" value={sermonForm.videoUrl} onChange={e => setSermonForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube, Vimeo, etc." /></div>
                    <div className="space-y-1.5"><Label>{t("cm_audioUrl")}</Label>
                      <Input type="url" value={sermonForm.audioUrl} onChange={e => setSermonForm(f => ({ ...f, audioUrl: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_pdfNotesUrl")}</Label>
                      <Input value={sermonForm.pdfNotesUrl} onChange={e => setSermonForm(f => ({ ...f, pdfNotesUrl: e.target.value }))} placeholder={t("cm_linkToPdf")} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_outlineUrl")}</Label>
                      <Input value={sermonForm.outlineUrl} onChange={e => setSermonForm(f => ({ ...f, outlineUrl: e.target.value }))} placeholder={t("cm_outlineUrlPlaceholder")} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_coverImageUrl")}</Label>
                      <Input value={sermonForm.imageUrl} onChange={e => setSermonForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-1.5"><Label>{t("cm_scheduledDate")}</Label>
                      <Input type="date" value={sermonForm.scheduledDate} onChange={e => setSermonForm(f => ({ ...f, scheduledDate: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>{t("cm_descriptionNotes")}</Label>
                    <Textarea value={sermonForm.description} onChange={e => setSermonForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={sermonForm.isPublished} onChange={e => setSermonForm(f => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                    <span className="text-sm">{t("cm_publishedVisible")}</span>
                  </label>
                  <Button onClick={createSermon} disabled={addingSermon || !sermonForm.title.trim()} style={{ backgroundColor: "#1a2744" }}>
                    {addingSermon ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_adding")}</> : t("cm_addSermon")}
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {!sermons?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>{t("cm_noSermonsYet")}</p>
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
                <Plus className="w-4 h-4 mr-1.5" />{showAnnForm ? t("cm_cancel") : t("cm_newAnnouncement")}
              </Button>
            </div>
            {showAnnForm && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_newAnnouncement")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5"><Label>{t("cm_title")} *</Label>
                    <Input value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} data-testid="input-ann-title" /></div>
                  <div className="space-y-1.5"><Label>{t("cm_body")} *</Label>
                    <Textarea value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} rows={4} data-testid="input-ann-body" /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>{t("cm_imageUrl")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input value={annForm.imageUrl} onChange={e => setAnnForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-1.5"><Label>{t("cm_pdfUrl")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input value={annForm.pdfUrl} onChange={e => setAnnForm(f => ({ ...f, pdfUrl: e.target.value }))} placeholder={t("cm_linkToPdf")} /></div>
                    <div className="space-y-1.5"><Label>{t("cm_externalLink")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input value={annForm.externalLink} onChange={e => setAnnForm(f => ({ ...f, externalLink: e.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-1.5"><Label>{t("cm_expiryDate")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input type="datetime-local" value={annForm.expiresAt} onChange={e => setAnnForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pin-ann" checked={annForm.isPinned} onChange={e => setAnnForm(f => ({ ...f, isPinned: e.target.checked }))} className="rounded" />
                    <Label htmlFor="pin-ann">{t("cm_pinToTop")}</Label>
                  </div>
                  <Button onClick={createAnnouncement} disabled={!annForm.title.trim() || !annForm.body.trim()} style={{ backgroundColor: "#1a2744" }}>
                    {t("cm_publishAnnouncement")}
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {!announcements?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>{t("cm_noAnnouncementsYet")}</p>
              ) : announcements.map(a => (
                <Card key={a.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{a.title}</p>
                        {a.isPinned && <Badge className="text-xs" style={{ backgroundColor: "#b8962e20", color: "#b8962e", border: "1px solid #b8962e30" }}>{t("cm_pinned")}</Badge>}
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
          <div className="space-y-5">
            {/* Pending Approvals */}
            {(() => {
              const pending = members?.filter(m => m.status === "pending") ?? [];
              if (!pending.length) return null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      {pending.length} {t("cm_pendingApprovals")}{pending.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {pending.map(m => (
                    <Card key={m.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fffbeb", borderLeft: "3px solid #f59e0b" }}>
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: "#92400e22", color: "#92400e" }}>
                          {(m.displayName ?? m.email)[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block" style={{ color: "#1a2744" }}>{m.displayName ?? m.email}</span>
                          <p className="text-xs truncate" style={{ color: "#7a7570" }}>{m.email}</p>
                          {(m as any).inviteCodeUsed && (
                            <p className="text-xs mt-0.5" style={{ color: "#9a9080" }}>Code: {(m as any).inviteCodeUsed}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" onClick={() => approveMember.mutate(m.id)} disabled={approveMember.isPending}
                            className="h-8" style={{ backgroundColor: "#16a34a" }}
                            data-testid={`button-approve-member-${m.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{t("cm_approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { if (confirm(`Decline ${m.displayName ?? m.email}'s request?`)) declineMember.mutate(m.id); }}
                            disabled={declineMember.isPending} className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                            data-testid={`button-decline-member-${m.id}`}>
                            <XCircle className="w-3.5 h-3.5 mr-1" />{t("cm_decline")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}

            {/* Active Members */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
                {members?.filter(m => m.status === "active").length ?? 0} {t("cm_activeMembers")}
              </p>
              {!members?.filter(m => m.status === "active").length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>{t("cm_noActiveMembersYet")}</p>
              ) : members?.filter(m => m.status === "active").map(m => {
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
                          {isCurrentUser && <Badge variant="outline" className="text-xs py-0 px-1.5 flex-shrink-0">{t("cm_youLabel")}</Badge>}
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
          </div>
        )}

        {/* Prayer Tab */}
        {activeTab === "prayer" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7a7570" }}>
              {t("cm_allPrayerRequests")}
            </p>
            {!prayers?.length ? (
              <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>{t("cm_noPrayerRequestsYet")}</p>
            ) : prayers.map(pr => (
              <Card key={pr.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-4 pb-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{pr.title}</p>
                      {pr.isConfidential && (
                        <Badge className="text-xs gap-1" style={{ backgroundColor: "#7a152015", color: "#7a1520", border: "1px solid #7a152020" }}>
                          {t("cm_confidential")}
                        </Badge>
                      )}
                      {pr.status === "answered" && (
                        <Badge className="text-xs" style={{ backgroundColor: "#1a574420", color: "#1a5744", border: "1px solid #1a574430" }}>
                          {t("cm_answered")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "#5a5450" }}>{pr.body}</p>
                    <p className="text-xs mt-1" style={{ color: "#9a9080" }}>
                      {pr.displayName ?? t("cm_anonymous")} · {pr.prayerCount} {t("cm_praying")} · {new Date(pr.createdAt!).toLocaleDateString()}
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
                { label: t("cm_membersTab"), count: members?.length },
                { label: t("cm_sermons"), count: sermons?.length },
                { label: t("cm_prayerTab"), count: prayers?.length },
                { label: t("cm_announcements"), count: announcements?.length },
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
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7a7570" }}>{t("cm_recentActivity")}</p>
              {!activity?.length ? (
                <p className="text-sm text-center py-8" style={{ color: "#7a7570" }}>{t("cm_noActivityYet")}</p>
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
        {/* Giving Tab */}
        {activeTab === "giving" && church && (
          <div className="space-y-6">

            {/* Online Giving Settings */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <HandCoins className="w-4 h-4" />{t("cm_onlineGivingSettings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#f8f4ee" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_enableOnlineGiving")}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_enableOnlineGivingDesc")}</p>
                  </div>
                  <button
                    onClick={() => setGivingSettingsForm(f => ({ ...f, isEnabled: !(givingSettingsForm.isEnabled ?? givingSettings?.isEnabled ?? false) }))}
                    data-testid="toggle-giving-enabled"
                  >
                    {(givingSettingsForm.isEnabled ?? givingSettings?.isEnabled ?? false)
                      ? <ToggleRight className="w-8 h-8" style={{ color: "#b8962e" }} />
                      : <ToggleLeft className="w-8 h-8" style={{ color: "#9a9080" }} />
                    }
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("cm_currency")}</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#e8e3dc" }}
                    value={givingSettingsForm.currency ?? givingSettings?.currency ?? "USD"}
                    onChange={e => setGivingSettingsForm(f => ({ ...f, currency: e.target.value }))}
                    data-testid="select-giving-currency"
                  >
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="GHS">GHS — Ghanaian Cedi</option>
                    <option value="ZAR">ZAR — South African Rand</option>
                  </select>
                  <p className="text-xs" style={{ color: "#9a9080" }}>{t("cm_currencyNote")}</p>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("cm_givingStatement")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                  <Textarea
                    placeholder="e.g. Your generosity helps us fulfill our mission. All gifts are tax-deductible."
                    value={givingSettingsForm.givingStatement ?? givingSettings?.givingStatement ?? ""}
                    onChange={e => setGivingSettingsForm(f => ({ ...f, givingStatement: e.target.value || null }))}
                    rows={2}
                    data-testid="input-giving-statement"
                  />
                </div>

                <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
                  <p className="font-semibold" style={{ color: "#92400e" }}>{t("cm_platformFee")}</p>
                  <p className="mt-1" style={{ color: "#92400e" }}>{t("cm_platformFeeDesc")}</p>
                </div>

                <Button
                  onClick={saveGivingSettings}
                  disabled={savingGivingSettings}
                  style={{ backgroundColor: "#1a2744" }}
                  data-testid="button-save-giving-settings"
                >
                  {savingGivingSettings ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_saveSettings")}
                </Button>
              </CardContent>
            </Card>

            {/* Giving Categories */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                    <DollarSign className="w-4 h-4" />{t("cm_givingCategories")}
                  </CardTitle>
                  {!givingCategories?.length && (
                    <Button
                      variant="outline" size="sm"
                      style={{ borderColor: "#1a2744", color: "#1a2744" }}
                      onClick={async () => {
                        if (!church) return;
                        try {
                          const token = await getIdToken();
                          const r = await fetch(`/api/churches/${church.id}/giving/seed-categories`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token ?? ""}` },
                          });
                          if (r.ok) {
                            qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "giving", "categories"] });
                            toast({ title: t("cm_defaultCategoriesAdded") });
                          }
                        } catch { toast({ title: t("cm_errorSeedingCategories"), variant: "destructive" }); }
                      }}
                      data-testid="button-seed-categories"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />{t("cm_seedDefaults")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!givingCategories?.length ? (
                  <p className="text-sm py-2" style={{ color: "#7a7570" }}>{t("cm_noCategoriesYet")}</p>
                ) : (
                  <div className="space-y-2">
                    {givingCategories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#f8f4ee" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{cat.name}</p>
                          {cat.description && <p className="text-xs mt-0.5 truncate" style={{ color: "#7a7570" }}>{cat.description}</p>}
                        </div>
                        <Badge variant={cat.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {cat.isActive ? t("cm_active") : t("cm_hidden")}
                        </Badge>
                        <button onClick={() => toggleCategory(cat)} className="text-xs px-2 py-1 rounded"
                          style={{ color: "#7a7570", border: "1px solid #e8e3dc" }}
                          data-testid={`button-toggle-category-${cat.id}`}>
                          {cat.isActive ? t("cm_hide") : t("cm_show")}
                        </button>
                        <button onClick={() => deleteCategory(cat.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                          data-testid={`button-delete-category-${cat.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 space-y-3" style={{ borderColor: "#e8e3dc" }}>
                  <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_addCategory")}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("cm_name")} <span className="text-red-500">*</span></Label>
                      <Input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                        placeholder="e.g. Tithe, Building Fund" data-testid="input-category-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("cm_description")} <span className="text-muted-foreground text-xs">({t("cm_optional")})</span></Label>
                      <Input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)}
                        placeholder={t("cm_categoryDescPlaceholder")} data-testid="input-category-desc" />
                    </div>
                  </div>
                  <Button onClick={addCategory} disabled={addingCat || !newCatName.trim()} variant="outline"
                    style={{ borderColor: "#1a2744", color: "#1a2744" }} data-testid="button-add-category">
                    {addingCat ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {t("cm_addCategory")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payout Configuration */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <Building2 className="w-4 h-4" />{t("cm_payoutDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#f0f8ff", border: "1px solid #3b82f620" }}>
                  <p style={{ color: "#1e40af" }}>{t("cm_payoutDetailsNote")}</p>
                </div>

                {/* Country + Legal Name */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t("cm_legalName")}</Label>
                    <Input value={payoutForm.legalName ?? payoutConfig?.legalName ?? ""}
                      onChange={e => setPayoutForm(f => ({ ...f, legalName: e.target.value }))}
                      placeholder="Registered legal name" data-testid="input-payout-legal-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cm_country")}</Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                      value={payoutForm.country ?? payoutConfig?.country ?? ""}
                      onChange={e => setPayoutForm(f => ({ ...f, country: e.target.value }))}
                      data-testid="select-payout-country">
                      <option value="">{t("cm_selectCountry")}</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="NG">🇳🇬 Nigeria</option>
                      <option value="KE">🇰🇪 Kenya</option>
                      <option value="GH">🇬🇭 Ghana</option>
                      <option value="ZA">🇿🇦 South Africa</option>
                      <option value="CA">🇨🇦 Canada</option>
                      <option value="AU">🇦🇺 Australia</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cm_contactEmail")}</Label>
                    <Input type="email" value={payoutForm.contactEmail ?? payoutConfig?.contactEmail ?? ""}
                      onChange={e => setPayoutForm(f => ({ ...f, contactEmail: e.target.value }))} />
                  </div>
                </div>

                {/* Nigeria-specific */}
                {(payoutForm.country ?? payoutConfig?.country) === "NG" && (
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "#e8e3dc", backgroundColor: "#fafaf8" }}>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>🇳🇬 Nigeria — Bank Transfer</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("cm_bankName")}</Label>
                        <Input value={payoutForm.bankName ?? payoutConfig?.bankName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, bankName: e.target.value }))}
                          placeholder="e.g. GTBank, First Bank, Zenith" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountName")}</Label>
                        <Input value={payoutForm.accountHolderName ?? payoutConfig?.accountHolderName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountHolderName: e.target.value }))}
                          placeholder="Account holder name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountNumber")} (10 digits)</Label>
                        <Input value={payoutForm.accountNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountNumber: e.target.value }))}
                          placeholder={payoutConfig?.accountNumber ? "•••• (saved)" : "10-digit NUBAN"}
                          type="password" autoComplete="off" maxLength={10} />
                      </div>
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: "#e8e3dc" }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: "#1a2744" }}>{t("cm_mobileMoney")} <span className="font-normal text-xs text-muted-foreground">({t("cm_optional")})</span></p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>{t("cm_provider")}</Label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                            value={payoutForm.mobileMoneyProvider ?? payoutConfig?.mobileMoneyProvider ?? ""}
                            onChange={e => setPayoutForm(f => ({ ...f, mobileMoneyProvider: e.target.value }))}>
                            <option value="">Select…</option>
                            <option value="OPay">OPay</option>
                            <option value="PalmPay">PalmPay</option>
                            <option value="Kuda">Kuda</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("cm_phoneNumber")}</Label>
                          <Input value={payoutForm.mobileMoneyNumber ?? payoutConfig?.mobileMoneyNumber ?? ""}
                            onChange={e => setPayoutForm(f => ({ ...f, mobileMoneyNumber: e.target.value }))}
                            placeholder="+234..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* US-specific */}
                {(payoutForm.country ?? payoutConfig?.country) === "US" && (
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "#e8e3dc", backgroundColor: "#fafaf8" }}>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>🇺🇸 United States — Bank / Digital</p>
                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
                      <p style={{ color: "#92400e" }}>{t("cm_stripeConnectNote")}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("cm_bankName")}</Label>
                        <Input value={payoutForm.bankName ?? payoutConfig?.bankName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, bankName: e.target.value }))}
                          placeholder="e.g. Chase, Bank of America" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountHolderName")}</Label>
                        <Input value={payoutForm.accountHolderName ?? payoutConfig?.accountHolderName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountNumber")}</Label>
                        <Input value={payoutForm.accountNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountNumber: e.target.value }))}
                          placeholder={payoutConfig?.accountNumber ? "•••• (saved)" : "Account number"}
                          type="password" autoComplete="off" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_achRoutingNumber")}</Label>
                        <Input value={payoutForm.routingNumber ?? payoutConfig?.routingNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, routingNumber: e.target.value }))}
                          placeholder="9-digit routing number" />
                      </div>
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: "#e8e3dc" }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: "#1a2744" }}>{t("cm_digitalPaymentHandles")} <span className="font-normal text-xs text-muted-foreground">({t("cm_optional")})</span></p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {["PayPal", "CashApp", "Venmo", "Zelle"].map(provider => (
                          <div key={provider} className="space-y-1.5">
                            <Label>{provider}</Label>
                            <Input
                              value={(payoutForm.mobileMoneyProvider === provider ? payoutForm.mobileMoneyNumber : payoutConfig?.mobileMoneyProvider === provider ? payoutConfig.mobileMoneyNumber : "") ?? ""}
                              onChange={e => setPayoutForm(f => ({ ...f, mobileMoneyProvider: provider, mobileMoneyNumber: e.target.value }))}
                              placeholder={`${provider} email/handle`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* UK / EU */}
                {["GB", "CA", "AU", "OTHER"].includes(payoutForm.country ?? payoutConfig?.country ?? "") && (
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "#e8e3dc", backgroundColor: "#fafaf8" }}>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_bankDetails")}</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("cm_bankName")}</Label>
                        <Input value={payoutForm.bankName ?? payoutConfig?.bankName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, bankName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountHolderName")}</Label>
                        <Input value={payoutForm.accountHolderName ?? payoutConfig?.accountHolderName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountNumberIban")}</Label>
                        <Input value={payoutForm.accountNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountNumber: e.target.value }))}
                          placeholder={payoutConfig?.accountNumber ? "•••• (saved)" : "Account / IBAN"}
                          type="password" autoComplete="off" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_sortCodeRouting")}</Label>
                        <Input value={payoutForm.routingNumber ?? payoutConfig?.routingNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, routingNumber: e.target.value }))}
                          placeholder="Sort code or routing number" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_swiftBic")}</Label>
                        <Input value={payoutForm.swiftBic ?? payoutConfig?.swiftBic ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, swiftBic: e.target.value }))}
                          placeholder="e.g. BARCGB22" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Africa (KE, GH, ZA) */}
                {["KE", "GH", "ZA"].includes(payoutForm.country ?? payoutConfig?.country ?? "") && (
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "#e8e3dc", backgroundColor: "#fafaf8" }}>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_bankMobileMoney")}</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("cm_bankName")}</Label>
                        <Input value={payoutForm.bankName ?? payoutConfig?.bankName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, bankName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountHolderName")}</Label>
                        <Input value={payoutForm.accountHolderName ?? payoutConfig?.accountHolderName ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("cm_accountNumber")}</Label>
                        <Input value={payoutForm.accountNumber ?? ""}
                          onChange={e => setPayoutForm(f => ({ ...f, accountNumber: e.target.value }))}
                          placeholder={payoutConfig?.accountNumber ? "•••• (saved)" : "Account number"}
                          type="password" autoComplete="off" />
                      </div>
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: "#e8e3dc" }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: "#1a2744" }}>{t("cm_mobileMoney")}</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>{t("cm_provider")}</Label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                            value={payoutForm.mobileMoneyProvider ?? payoutConfig?.mobileMoneyProvider ?? ""}
                            onChange={e => setPayoutForm(f => ({ ...f, mobileMoneyProvider: e.target.value }))}>
                            <option value="">Select…</option>
                            <option value="M-Pesa">M-Pesa (Kenya)</option>
                            <option value="MTN MoMo">MTN MoMo (Ghana)</option>
                            <option value="Airtel Money">Airtel Money</option>
                            <option value="SnapScan">SnapScan (South Africa)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("cm_mobileNumber")}</Label>
                          <Input value={payoutForm.mobileMoneyNumber ?? payoutConfig?.mobileMoneyNumber ?? ""}
                            onChange={e => setPayoutForm(f => ({ ...f, mobileMoneyNumber: e.target.value }))}
                            placeholder="+254..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={savePayout} disabled={savingPayout} style={{ backgroundColor: "#1a2744" }}
                  data-testid="button-save-payout">
                  {savingPayout ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_savePayoutDetails")}
                </Button>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1a2744" }}>
                  <ArrowDownToLine className="w-4 h-4" />{t("cm_transactionHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!transactions?.length ? (
                  <p className="text-sm py-4 text-center" style={{ color: "#7a7570" }}>{t("cm_noTransactionsYet")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e8e3dc" }}>
                          <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_date")}</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_category")}</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_donor")}</th>
                          <th className="text-right py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_amount")}</th>
                          <th className="text-right py-2 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 100).map(txn => (
                          <tr key={txn.id} style={{ borderBottom: "1px solid #f0ece6" }}>
                            <td className="py-2 pr-4 text-xs" style={{ color: "#7a7570" }}>
                              {new Date(txn.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="py-2 pr-4 text-xs font-medium" style={{ color: "#1a2744" }}>{txn.categoryName}</td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "#4a4540" }}>
                              {txn.isAnonymous ? t("cm_anonymous") : (txn.donorName ?? txn.donorEmail ?? "—")}
                            </td>
                            <td className="py-2 pr-4 text-xs text-right font-semibold" style={{ color: "#1a2744" }}>
                              ${(txn.grossAmount / 100).toFixed(2)}
                            </td>
                            <td className="py-2 text-right">
                              <Badge variant={txn.status === "completed" ? "default" : txn.status === "failed" ? "destructive" : "secondary"}
                                className="text-xs">
                                {txn.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {transactions.length > 0 && (
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#e8e3dc" }}>
                        <div className="flex justify-between text-sm font-semibold" style={{ color: "#1a2744" }}>
                          <span>{t("cm_totalReceived")} ({transactions.filter(txn2 => txn2.status === "completed").length} {t("cm_gifts")})</span>
                          <span>${(transactions.filter(txn2 => txn2.status === "completed").reduce((s, txn2) => s + txn2.grossAmount, 0) / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1" style={{ color: "#7a7570" }}>
                          <span>{t("cm_churchNet")}</span>
                          <span>${(transactions.filter(txn2 => txn2.status === "completed").reduce((s, txn2) => s + txn2.churchNetAmount, 0) / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Giving Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_givingReports")}</h3>
              {church && (
                <a
                  href={`/api/churches/${church.id}/giving/export-csv`}
                  className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg"
                  style={{ backgroundColor: "#1a2744", color: "#fff" }}
                  data-testid="button-export-csv"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  {t("cm_exportCsv")}
                </a>
              )}
            </div>

            {!givingReports ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: t("cm_today"), data: givingReports.today },
                    { label: t("cm_thisWeek"), data: givingReports.week },
                    { label: t("cm_thisMonth"), data: givingReports.month },
                    { label: t("cm_thisYear"), data: givingReports.year },
                  ].map(({ label, data }) => (
                    <Card key={label} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs font-semibold" style={{ color: "#7a7570" }}>{label}</p>
                        <p className="text-xl font-bold mt-1" style={{ color: "#1a2744" }}>${(data.gross / 100).toFixed(2)}</p>
                        <p className="text-xs mt-1" style={{ color: "#22c55e" }}>Net: ${(data.net / 100).toFixed(2)}</p>
                        <p className="text-xs" style={{ color: "#9a9080" }}>{data.count} {t("cm_gifts")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* All-time totals */}
                <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                  <CardContent className="pt-5 pb-5 px-5">
                    <p className="text-sm font-semibold mb-4" style={{ color: "#1a2744" }}>{t("cm_allTimeTotals")}</p>
                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>${(givingReports.all.gross / 100).toFixed(2)}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_totalReceived")}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>${(givingReports.all.net / 100).toFixed(2)}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_churchNet")}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold" style={{ color: "#b8962e" }}>{givingReports.all.count}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_totalGifts")}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t text-xs text-center" style={{ borderColor: "#e8e3dc", color: "#9a9080" }}>
                      {t("cm_platformFees")}: ${(givingReports.all.fee / 100).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent transactions */}
                {givingReports.recent.length > 0 && (
                  <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm" style={{ color: "#1a2744" }}>{t("cm_recentGifts")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e8e3dc" }}>
                              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_date")}</th>
                              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_category")}</th>
                              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_donor")}</th>
                              <th className="text-right py-2 pr-4 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_gross")}</th>
                              <th className="text-right py-2 text-xs font-semibold" style={{ color: "#7a7570" }}>{t("cm_net")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {givingReports.recent.map(txn => (
                              <tr key={txn.id} style={{ borderBottom: "1px solid #f0ece6" }}>
                                <td className="py-2 pr-4 text-xs" style={{ color: "#7a7570" }}>
                                  {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                </td>
                                <td className="py-2 pr-4 text-xs" style={{ color: "#4a4540" }}>{txn.categoryName ?? "—"}</td>
                                <td className="py-2 pr-4 text-xs" style={{ color: "#4a4540" }}>
                                  {txn.isAnonymous ? t("cm_anonymous") : (txn.donorName ?? txn.donorEmail ?? "—")}
                                </td>
                                <td className="py-2 pr-4 text-xs text-right font-medium" style={{ color: "#1a2744" }}>
                                  ${(txn.grossAmount / 100).toFixed(2)}
                                </td>
                                <td className="py-2 text-xs text-right font-medium" style={{ color: "#22c55e" }}>
                                  ${(txn.churchNetAmount / 100).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "departments" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_departmentManagement")}</h3>
              <Button
                size="sm"
                className="gap-2"
                style={{ backgroundColor: "#1a2744" }}
                onClick={() => church && window.open(`/church/${church.slug}/departments`, "_self")}
                data-testid="button-manage-departments"
              >
                <Building2 className="w-4 h-4" />{t("cm_viewAllDepartments")}
              </Button>
            </div>

            {!church ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
              </div>
            ) : (
              <AdminDepartmentsPanel church={church} getIdToken={getIdToken} />
            )}
          </div>
        )}

        {/* Website Settings Tab */}
        {activeTab === "website" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold" style={{ color: "#1a2744" }}>{t("cm_publicChurchWebsite")}</h3>
                <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>
                  {t("cm_customizeWebsiteAt")}{" "}
                  <a href={`/church/${church?.slug ?? ""}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium underline" style={{ color: "#b8962e" }}>
                    /church/{church?.slug}
                  </a>
                </p>
              </div>
              {church?.slug && (
                <a href={`/church/${church.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border"
                  style={{ borderColor: "#b8962e30", color: "#b8962e" }}
                  data-testid="button-view-public-website">
                  <ExternalLink className="w-3.5 h-3.5" /> {t("cm_viewWebsite")}
                </a>
              )}
            </div>

            {/* Enable/disable toggle */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{t("cm_publicWebsite")}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{t("cm_enablePublicWebsiteDesc")}</p>
                  </div>
                  <button onClick={() => setWebsiteForm(f => ({ ...f, publicWebsiteEnabled: !f.publicWebsiteEnabled }))}
                    data-testid="toggle-public-website">
                    {websiteForm.publicWebsiteEnabled
                      ? <ToggleRight className="w-8 h-8" style={{ color: "#b8962e" }} />
                      : <ToggleLeft className="w-8 h-8" style={{ color: "#c0b8b0" }} />}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_contactInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_pastorLeaderName")}</label>
                  <Input value={websiteForm.pastorName} onChange={e => setWebsiteForm(f => ({ ...f, pastorName: e.target.value }))}
                    placeholder="e.g. Pastor John Smith" data-testid="input-website-pastor-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_phone")}</label>
                    <Input value={websiteForm.phone} onChange={e => setWebsiteForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 555 000 0000" data-testid="input-website-phone" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_email")}</label>
                    <Input value={websiteForm.email} onChange={e => setWebsiteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="church@email.com" type="email" data-testid="input-website-email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Welcome & Content */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_contentMessaging")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_welcomeMessageHero")}</label>
                  <Textarea value={websiteForm.welcomeMessage} onChange={e => setWebsiteForm(f => ({ ...f, welcomeMessage: e.target.value }))}
                    placeholder={t("cm_welcomeMessagePlaceholder")} rows={2}
                    data-testid="input-website-welcome" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_missionStatement")}</label>
                  <Textarea value={websiteForm.missionStatement} onChange={e => setWebsiteForm(f => ({ ...f, missionStatement: e.target.value }))}
                    placeholder={t("cm_missionPlaceholder")} rows={2} data-testid="input-website-mission" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_vision")}</label>
                  <Textarea value={websiteForm.vision} onChange={e => setWebsiteForm(f => ({ ...f, vision: e.target.value }))}
                    placeholder={t("cm_visionPlaceholder")} rows={2} data-testid="input-website-vision" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_visitorInformation")}</label>
                  <Textarea value={websiteForm.visitorInfo} onChange={e => setWebsiteForm(f => ({ ...f, visitorInfo: e.target.value }))}
                    placeholder={t("cm_visitorInfoPlaceholder")} rows={3}
                    data-testid="input-website-visitor-info" />
                </div>
              </CardContent>
            </Card>

            {/* Service Times */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_serviceTimes")}</CardTitle>
                <p className="text-xs" style={{ color: "#7a7570" }}>{t("cm_serviceTimesNote")}</p>
              </CardHeader>
              <CardContent>
                <Textarea value={websiteForm.serviceTimesRaw} onChange={e => setWebsiteForm(f => ({ ...f, serviceTimesRaw: e.target.value }))}
                  placeholder={"Sunday | 9:00 AM | Morning Service\nSunday | 11:00 AM | Main Service\nWednesday | 7:00 PM | Bible Study"}
                  rows={4} className="font-mono text-xs" data-testid="input-website-service-times" />
              </CardContent>
            </Card>

            {/* Hero Image & Map */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_mediaLocation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_heroImageUrl")}</label>
                  <Input value={websiteForm.websiteHeroImage} onChange={e => setWebsiteForm(f => ({ ...f, websiteHeroImage: e.target.value }))}
                    placeholder="https://..." data-testid="input-website-hero-image" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{t("cm_googleMapsUrl")}</label>
                  <Input value={websiteForm.mapEmbedUrl} onChange={e => setWebsiteForm(f => ({ ...f, mapEmbedUrl: e.target.value }))}
                    placeholder="https://www.google.com/maps/embed?..." data-testid="input-website-map-url" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>
                    {t("cm_galleryPhotos")}
                  </label>
                  <Textarea value={websiteForm.publicPhotosRaw} onChange={e => setWebsiteForm(f => ({ ...f, publicPhotosRaw: e.target.value }))}
                    placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
                    rows={3} className="font-mono text-xs" data-testid="input-website-photos" />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ color: "#1a2744" }}>{t("cm_socialMediaLinks")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/yourchurch" },
                  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/yourchurch" },
                  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@yourchurch" },
                  { key: "twitterUrl", label: "Twitter/X", placeholder: "https://twitter.com/yourchurch" },
                  { key: "whatsappNumber", label: "WhatsApp Number", placeholder: "+1234567890" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "#7a7570" }}>{label}</label>
                    <Input value={(websiteForm as any)[key]} onChange={e => setWebsiteForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder} data-testid={`input-website-${key}`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Load current values helper */}
            {church && (
              <div className="p-4 rounded-xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#7a7570" }}>{t("cm_loadCurrentValues")}</p>
                <Button size="sm" variant="outline"
                  onClick={() => setWebsiteForm({
                    pastorName: church.pastorName ?? "",
                    phone: church.phone ?? "",
                    email: church.email ?? "",
                    welcomeMessage: church.welcomeMessage ?? "",
                    missionStatement: church.missionStatement ?? "",
                    vision: church.vision ?? "",
                    visitorInfo: church.visitorInfo ?? "",
                    mapEmbedUrl: church.mapEmbedUrl ?? "",
                    websiteHeroImage: church.websiteHeroImage ?? "",
                    publicWebsiteEnabled: church.publicWebsiteEnabled ?? true,
                    facebookUrl: church.socialLinks?.facebook ?? "",
                    instagramUrl: church.socialLinks?.instagram ?? "",
                    youtubeUrl: church.socialLinks?.youtube ?? "",
                    twitterUrl: church.socialLinks?.twitter ?? "",
                    whatsappNumber: church.socialLinks?.whatsapp ?? "",
                    serviceTimesRaw: church.serviceTimes?.map(s => `${s.day} | ${s.time} | ${s.type}`).join("\n") ?? "",
                    publicPhotosRaw: church.publicPhotos?.join("\n") ?? "",
                  })}
                  data-testid="button-load-website-values">
                  {t("cm_loadCurrentValues")}
                </Button>
              </div>
            )}

            <Button onClick={saveWebsite} disabled={savingWebsite}
              className="w-full text-white" style={{ backgroundColor: "#1a2744" }}
              data-testid="button-save-website-settings">
              {savingWebsite ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : <><Globe className="w-4 h-4 mr-2" />{t("cm_saveWebsiteSettings")}</>}
            </Button>
          </div>
        )}

      </div>

      {/* Firebase reauthentication dialog for name changes */}
      <Dialog open={showReauthDialog} onOpenChange={open => { setShowReauthDialog(open); if (!open) setReauthPassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cm_nameChangeReauth")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("cm_reauthDesc")}</p>
          <div className="space-y-1.5 mt-2">
            <Label>{t("cm_enterPassword")}</Label>
            <Input
              type="password"
              value={reauthPassword}
              onChange={e => setReauthPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && reauthPassword) e.currentTarget.closest("div")?.querySelector<HTMLButtonElement>("[data-testid='button-reauth-confirm']")?.click(); }}
              placeholder="••••••••"
              data-testid="input-reauth-password"
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowReauthDialog(false); setReauthPassword(""); }} disabled={reauthLoading}>
              {t("cm_cancel")}
            </Button>
            <Button
              data-testid="button-reauth-confirm"
              disabled={!reauthPassword || reauthLoading}
              onClick={async () => {
                const fbUser = auth.currentUser;
                if (!fbUser?.email) { toast({ title: t("cm_error"), variant: "destructive" }); return; }
                setReauthLoading(true);
                try {
                  await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, reauthPassword));
                  setShowReauthDialog(false);
                  setReauthPassword("");
                  saveSettings.mutate();
                } catch {
                  toast({ title: t("cm_reauthFailed"), variant: "destructive" });
                } finally {
                  setReauthLoading(false);
                }
              }}
              style={{ backgroundColor: "#1a2744" }}
            >
              {reauthLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_reauthConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ChurchModeShell>
  );
}
