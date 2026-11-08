import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Users, ChevronRight, Loader2, Search, Key,
  Music, BookOpen, Heart, Shield, Hand, Globe, Star,
  Megaphone, Camera, Briefcase, UserCheck, AlertCircle,
} from "lucide-react";
import type { Church, ChurchDepartment, ChurchDepartmentMember } from "@shared/schema";
import { PREDEFINED_DEPARTMENT_TYPES } from "@shared/schema";

type DeptWithMembership = ChurchDepartment & { myMembership: ChurchDepartmentMember | null };
interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const DEPT_TYPE_ICONS: Record<string, typeof Building2> = {
  "Youth Ministry": Star, "Children's Ministry": Heart, "Women's Fellowship": Users,
  "Men's Fellowship": Shield, "Choir": Music, "Ushering": UserCheck,
  "Media": Camera, "Evangelism": Globe, "Prayer Team": Heart,
  "Sunday School": BookOpen, "Hospitality": Hand, "Finance": Briefcase,
  "Protocol": Shield, "Follow-Up": Megaphone, "Missions": Globe,
};

const DEPT_TYPE_COLORS: Record<string, string> = {
  "Youth Ministry": "#7c3aed", "Children's Ministry": "#ec4899", "Women's Fellowship": "#db2777",
  "Men's Fellowship": "#1d4ed8", "Choir": "#0891b2", "Ushering": "#059669",
  "Media": "#d97706", "Evangelism": "#dc2626", "Prayer Team": "#9333ea",
  "Sunday School": "#0d9488", "Hospitality": "#c2410c", "Finance": "#1d3461",
  "Protocol": "#374151", "Follow-Up": "#b45309", "Missions": "#15803d",
};

