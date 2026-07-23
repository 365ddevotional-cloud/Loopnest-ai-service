import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, MessageSquare, Megaphone, Heart, Calendar, CheckSquare,
  Users, ClipboardList, Loader2, Send, Trash2, Pin, Plus, ChevronLeft,
  Copy, Check, User, Settings, AlertCircle, Flag,
} from "lucide-react";
import type {
  Church, ChurchDepartment, ChurchDepartmentMember, ChurchDepartmentPost,
  ChurchDepartmentEvent, ChurchDepartmentTask, ChurchDepartmentAttendance,
} from "@shared/schema";

type DeptTab = "chat" | "announcements" | "prayer" | "events" | "tasks" | "attendance" | "members";

interface DeptDetail extends ChurchDepartment {
  myMembership: ChurchDepartmentMember | null;
  memberCount: number;
}

type PostWithAuthor = ChurchDepartmentPost & { authorName: string | null };
type MemberWithInfo = ChurchDepartmentMember & { member: { id: number; displayName: string | null; avatarUrl: string | null; role: string | null } };

const ROLE_COLORS: Record<string, string> = {
  leader: "#b8962e", assistant_leader: "#0891b2", secretary: "#059669", member: "#7a7570",
};

function fmtDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return fmtDate(d, { month: "short", day: "numeric" });
}

