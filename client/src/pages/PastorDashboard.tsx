import { useState } from "react";
import { useRoute, useLocation } from "wouter";
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
import {
  Users, Clock, CalendarDays, MessageSquare, Heart, Megaphone,
  BookOpen, ClipboardList, Loader2, Plus, Edit2, Archive, Send,
  ArrowRight, ChevronDown, ChevronUp, X, Save, LayoutDashboard,
  FileText, Building2, UserCheck, Bell,
} from "lucide-react";
import type { Church } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; displayName?: string | null; }
interface DashboardStats {
  activeMembers: number; pendingMembers: number; upcomingEvents: number;
  unreadMessages: number; activePrayers: number; announcements: number;
  openTasks: number; publishedNotes: number;
  nextEvent: { title: string; startDate: string; location?: string; deptName?: string } | null;
  latestAnnouncement: { title: string; createdAt: string } | null;
  pendingMembersList: Array<{ id: number; displayName: string; email: string }>;
  activePrayersList: Array<{ id: number; title: string; displayName: string }>;
  latestTask: { title: string; status: string } | null;
}
interface PastorNote {
  id: number; churchId: number; title: string; sermonDate: string | null;
  scripture: string | null; summary: string | null; keyPoints: string[] | null;
  closingPrayer: string | null; status: string; authorUid: string;
  authorName: string | null; publishedAt: string | null; createdAt: string; updatedAt: string;
}

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];

function StatCard({ icon: Icon, value, label, onClick, color = "#1d3461" }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: number; label: string; onClick?: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 border transition-all duration-150 active:scale-95"
      style={{ backgroundColor: "#fff", borderColor: "#c9b99033" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}44`; (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${color}14`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c9b99033"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}14` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
          <p className="text-xs mt-1 text-gray-500 leading-tight">{label}</p>
        </div>
      </div>
    </button>
  );
}