export default function ChurchDepartments() {
  const [location, setLocation] = useLocation();
  const slug = (location.match(/\/church\/([^/]+)\/departments/) ?? [])[1] ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const ROLE_LABELS: Record<string, string> = {
    leader: t("cm_roleLeader"), assistant_leader: t("cm_roleAssistantLeader"),
    secretary: t("cm_roleSecretary"), member: t("cm_member"),
  };

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Custom", description: "", logoUrl: "", bannerUrl: "" });
  const [formError, setFormError] = useState<{ desc?: string; logoUrl?: string; bannerUrl?: string }>({});
  const [creating, setCreating] = useState(false);

  const { data: churchData } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: async () => {
      const token = isSignedIn ? await getIdToken() : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}`, { headers });
      if (!r.ok) return Promise.reject(new Error("Church not found"));
      return r.json();
    },
    enabled: !!slug,
  });
  const church = churchData ?? null;

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

  const { data: departments, isLoading } = useQuery<DeptWithMembership[]>({
    queryKey: ["/api/churches", church?.id, "departments"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/departments`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isSignedIn,
  });

  const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"];
  const isAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");

  const filtered = (departments ?? []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isValidHttpsUrl = (v: string) => { try { const u = new URL(v); return u.protocol === "https:"; } catch { return false; } };

  const handleCreate = async () => {
    if (!form.name.trim() || !church) return;
    const errors: { desc?: string; logoUrl?: string; bannerUrl?: string } = {};
    if (!form.description.trim()) errors.desc = t("cm_deptDescRequired");
    if (form.logoUrl.trim() && !isValidHttpsUrl(form.logoUrl.trim())) errors.logoUrl = t("cm_invalidUrlFmt");
    if (form.bannerUrl.trim() && !isValidHttpsUrl(form.bannerUrl.trim())) errors.bannerUrl = t("cm_invalidUrlFmt");
    if (Object.keys(errors).length > 0) { setFormError(errors); return; }
    setFormError({});
    setCreating(true);
    try {
      const token = await getIdToken();
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim() || null,
        bannerUrl: form.bannerUrl.trim() || null,
      };
      const r = await fetch(`/api/churches/${church.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      toast({ title: t("cm_createDepartment") + "!" });
      qc.invalidateQueries({ queryKey: ["/api/churches", church.id, "departments"] });
      setShowCreate(false);
      setForm({ name: "", type: "Custom", description: "", logoUrl: "", bannerUrl: "" });
      setFormError({});
      setLocation(`/church/${slug}/departments/${data.slug}`);
    } finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const token = await getIdToken();
      const r = await fetch("/api/churches/departments/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      toast({ title: t("cm_joined") + "!" });
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "departments"] });
      setShowJoin(false);
      setInviteCode("");
      if (data.dept?.slug) setLocation(`/church/${slug}/departments/${data.dept.slug}`);
    } finally { setJoining(false); }
  };

  return (
    <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1d346118" }}>
              <Building2 className="w-6 h-6" style={{ color: "#1d3461" }} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold" style={{ color: "#1d3461" }}>{t("cm_departments")}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>
                {departments?.length ?? 0} {(departments?.length ?? 0) !== 1 ? t("cm_departments").toLowerCase() : t("cm_departments").toLowerCase().replace(/s$/, "")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowJoin(true)} className="gap-1.5"
              style={{ borderColor: "#1d3461", color: "#1d3461" }} data-testid="button-join-department">
              <Key className="w-3.5 h-3.5" />{t("cm_joinViaCode")}
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"
                style={{ backgroundColor: "#1d3461" }} data-testid="button-create-department">
                <Plus className="w-3.5 h-3.5" />{t("cm_newDepartment")}
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9a9080" }} />
          <Input className="pl-9" placeholder={t("cm_searchDepartments")} value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-departments" />
        </div>

        {!isSignedIn ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#b8962e" }} />
              <p className="font-semibold" style={{ color: "#1d3461" }}>{t("cm_signInForDepts")}</p>
              <p className="text-sm mt-1" style={{ color: "#7a7570" }}>{t("cm_churchMemberForDepts")}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} /></div>
        ) : !filtered.length ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardContent className="pt-12 pb-12 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#c9b99060" }} />
              <p className="font-semibold" style={{ color: "#1d3461" }}>
                {search ? t("cm_noDepartmentsFound") : t("cm_noDepartmentsYet")}
              </p>
              <p className="text-sm mt-1" style={{ color: "#7a7570" }}>
                {search ? t("cm_tryDifferentSearch") : isAdmin ? t("cm_createFirstDepartment") : t("cm_askAdminForDepts")}
              </p>
              {isAdmin && !search && (
                <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)} style={{ backgroundColor: "#1d3461" }}>
                  <Plus className="w-4 h-4" />{t("cm_createDepartment")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(dept => {
              const Icon = DEPT_TYPE_ICONS[dept.type ?? "Custom"] ?? Building2;
              const color = DEPT_TYPE_COLORS[dept.type ?? "Custom"] ?? "#1d3461";
              const isIn = !!dept.myMembership;
              return (
                <Card key={dept.id}
                  className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  style={{ backgroundColor: "#fff" }}
                  onClick={() => setLocation(`/church/${slug}/departments/${dept.slug}`)}
                  data-testid={`card-department-${dept.id}`}
                >
                  {dept.bannerUrl && (
                    <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${dept.bannerUrl})` }} />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${color}18` }}>
                        {dept.logoUrl
                          ? <img src={dept.logoUrl} alt="" className="w-10 h-10 object-cover" />
                          : church?.logoUrl
                            ? <img src={church.logoUrl} alt="" className="w-10 h-10 object-cover" />
                            : <Icon className="w-5 h-5" style={{ color }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: "#1d3461" }}>{dept.name}</p>
                          {isIn && (
                            <Badge className="text-xs" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>
                              {ROLE_LABELS[dept.myMembership!.role] ?? dept.myMembership!.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#9a9080" }}>{dept.type}</p>
                        {dept.description && (
                          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#7a7570" }}>{dept.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#c0b8b0" }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setFormError({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_createDepartment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("cm_departmentName")} <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Youth Ministry, Choir" data-testid="input-dept-name" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptType")} <span className="text-red-500">*</span></Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                data-testid="select-dept-type">
                {PREDEFINED_DEPARTMENT_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptDescription")} <span className="text-red-500">*</span></Label>
              <Textarea value={form.description}
                onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setFormError(fe => ({ ...fe, desc: undefined })); }}
                placeholder={t("cm_deptDescPlaceholder")} rows={3} data-testid="input-dept-description" />
              {formError.desc && <p className="text-xs text-destructive">{formError.desc}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_logoUrl")} <span className="text-muted-foreground text-xs">{t("cm_optional")}</span></Label>
              <Input value={form.logoUrl}
                onChange={e => { setForm(f => ({ ...f, logoUrl: e.target.value })); setFormError(fe => ({ ...fe, logoUrl: undefined })); }}
                placeholder="https://…" data-testid="input-dept-logo-url" />
              {formError.logoUrl && <p className="text-xs text-destructive">{formError.logoUrl}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_bannerUrl")} <span className="text-muted-foreground text-xs">{t("cm_optional")}</span></Label>
              <Input value={form.bannerUrl}
                onChange={e => { setForm(f => ({ ...f, bannerUrl: e.target.value })); setFormError(fe => ({ ...fe, bannerUrl: undefined })); }}
                placeholder="https://…" data-testid="input-dept-banner-url" />
              {formError.bannerUrl && <p className="text-xs text-destructive">{formError.bannerUrl}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormError({}); }} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.description.trim()} className="flex-1"
                style={{ backgroundColor: "#1d3461" }} data-testid="button-confirm-create-dept">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_creating")}</> : t("cm_createDepartment")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join via Code Modal */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_joinDepartment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm" style={{ color: "#7a7570" }}>{t("cm_joinDeptInstructions")}</p>
            <div className="space-y-1.5">
              <Label>{t("cm_inviteCode")} <span className="text-red-500">*</span></Label>
              <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123" maxLength={8} className="text-center text-xl font-mono tracking-widest font-bold"
                data-testid="input-invite-code" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowJoin(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()} className="flex-1"
                style={{ backgroundColor: "#1d3461" }} data-testid="button-confirm-join-dept">
                {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_joining")}</> : t("cm_join")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ChurchModeShell>
  );
}