export default function ChurchDepartmentView() {
  const [location, setLocation] = useLocation();
  const m = location.match(/\/church\/([^/]+)\/departments\/([^/]+)/);
  const slug = m?.[1] ?? "";
  const deptSlug = m?.[2] ?? "";

  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const ROLE_LABELS: Record<string, string> = {
    leader: t("cm_roleLeader"), assistant_leader: t("cm_roleAssistantLeader"),
    secretary: t("cm_roleSecretary"), member: t("cm_member"),
  };

  const [activeTab, setActiveTab] = useState<DeptTab>("chat");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", type: "", description: "", logoUrl: "", bannerUrl: "" });
  const [saving, setSaving] = useState(false);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", location: "", startDate: "", endDate: "", isAllDay: false });
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "", priority: "normal" });
  const [creatingTask, setCreatingTask] = useState(false);

  // Attendance
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceTitle, setAttendanceTitle] = useState("");
  const [attendeeSelection, setAttendeeSelection] = useState<Set<number>>(new Set());
  const [recordingAttendance, setRecordingAttendance] = useState(false);

  const { data: churchData } = useQuery<{ church: Church }>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: () => fetch(`/api/churches/slug/${slug}`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });
  const church = churchData?.church ?? null;

  const { data: myRole } = useQuery<{ role: string | null; memberId: number | null }>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const { data: deptData, isLoading: deptLoading } = useQuery<DeptDetail>({
    queryKey: ["/api/churches", slug, "departments", deptSlug],
    queryFn: async () => {
      // First get church to get depts list, then find by slug
      if (!church) throw new Error("No church");
      const headers = await authHeaders();
      const deptsR = await fetch(`/api/churches/${church.id}/departments`, { headers });
      if (!deptsR.ok) throw new Error("Failed");
      const depts: DeptDetail[] = await deptsR.json();
      const dept = depts.find(d => d.slug === deptSlug);
      if (!dept) throw new Error("Not found");
      const r = await fetch(`/api/churches/departments/${dept.id}`, { headers });
      return r.ok ? r.json() : Promise.reject();
    },
    enabled: !!church && isSignedIn,
  });

  const deptId = deptData?.id;
  const myMembership = deptData?.myMembership;
  const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
  const isChurchAdmin = ADMIN_ROLES.includes(myRole?.role ?? "");
  const LEADER_ROLES = ["leader", "assistant_leader"];
  const isDeptLeader = LEADER_ROLES.includes(myMembership?.role ?? "") || isChurchAdmin;
  const isInDept = !!myMembership || isChurchAdmin;
  const canPost = isInDept;

  const { data: posts, isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/churches/departments", deptId, "posts", activeTab],
    queryFn: async () => {
      const headers = await authHeaders();
      const typeMap: Partial<Record<DeptTab, string>> = { chat: "message", announcements: "announcement", prayer: "prayer" };
      const type = typeMap[activeTab];
      if (!type) return [];
      const r = await fetch(`/api/churches/departments/${deptId}/posts?type=${type}`, { headers });
      return r.ok ? r.json() : [];
    },
    enabled: !!deptId && isInDept && ["chat", "announcements", "prayer"].includes(activeTab),
  });

  const { data: members, isLoading: membersLoading } = useQuery<MemberWithInfo[]>({
    queryKey: ["/api/churches/departments", deptId, "members"],
    queryFn: async () => {
      const headers = await authHeaders();
      const r = await fetch(`/api/churches/departments/${deptId}/members`, { headers });
      return r.ok ? r.json() : [];
    },
    enabled: !!deptId && isInDept && (activeTab === "members" || activeTab === "attendance" || activeTab === "tasks"),
  });

  const { data: events } = useQuery<ChurchDepartmentEvent[]>({
    queryKey: ["/api/churches/departments", deptId, "events"],
    queryFn: async () => {
      const headers = await authHeaders();
      const r = await fetch(`/api/churches/departments/${deptId}/events`, { headers });
      return r.ok ? r.json() : [];
    },
    enabled: !!deptId && isInDept && activeTab === "events",
  });

  const { data: tasks } = useQuery<ChurchDepartmentTask[]>({
    queryKey: ["/api/churches/departments", deptId, "tasks"],
    queryFn: async () => {
      const headers = await authHeaders();
      const r = await fetch(`/api/churches/departments/${deptId}/tasks`, { headers });
      return r.ok ? r.json() : [];
    },
    enabled: !!deptId && isInDept && activeTab === "tasks",
  });

  const { data: attendance } = useQuery<ChurchDepartmentAttendance[]>({
    queryKey: ["/api/churches/departments", deptId, "attendance"],
    queryFn: async () => {
      const headers = await authHeaders();
      const r = await fetch(`/api/churches/departments/${deptId}/attendance`, { headers });
      return r.ok ? r.json() : [];
    },
    enabled: !!deptId && isDeptLeader && activeTab === "attendance",
  });

  const sendPost = async (type: string) => {
    if (!message.trim() || !deptId) return;
    setSending(true);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const r = await fetch(`/api/churches/departments/${deptId}/posts`, {
        method: "POST", headers,
        body: JSON.stringify({ type, content: message.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      setMessage("");
      qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "posts", activeTab] });
    } finally { setSending(false); }
  };

  const deletePost = async (postId: number) => {
    if (!deptId) return;
    const headers = await authHeaders();
    const r = await fetch(`/api/churches/departments/${deptId}/posts/${postId}`, { method: "DELETE", headers });
    if (r.ok) qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "posts", activeTab] });
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startDate || !deptId) return;
    setCreatingEvent(true);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const r = await fetch(`/api/churches/departments/${deptId}/events`, {
        method: "POST", headers, body: JSON.stringify(eventForm),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "events"] });
      setShowEventForm(false);
      setEventForm({ title: "", description: "", location: "", startDate: "", endDate: "", isAllDay: false });
    } finally { setCreatingEvent(false); }
  };

  const deleteEvent = async (eventId: number) => {
    if (!deptId) return;
    const headers = await authHeaders();
    await fetch(`/api/churches/departments/${deptId}/events/${eventId}`, { method: "DELETE", headers });
    qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "events"] });
  };

  const createTask = async () => {
    if (!taskForm.title.trim() || !deptId) return;
    setCreatingTask(true);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const r = await fetch(`/api/churches/departments/${deptId}/tasks`, {
        method: "POST", headers, body: JSON.stringify({
          ...taskForm,
          assignedTo: taskForm.assignedTo ? parseInt(taskForm.assignedTo) : undefined,
          dueDate: taskForm.dueDate || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "tasks"] });
      setShowTaskForm(false);
      setTaskForm({ title: "", description: "", assignedTo: "", dueDate: "", priority: "normal" });
    } finally { setCreatingTask(false); }
  };

  const updateTask = async (taskId: number, data: { status?: string; priority?: string }) => {
    if (!deptId) return;
    const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
    await fetch(`/api/churches/departments/${deptId}/tasks/${taskId}`, { method: "PATCH", headers, body: JSON.stringify(data) });
    qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "tasks"] });
  };

  const deleteTask = async (taskId: number) => {
    if (!deptId) return;
    const headers = await authHeaders();
    await fetch(`/api/churches/departments/${deptId}/tasks/${taskId}`, { method: "DELETE", headers });
    qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "tasks"] });
  };

  const recordAttendance = async () => {
    if (!attendanceDate || !deptId) return;
    setRecordingAttendance(true);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const r = await fetch(`/api/churches/departments/${deptId}/attendance`, {
        method: "POST", headers,
        body: JSON.stringify({ sessionDate: attendanceDate, sessionTitle: attendanceTitle || null, attendeeIds: Array.from(attendeeSelection) }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      toast({ title: t("cm_attendanceRecorded") });
      qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "attendance"] });
      setShowAttendanceForm(false);
      setAttendeeSelection(new Set());
    } finally { setRecordingAttendance(false); }
  };

  const saveDeptSettings = async () => {
    if (!deptId) return;
    setSaving(true);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const r = await fetch(`/api/churches/departments/${deptId}`, { method: "PUT", headers, body: JSON.stringify(editForm) });
      const data = await r.json();
      if (!r.ok) { toast({ title: t("cm_error"), description: data.message, variant: "destructive" }); return; }
      toast({ title: t("cm_settingsSaved") });
      qc.invalidateQueries({ queryKey: ["/api/churches", slug, "departments", deptSlug] });
      setShowSettings(false);
    } finally { setSaving(false); }
  };

  const copyInviteCode = () => {
    if (!deptData?.inviteCode) return;
    navigator.clipboard.writeText(deptData.inviteCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const TABS: Array<{ id: DeptTab; label: string; icon: typeof MessageSquare; leaderOnly?: boolean }> = [
    { id: "chat", label: t("cm_chat"), icon: MessageSquare },
    { id: "announcements", label: t("cm_announcementsTab"), icon: Megaphone },
    { id: "prayer", label: t("cm_prayerTab"), icon: Heart },
    { id: "events", label: t("cm_eventsTab"), icon: Calendar },
    { id: "tasks", label: t("cm_tasksTab"), icon: CheckSquare },
    { id: "members", label: t("cm_membersTab"), icon: Users },
    { id: "attendance", label: t("cm_attendanceTab"), icon: ClipboardList, leaderOnly: true },
  ];

  if (deptLoading) {
    return (
      <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} /></div>
      </ChurchModeShell>
    );
  }

  if (!deptData) {
    return (
      <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
        <div className="max-w-md mx-auto pt-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto" style={{ color: "#9a9080" }} />
          <p className="font-semibold" style={{ color: "#1d3461" }}>{t("cm_deptNotFound")}</p>
          <Button variant="outline" onClick={() => setLocation(`/church/${slug}/departments`)} className="gap-2">
            <ChevronLeft className="w-4 h-4" />{t("cm_backToDepartments")}
          </Button>
        </div>
      </ChurchModeShell>
    );
  }

  const visibleTabs = TABS.filter(t => !t.leaderOnly || isDeptLeader);

  const PostsPanel = ({ type, placeholder }: { type: string; placeholder: string }) => (
    <div className="flex flex-col gap-4 h-full">
      <div className="space-y-3 flex-1">
        {postsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#b8962e" }} /></div>
        ) : !posts?.length ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_noMessagesPost")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...posts].reverse().map(post => {
              const isMe = false;
              return (
                <div key={post.id} className="flex gap-3 group" data-testid={`post-${post.id}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: "#1d346120", color: "#1d3461" }}>
                    {(post.authorName ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold" style={{ color: "#1d3461" }}>{post.authorName ?? t("cm_member")}</p>
                      <p className="text-xs" style={{ color: "#9a9080" }}>{timeAgo(post.createdAt)}</p>
                      {post.isPinned && <Pin className="w-3 h-3" style={{ color: "#b8962e" }} />}
                    </div>
                    {post.title && <p className="text-sm font-semibold mb-0.5" style={{ color: "#1d3461" }}>{post.title}</p>}
                    <p className="text-sm" style={{ color: "#4a4540" }}>{post.content}</p>
                    {post.fileUrl && (
                      <a href={post.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: "#1d3461" }}>
                        📎 {post.fileName ?? t("cm_attachment")}
                      </a>
                    )}
                  </div>
                  {isDeptLeader && (
                    <button onClick={() => deletePost(post.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                      data-testid={`button-delete-post-${post.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {canPost && (type !== "announcement" || isDeptLeader) && (
        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "#e8e3dc" }}>
          <Textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder={placeholder} rows={2}
            className="flex-1 resize-none text-sm"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(type); } }}
            data-testid="input-post-message"
          />
          <Button onClick={() => sendPost(type)} disabled={sending || !message.trim()}
            className="self-end gap-1" style={{ backgroundColor: "#1d3461" }} data-testid="button-send-post">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
      <div className="space-y-4">
        {/* Back + Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => setLocation(`/church/${slug}/departments`)}
            className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            data-testid="button-back-to-departments">
            <ChevronLeft className="w-5 h-5" style={{ color: "#7a7570" }} />
          </button>
          {deptData.bannerUrl ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
              <img src={deptData.bannerUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#1d346118" }}>
              {deptData.logoUrl
                ? <img src={deptData.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <Building2 className="w-7 h-7" style={{ color: "#1d3461" }} />
              }
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold" style={{ color: "#1d3461" }}>{deptData.name}</h1>
            <div className="flex items-center gap-3 flex-wrap mt-0.5">
              <Badge className="text-xs" style={{ backgroundColor: "#1d346112", color: "#1d3461", border: "none" }}>
                {deptData.type}
              </Badge>
              <p className="text-xs" style={{ color: "#9a9080" }}>{deptData.memberCount} {t("cm_memberCount")}</p>
              {myMembership && (
                <span className="text-xs font-semibold" style={{ color: ROLE_COLORS[myMembership.role] ?? "#7a7570" }}>
                  {ROLE_LABELS[myMembership.role] ?? myMembership.role}
                </span>
              )}
            </div>
            {deptData.description && (
              <p className="text-xs mt-1" style={{ color: "#7a7570" }}>{deptData.description}</p>
            )}
          </div>
          {isDeptLeader && (
            <button className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
              onClick={() => {
                setEditForm({ name: deptData.name, type: deptData.type ?? "", description: deptData.description ?? "", logoUrl: deptData.logoUrl ?? "", bannerUrl: deptData.bannerUrl ?? "" });
                setShowSettings(true);
              }}
              data-testid="button-dept-settings">
              <Settings className="w-4 h-4" style={{ color: "#7a7570" }} />
            </button>
          )}
        </div>

        {/* Invite code banner for leaders */}
        {isDeptLeader && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "#92400e" }}>{t("cm_deptInviteCode")}</p>
              <p className="text-lg font-mono font-bold tracking-widest" style={{ color: "#1d3461" }}>{deptData.inviteCode}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9a9080" }}>{t("cm_shareInviteCode")}</p>
            </div>
            <button onClick={copyInviteCode}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: "#1d346110", color: "#1d3461" }} data-testid="button-copy-invite-code">
              {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {codeCopied ? t("cm_copied") : t("cm_copy")}
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex overflow-x-auto gap-0 border-b scrollbar-hide" style={{ borderColor: "#e0dcd8" }}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 flex-shrink-0 transition-colors"
                style={{ borderColor: activeTab === tab.id ? "#1d3461" : "transparent", color: activeTab === tab.id ? "#1d3461" : "#7a7570" }}
                data-testid={`tab-dept-${tab.id}`}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {/* Chat */}
          {activeTab === "chat" && <PostsPanel type="message" placeholder={t("cm_typeMessage")} />}

          {/* Announcements */}
          {activeTab === "announcements" && (
            <div className="space-y-4">
              {isDeptLeader && (
                <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: "#f0f8ff", border: "1px solid #3b82f620" }}>
                  <p style={{ color: "#1e40af" }}>{t("cm_leaderAnnouncementNote")}</p>
                </div>
              )}
              <PostsPanel type="announcement" placeholder={t("cm_writeAnnouncement")} />
            </div>
          )}

          {/* Prayer */}
          {activeTab === "prayer" && <PostsPanel type="prayer" placeholder={t("cm_sharePrayerRequest")} />}

          {/* Events */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {isDeptLeader && (
                <Button size="sm" onClick={() => setShowEventForm(true)} className="gap-2" style={{ backgroundColor: "#1d3461" }}
                  data-testid="button-add-event">
                  <Plus className="w-3.5 h-3.5" />{t("cm_addEvent")}
                </Button>
              )}
              {!events?.length ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 mx-auto mb-2" style={{ color: "#c9b99060" }} />
                  <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_noUpcomingEvents")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map(evt => (
                    <Card key={evt.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                            style={{ backgroundColor: "#1d346112" }}>
                            <p className="text-xs font-bold" style={{ color: "#1d3461" }}>
                              {new Date(evt.startDate).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                            </p>
                            <p className="text-lg font-bold leading-none" style={{ color: "#1d3461" }}>
                              {new Date(evt.startDate).getDate()}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold" style={{ color: "#1d3461" }}>{evt.title}</p>
                            {evt.description && <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{evt.description}</p>}
                            {evt.location && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#9a9080" }}>📍 {evt.location}</p>}
                            <p className="text-xs mt-1" style={{ color: "#9a9080" }}>
                              {fmtDate(evt.startDate, { weekday: "long", month: "long", day: "numeric" })}
                              {!evt.isAllDay && ` · ${fmtTime(evt.startDate)}`}
                              {evt.endDate && ` — ${fmtTime(evt.endDate)}`}
                            </p>
                          </div>
                          {isDeptLeader && (
                            <button onClick={() => deleteEvent(evt.id)} className="p-1 rounded hover:bg-red-50"
                              data-testid={`button-delete-event-${evt.id}`}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {isDeptLeader && (
                <Button size="sm" onClick={() => setShowTaskForm(true)} className="gap-2" style={{ backgroundColor: "#1d3461" }}
                  data-testid="button-add-task">
                  <Plus className="w-3.5 h-3.5" />{t("cm_addTask")}
                </Button>
              )}
              {!tasks?.length ? (
                <div className="text-center py-10">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2" style={{ color: "#c9b99060" }} />
                  <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_noTasksYet")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => {
                    const STATUS_COLORS = { pending: "#9a9080", in_progress: "#b8962e", completed: "#166534" };
                    const PRIORITY_COLORS = { low: "#9a9080", normal: "#1d3461", high: "#dc2626" };
                    const assignedMember = members?.find(m => m.churchMemberId === task.assignedTo);
                    return (
                      <Card key={task.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                        <CardContent className="pt-3 pb-3 px-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => updateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" })}
                              className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                              style={{ borderColor: task.status === "completed" ? "#166534" : "#d0c8bc", backgroundColor: task.status === "completed" ? "#166534" : "transparent" }}
                              data-testid={`button-task-status-${task.id}`}>
                              {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${task.status === "completed" ? "line-through" : ""}`}
                                style={{ color: task.status === "completed" ? "#9a9080" : "#1d3461" }}>{task.title}</p>
                              {task.description && <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{task.description}</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className="text-xs capitalize" style={{
                                  backgroundColor: `${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? "#1d3461"}18`,
                                  color: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? "#1d3461",
                                  border: "none"
                                }}>
                                  <Flag className="w-2.5 h-2.5 mr-1" />{task.priority}
                                </Badge>
                                {task.dueDate && <p className="text-xs" style={{ color: "#9a9080" }}>Due: {fmtDate(task.dueDate, { month: "short", day: "numeric" })}</p>}
                                {assignedMember && <p className="text-xs" style={{ color: "#7a7570" }}>→ {assignedMember.member.displayName ?? "Member"}</p>}
                              </div>
                            </div>
                            {isDeptLeader && (
                              <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-50"
                                data-testid={`button-delete-task-${task.id}`}>
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Members */}
          {activeTab === "members" && (
            <div className="space-y-3">
              {membersLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#b8962e" }} /></div>
              ) : !members?.length ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 mx-auto mb-2" style={{ color: "#c9b99060" }} />
                  <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_noMembersYet")}</p>
                </div>
              ) : (
                members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ backgroundColor: "#1d346118", color: "#1d3461" }}>
                      {m.member.avatarUrl
                        ? <img src={m.member.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : (m.member.displayName ?? "?")[0].toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#1d3461" }}>{m.member.displayName ?? "Member"}</p>
                      <p className="text-xs" style={{ color: ROLE_COLORS[m.role] ?? "#9a9080" }}>{ROLE_LABELS[m.role] ?? m.role}</p>
                    </div>
                    {isDeptLeader && m.role !== "leader" && (
                      <button onClick={async () => {
                        const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
                        await fetch(`/api/churches/departments/${deptId}/members/${m.churchMemberId}`, { method: "DELETE", headers });
                        qc.invalidateQueries({ queryKey: ["/api/churches/departments", deptId, "members"] });
                      }} className="p-1.5 rounded hover:bg-red-50" data-testid={`button-remove-member-${m.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Attendance (leaders only) */}
          {activeTab === "attendance" && isDeptLeader && (
            <div className="space-y-4">
              <Button size="sm" onClick={() => { setAttendeeSelection(new Set()); setShowAttendanceForm(true); }}
                className="gap-2" style={{ backgroundColor: "#1d3461" }} data-testid="button-record-attendance">
                <Plus className="w-3.5 h-3.5" />{t("cm_recordAttendance")}
              </Button>
              {!attendance?.length ? (
                <div className="text-center py-10">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: "#c9b99060" }} />
                  <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_noAttendanceYet")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.map(session => (
                    <Card key={session.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-3 pb-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#1d3461" }}>
                              {session.sessionTitle ?? "Session"}
                            </p>
                            <p className="text-xs" style={{ color: "#7a7570" }}>{fmtDate(session.sessionDate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold" style={{ color: "#1d3461" }}>{session.attendeeIds.length}</p>
                            <p className="text-xs" style={{ color: "#9a9080" }}>present</p>
                          </div>
                        </div>
                        {session.attendeeIds.length > 0 && members && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {session.attendeeIds.map(id => {
                              const member = members.find(m => m.churchMemberId === id);
                              return member ? (
                                <span key={id} className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: "#22c55e18", color: "#166534" }}>
                                  {member.member.displayName ?? "Member"}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Department Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_deptSettings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("cm_name")}</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} data-testid="input-edit-dept-name" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptType")}</Label>
              <Input value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptDescription")}</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("cm_logoUrl")}</Label>
                <Input value={editForm.logoUrl} onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_bannerUrl")}</Label>
                <Input value={editForm.bannerUrl} onChange={e => setEditForm(f => ({ ...f, bannerUrl: e.target.value }))} placeholder="https://…" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={saveDeptSettings} disabled={saving} className="flex-1" style={{ backgroundColor: "#1d3461" }}
                data-testid="button-save-dept-settings">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("cm_saving")}</> : t("cm_saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_addEvent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("cm_title")} <span className="text-red-500">*</span></Label>
              <Input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} data-testid="input-event-title" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptDescription")}</Label>
              <Textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_location")}</Label>
              <Input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Church Hall, Main Auditorium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("cm_startDateTime")} <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={eventForm.startDate} onChange={e => setEventForm(f => ({ ...f, startDate: e.target.value }))} data-testid="input-event-start" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_endDateTime")}</Label>
                <Input type="datetime-local" value={eventForm.endDate} onChange={e => setEventForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEventForm(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={createEvent} disabled={creatingEvent || !eventForm.title.trim() || !eventForm.startDate}
                className="flex-1" style={{ backgroundColor: "#1d3461" }} data-testid="button-confirm-event">
                {creatingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{t("cm_saveEvent")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_addTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("cm_title")} <span className="text-red-500">*</span></Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} data-testid="input-task-title" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_deptDescription")}</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("cm_assignTo")}</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                  value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">{t("cm_unassigned")}</option>
                  {(members ?? []).map(m => (
                    <option key={m.id} value={m.churchMemberId}>{m.member.displayName ?? "Member"}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_priority")}</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" style={{ borderColor: "#e8e3dc" }}
                  value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">{t("cm_priorityLow")}</option>
                  <option value="normal">{t("cm_priorityNormal")}</option>
                  <option value="high">{t("cm_priorityHigh")}</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("cm_dueDate")}</Label>
              <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-task-due-date" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTaskForm(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={createTask} disabled={creatingTask || !taskForm.title.trim()}
                className="flex-1" style={{ backgroundColor: "#1d3461" }} data-testid="button-confirm-task">
                {creatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{t("cm_addTask")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Attendance Modal */}
      <Dialog open={showAttendanceForm} onOpenChange={setShowAttendanceForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#1d3461" }}>{t("cm_recordAttendance")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("cm_sessionDate")} <span className="text-red-500">*</span></Label>
                <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} data-testid="input-attendance-date" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cm_sessionTitle")}</Label>
                <Input value={attendanceTitle} onChange={e => setAttendanceTitle(e.target.value)} placeholder="e.g. Sunday Practice" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("cm_presentMembers")} ({attendeeSelection.size} {t("cm_selected")})</Label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-3" style={{ borderColor: "#e8e3dc" }}>
                {(members ?? []).map(m => {
                  const isSelected = attendeeSelection.has(m.churchMemberId);
                  return (
                    <label key={m.id} className="flex items-center gap-3 cursor-pointer py-1">
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: isSelected ? "#1d3461" : "#d0c8bc", backgroundColor: isSelected ? "#1d3461" : "transparent" }}
                        onClick={() => setAttendeeSelection(s => { const n = new Set(s); isSelected ? n.delete(m.churchMemberId) : n.add(m.churchMemberId); return n; })}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm" style={{ color: "#1d3461" }}>{m.member.displayName ?? "Member"}</span>
                      <span className="text-xs ml-auto" style={{ color: ROLE_COLORS[m.role] ?? "#9a9080" }}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAttendanceForm(false)} className="flex-1">{t("cm_cancel")}</Button>
              <Button onClick={recordAttendance} disabled={recordingAttendance || !attendanceDate}
                className="flex-1" style={{ backgroundColor: "#1d3461" }} data-testid="button-confirm-attendance">
                {recordingAttendance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t("cm_recordAttendance")} ({attendeeSelection.size} {t("cm_present")})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ChurchModeShell>
  );
}