function NoteForm({
  churchId, note, onClose, onSaved, getIdToken,
}: {
  churchId: number;
  note: PastorNote | null;
  onClose: () => void;
  onSaved: () => void;
  getIdToken: () => Promise<string | null>;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [title, setTitle] = useState(note?.title ?? "");
  const [sermonDate, setSermonDate] = useState(note?.sermonDate ? note.sermonDate.split("T")[0] : "");
  const [scripture, setScripture] = useState(note?.scripture ?? "");
  const [summary, setSummary] = useState(note?.summary ?? "");
  const [keyPoints, setKeyPoints] = useState<string[]>(note?.keyPoints ?? [""]);
  const [closingPrayer, setClosingPrayer] = useState(note?.closingPrayer ?? "");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async (status?: string) => {
    if (!title.trim()) { toast({ title: t("cm_error"), description: t("cm_sermonTitleRequired"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const token = await getIdToken();
      const body = {
        title: title.trim(),
        sermonDate: sermonDate ? new Date(sermonDate).toISOString() : null,
        scripture: scripture.trim() || null,
        summary: summary.trim() || null,
        keyPoints: keyPoints.filter(k => k.trim()),
        closingPrayer: closingPrayer.trim() || null,
        ...(status ? { status } : {}),
      };
      const url = note
        ? `/api/churches/${churchId}/pastor-notes/${note.id}`
        : `/api/churches/${churchId}/pastor-notes`;
      const method = note ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/churches", churchId, "pastor-notes"] });
      qc.invalidateQueries({ queryKey: ["/api/churches", churchId, "dashboard"] });
      toast({ title: status === "published" ? t("cm_notePublished") : t("cm_noteSaved") });
      onSaved();
    } catch (e: any) {
      toast({ title: t("cm_error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addKeyPoint = () => setKeyPoints(kp => [...kp, ""]);
  const removeKeyPoint = (i: number) => setKeyPoints(kp => kp.filter((_, idx) => idx !== i));
  const updateKeyPoint = (i: number, v: string) => setKeyPoints(kp => kp.map((k, idx) => idx === i ? v : k));

  return (
    <div className="rounded-xl border p-4 sm:p-6 space-y-4" style={{ backgroundColor: "#fffdf9", borderColor: "#c9b99044" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base" style={{ color: "#1d3461" }}>
          {note ? t("cm_editNote") : t("cm_newSermonNote")}
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" data-testid="button-close-note-form"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_sermonTitle")} *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("cm_sermonTitle")} data-testid="input-sermon-title" />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_sermonDate")}</Label>
          <Input type="date" value={sermonDate} onChange={e => setSermonDate(e.target.value)} data-testid="input-sermon-date" />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_scripture")}</Label>
          <Input value={scripture} onChange={e => setScripture(e.target.value)} placeholder="e.g. John 3:16" data-testid="input-sermon-scripture" />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_summary")}</Label>
        <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} placeholder={t("cm_summary")} data-testid="textarea-sermon-summary" />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_keyPoints")}</Label>
        <div className="space-y-2">
          {keyPoints.map((kp, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={kp}
                onChange={e => updateKeyPoint(i, e.target.value)}
                placeholder={`${t("cm_keyPoint")} ${i + 1}`}
                data-testid={`input-key-point-${i}`}
              />
              {keyPoints.length > 1 && (
                <button onClick={() => removeKeyPoint(i)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" data-testid={`button-remove-keypoint-${i}`}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addKeyPoint} className="text-xs gap-1.5" data-testid="button-add-key-point">
            <Plus className="w-3.5 h-3.5" /> {t("cm_addKeyPoint")}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{t("cm_closingPrayer")}</Label>
        <Textarea value={closingPrayer} onChange={e => setClosingPrayer(e.target.value)} rows={3} placeholder={t("cm_closingPrayer")} data-testid="textarea-closing-prayer" />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={() => save()} disabled={saving} variant="outline" size="sm" className="gap-1.5" data-testid="button-save-draft">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {t("cm_saveDraft")}
        </Button>
        {(!note || note.status !== "published") && (
          <Button onClick={() => save("published")} disabled={saving} size="sm" className="gap-1.5" style={{ backgroundColor: "#1d3461", color: "#fff" }} data-testid="button-publish-note">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {t("cm_publishNote")}
          </Button>
        )}
        {note && note.status === "published" && (
          <Button onClick={() => save("published")} disabled={saving} size="sm" className="gap-1.5" style={{ backgroundColor: "#1d3461", color: "#fff" }} data-testid="button-save-published">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t("cm_saveChanges")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PastorDashboard() {
  const [, params] = useRoute("/church/:slug/pastor-dashboard");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSignedIn = !!user && !!emailVerified;
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PastorNote | null>(null);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: () => fetch(`/api/churches/slug/${slug}`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });

  const { data: myRole, isLoading: roleLoading } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const currentRole = myRole?.role ?? null;
  const isAdmin = ADMIN_ROLES.includes(currentRole ?? "");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/churches", church?.id, "dashboard"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("No token");
      const r = await fetch(`/api/churches/${church!.id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).message ?? "Error");
      return r.json();
    },
    enabled: !!church?.id && isAdmin,
    refetchInterval: 60000,
  });

  const { data: notes = [] } = useQuery<PastorNote[]>({
    queryKey: ["/api/churches", church?.id, "pastor-notes"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/pastor-notes`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && isAdmin,
  });

  const archiveNote = useMutation({
    mutationFn: async (noteId: number) => {
      const token = await getIdToken();
      const r = await fetch(`/api/churches/${church!.id}/pastor-notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/churches", church?.id, "pastor-notes"] });
      toast({ title: t("cm_noteArchived") });
    },
    onError: (e: any) => toast({ title: t("cm_error"), description: e.message, variant: "destructive" }),
  });

  const statusBadge = (s: string) => {
    if (s === "published") return <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "#22c55e18", color: "#16a34a", border: "1px solid #22c55e33" }}>{t("cm_published")}</Badge>;
    if (s === "archived") return <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "#6b728018", color: "#6b7280", border: "1px solid #6b728033" }}>{t("cm_archived")}</Badge>;
    return <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "#f59e0b18", color: "#d97706", border: "1px solid #f59e0b33" }}>{t("cm_draft")}</Badge>;
  };

  const openEdit = (note: PastorNote) => {
    setEditingNote(note);
    setNoteFormOpen(true);
    setExpandedNote(null);
  };

  const closeForm = () => { setNoteFormOpen(false); setEditingNote(null); };
  const onNoteSaved = () => { closeForm(); };

  if (roleLoading) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={null}>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#1d3461" }} /></div>
      </ChurchModeShell>
    );
  }

  if (!isAdmin) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={currentRole}>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fee2e2" }}>
            <LayoutDashboard className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-medium" style={{ color: "#1d3461" }}>{t("cm_notAuthorizedDashboard")}</p>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/church/${slug}`)}>{t("cm_backToHome")}</Button>
        </div>
      </ChurchModeShell>
    );
  }

  const displayName = myRole?.displayName ?? user?.displayName ?? t("cm_pastor");
  const draftNotes = notes.filter(n => n.status === "draft");
  const publishedNotes = notes.filter(n => n.status === "published");
  const archivedNotes = notes.filter(n => n.status === "archived");

  const quickActions = [
    { icon: Megaphone, label: t("cm_createAnnouncement"), path: `/church/${slug}/announcements`, color: "#7c3aed" },
    { icon: CalendarDays, label: t("cm_addEvent"), path: `/church/${slug}/departments`, color: "#0891b2" },
    { icon: BookOpen, label: t("cm_addLesson"), path: `/church/${slug}/admin`, color: "#059669" },
    { icon: ClipboardList, label: t("cm_createTask"), path: `/church/${slug}/departments`, color: "#d97706" },
    { icon: MessageSquare, label: t("cm_messageMembers"), path: `/church/${slug}/messages`, color: "#1d3461" },
    { icon: UserCheck, label: t("cm_reviewRequests"), path: `/church/${slug}/members`, color: "#dc2626" },
    { icon: Heart, label: t("cm_viewPrayers"), path: `/church/${slug}/prayer`, color: "#e11d48" },
    { icon: Building2, label: t("cm_openDepartments"), path: `/church/${slug}/departments`, color: "#6b7280" },
  ];

  return (
    <ChurchModeShell church={church ?? null} currentRole={currentRole}>
      <div className="space-y-6 pb-8">

        {/* Welcome section */}
        <div className="rounded-xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, #1d3461 0%, #2d4a8a 100%)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight" data-testid="text-pastor-welcome">
                {t("cm_welcomePastor").replace("{name}", displayName)}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                {t("cm_dashboardSubtitle").replace("{church}", church?.name ?? "")}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {statsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />{t("cm_loadingDashboard")}</div>
        ) : stats ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#9a9080" }}>{t("cm_overview")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Users} value={stats.activeMembers} label={t("cm_totalActiveMembers")} onClick={() => setLocation(`/church/${slug}/members`)} color="#1d3461" />
              <StatCard icon={Clock} value={stats.pendingMembers} label={t("cm_pendingApprovals")} onClick={() => setLocation(`/church/${slug}/members`)} color="#dc2626" />
              <StatCard icon={CalendarDays} value={stats.upcomingEvents} label={t("cm_upcomingEvents")} onClick={() => setLocation(`/church/${slug}/departments`)} color="#0891b2" />
              <StatCard icon={MessageSquare} value={stats.unreadMessages} label={t("cm_unreadMessages")} onClick={() => setLocation(`/church/${slug}/messages`)} color="#7c3aed" />
              <StatCard icon={Heart} value={stats.activePrayers} label={t("cm_activePrayers")} onClick={() => setLocation(`/church/${slug}/prayer`)} color="#e11d48" />
              <StatCard icon={Megaphone} value={stats.announcements} label={t("cm_publishedAnnouncements")} onClick={() => setLocation(`/church/${slug}/announcements`)} color="#059669" />
              <StatCard icon={ClipboardList} value={stats.openTasks} label={t("cm_openTasks")} onClick={() => setLocation(`/church/${slug}/departments`)} color="#d97706" />
              <StatCard icon={FileText} value={stats.publishedNotes} label={t("cm_publishedNotes")} onClick={() => setLocation(`/church/${slug}/pastor-notes`)} color="#6b7280" />
            </div>
          </div>
        ) : null}

        {/* This Week */}
        {stats && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#9a9080" }}>{t("cm_thisWeek")}</h2>
            <div className="space-y-3">
              {/* Next event */}
              <Card style={{ borderColor: "#c9b99033" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CalendarDays className="w-4 h-4" style={{ color: "#0891b2" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0891b2" }}>{t("cm_nextEvent")}</span>
                  </div>
                  {stats.nextEvent ? (
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1d3461" }}>{stats.nextEvent.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(stats.nextEvent.startDate).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        {stats.nextEvent.location ? ` · ${stats.nextEvent.location}` : ""}
                        {stats.nextEvent.deptName ? ` · ${stats.nextEvent.deptName}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noNextEvent")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Latest announcement */}
              <Card style={{ borderColor: "#c9b99033" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Megaphone className="w-4 h-4" style={{ color: "#059669" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#059669" }}>{t("cm_latestAnnouncement")}</span>
                  </div>
                  {stats.latestAnnouncement ? (
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1d3461" }}>{stats.latestAnnouncement.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(stats.latestAnnouncement.createdAt).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noLatestAnnouncement")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Pending members */}
              <Card style={{ borderColor: "#c9b99033" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-red-500">{t("cm_pendingJoinRequests")}</span>
                    </div>
                    {stats.pendingMembersList.length > 0 && (
                      <button onClick={() => setLocation(`/church/${slug}/members`)} className="text-xs text-blue-600 hover:underline flex items-center gap-1" data-testid="link-review-pending">
                        {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {stats.pendingMembersList.length > 0 ? (
                    <div className="space-y-1.5">
                      {stats.pendingMembersList.map(m => (
                        <div key={m.id} className="text-sm" style={{ color: "#1d3461" }}>
                          <span className="font-medium">{m.displayName}</span>
                          <span className="text-gray-400 text-xs ml-1.5">{m.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noPendingRequests")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Active prayers */}
              <Card style={{ borderColor: "#c9b99033" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" style={{ color: "#e11d48" }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e11d48" }}>{t("cm_activePrayersList")}</span>
                    </div>
                    {stats.activePrayersList.length > 0 && (
                      <button onClick={() => setLocation(`/church/${slug}/prayer`)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {stats.activePrayersList.length > 0 ? (
                    <div className="space-y-1.5">
                      {stats.activePrayersList.map(p => (
                        <div key={p.id} className="text-sm" style={{ color: "#1d3461" }}>
                          <span className="font-medium">{p.title}</span>
                          <span className="text-gray-400 text-xs ml-1.5">— {p.displayName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noActivePrayers")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#9a9080" }}>{t("cm_quickActions")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => setLocation(a.path)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all duration-150 active:scale-95"
                  style={{ backgroundColor: "#fff", borderColor: "#c9b99033" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${a.color}44`; (e.currentTarget as HTMLElement).style.backgroundColor = `${a.color}07`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c9b99033"; (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"; }}
                  data-testid={`button-quick-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${a.color}14` }}>
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <span className="text-xs font-medium leading-tight" style={{ color: "#374151" }}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Sermon Notes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#9a9080" }}>{t("cm_weeklySermonNotes")}</h2>
            {!noteFormOpen && (
              <Button
                size="sm"
                onClick={() => { setEditingNote(null); setNoteFormOpen(true); }}
                className="gap-1.5 text-xs"
                style={{ backgroundColor: "#1d3461", color: "#fff" }}
                data-testid="button-new-sermon-note"
              >
                <Plus className="w-3.5 h-3.5" /> {t("cm_newSermonNote")}
              </Button>
            )}
          </div>

          {noteFormOpen && (
            <div className="mb-4">
              <NoteForm
                churchId={church!.id}
                note={editingNote}
                onClose={closeForm}
                onSaved={onNoteSaved}
                getIdToken={getIdToken}
              />
            </div>
          )}

          {notes.length === 0 && !noteFormOpen ? (
            <div className="rounded-xl border p-8 text-center" style={{ borderColor: "#c9b99033", backgroundColor: "#fffdf9" }}>
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">{t("cm_noSermonNotes")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "#c9b99033", backgroundColor: "#fff" }}>
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                    data-testid={`card-note-${note.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: "#1d3461" }}>{note.title}</span>
                        {statusBadge(note.status)}
                      </div>
                      {note.sermonDate && (
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(note.sermonDate).toLocaleDateString()}{note.scripture ? ` · ${note.scripture}` : ""}</p>
                      )}
                    </div>
                    {expandedNote === note.id ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>

                  {expandedNote === note.id && (
                    <div className="border-t px-4 pb-4" style={{ borderColor: "#c9b99022" }}>
                      {note.summary && <p className="text-sm mt-3 text-gray-700 leading-relaxed">{note.summary}</p>}
                      {note.keyPoints && note.keyPoints.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {note.keyPoints.map((kp, i) => (
                            <li key={i} className="text-sm flex gap-2 text-gray-700">
                              <span className="font-semibold flex-shrink-0" style={{ color: "#1d3461" }}>{i + 1}.</span>
                              {kp}
                            </li>
                          ))}
                        </ul>
                      )}
                      {note.closingPrayer && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "#f8f4ee" }}>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#9a9080" }}>{t("cm_closingPrayer")}</p>
                          <p className="text-sm text-gray-700 italic">{note.closingPrayer}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openEdit(note)} data-testid={`button-edit-note-${note.id}`}>
                          <Edit2 className="w-3 h-3" /> {t("cm_editNote")}
                        </Button>
                        {note.status !== "archived" && (
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 text-xs text-gray-500"
                            onClick={() => archiveNote.mutate(note.id)}
                            disabled={archiveNote.isPending}
                            data-testid={`button-archive-note-${note.id}`}
                          >
                            <Archive className="w-3 h-3" /> {t("cm_archiveNote")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </ChurchModeShell>
  );
}
