import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Clock, CalendarDays, MessageSquare, Heart, Megaphone,
  BookOpen, ClipboardList, Loader2, ArrowRight, LayoutDashboard,
  Building2, UserCheck, ShieldAlert, UserPlus, GraduationCap,
  Bell, FileText,
} from "lucide-react";
import type { Church } from "@shared/schema";
import { CHURCH_ADMIN_ROLES } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; displayName?: string | null; }
interface DashStats {
  activeMembers: number; pendingMembers: number; upcomingEvents: number;
  unreadMessages: number; activePrayers: number; announcements: number;
  openTasks: number; publishedNotes: number; activeDepartments: number;
  sundaySchoolLessons: number; complianceNotices: number;
  nextEvent: { title: string; start_date: string; location?: string; dept_name?: string } | null;
  latestAnnouncement: { title: string; created_at: string } | null;
  latestLesson: { title: string; date: string } | null;
  pendingMembersList: Array<{ id: number; display_name: string; email: string }>;
  activePrayersList: Array<{ id: number; title: string; display_name: string }>;
  recentActivity: Array<{ type: string; description: string; created_at: string }>;
}

function hexIsBright(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function SummaryCard({
  icon: Icon, value, label, onClick, color, testId,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  value: number | string; label: string; onClick?: () => void; color: string; testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 border bg-white transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2"
      style={{ borderColor: `${color}22`, focusRingColor: color } as React.CSSProperties}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}55`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 14px ${color}18`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}22`;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
      aria-label={`${label}: ${value}`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
          <p className="text-xs mt-1.5 text-gray-500 leading-tight font-medium">{label}</p>
        </div>
      </div>
    </button>
  );
}

function QuickActionButton({
  icon: Icon, label, onClick, color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 sm:p-4 border bg-white text-center transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 min-h-[80px]"
      style={{ borderColor: `${color}22` }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}55`;
        (e.currentTarget as HTMLElement).style.backgroundColor = `${color}06`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}22`;
        (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
      }}
      aria-label={label}
      data-testid={`button-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-xs font-medium leading-tight" style={{ color: "#374151" }}>{label}</span>
    </button>
  );
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "member_joined") return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
  if (type === "announcement") return <Megaphone className="w-3.5 h-3.5 text-green-600" />;
  if (type === "note_published") return <FileText className="w-3.5 h-3.5 text-purple-500" />;
  return <Bell className="w-3.5 h-3.5 text-gray-400" />;
}

function activityLabel(type: string, t: (k: any) => string) {
  if (type === "member_joined") return t("cm_memberJoinedActivity");
  if (type === "announcement") return t("cm_announcementActivity");
  if (type === "note_published") return t("cm_noteActivity");
  return type;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChurchDashboard() {
  const [, params] = useRoute("/church/:slug/dashboard");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const isSignedIn = !!user && !!emailVerified;

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
  const isAdmin = CHURCH_ADMIN_ROLES.includes(currentRole as any);

  const { data: stats, isLoading: statsLoading } = useQuery<DashStats>({
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
    staleTime: 30000,
  });

  const themeColor = church?.themeColor ?? "#1d3461";
  const bright = hexIsBright(themeColor);
  const headerText = bright ? "#1a2744" : "#ffffff";
  const headerTextMuted = bright ? "#1a274488" : "#ffffffcc";
  const displayName = myRole?.displayName ?? user?.displayName ?? t("cm_pastor");
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (roleLoading) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={null}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: themeColor }} />
        </div>
      </ChurchModeShell>
    );
  }

  if (!isAdmin) {
    return (
      <ChurchModeShell church={church ?? null} currentRole={currentRole}>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 px-4" data-testid="text-access-denied">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fee2e2" }}>
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: "#1d3461" }}>{t("cm_notAuthorizedDashboard")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("cm_contactAdminForAccess")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/church/${slug}`)} data-testid="button-back-to-home">
            {t("cm_backToHome")}
          </Button>
        </div>
      </ChurchModeShell>
    );
  }

  const quickActions = [
    { icon: Megaphone, label: t("cm_createAnnouncement"), path: `/church/${slug}/announcements`, color: "#7c3aed" },
    { icon: CalendarDays, label: t("cm_addEvent"), path: `/church/${slug}/departments`, color: "#0891b2" },
    { icon: UserPlus, label: t("cm_inviteMembers"), path: `/church/${slug}/members`, color: "#059669" },
    { icon: Building2, label: t("cm_createDepartment"), path: `/church/${slug}/departments`, color: "#d97706" },
    { icon: ClipboardList, label: t("cm_createTask"), path: `/church/${slug}/departments`, color: "#6b7280" },
    { icon: GraduationCap, label: t("cm_openSundaySchool"), path: `/church/${slug}/admin`, color: "#1d3461" },
    { icon: Heart, label: t("cm_viewPrayers"), path: `/church/${slug}/prayer`, color: "#e11d48" },
    { icon: MessageSquare, label: t("cm_messageMembers"), path: `/church/${slug}/messages`, color: "#4f46e5" },
  ];

  return (
    <ChurchModeShell church={church ?? null} currentRole={currentRole}>
      <div className="space-y-6 pb-10" data-testid="page-church-dashboard">

        {/* ── Dashboard Header ── */}
        <div
          className="rounded-2xl p-5 sm:p-7"
          style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)` }}
          data-testid="section-dashboard-header"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Org logo / initials */}
            <div className="flex-shrink-0">
              {church?.logoUrl ? (
                <img
                  src={church.logoUrl}
                  alt={church.name}
                  className="w-14 h-14 rounded-xl object-cover border-2"
                  style={{ borderColor: `${headerText}22` }}
                  data-testid="img-church-logo"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 flex-shrink-0"
                  style={{ backgroundColor: `${headerText}18`, color: headerText, borderColor: `${headerText}22` }}
                  data-testid="avatar-church-initials"
                >
                  {getInitials(church?.name ?? "Ch")}
                </div>
              )}
            </div>

            {/* Org info + welcome */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: headerTextMuted }}>
                {today}
              </p>
              <h1
                className="text-white font-bold text-xl sm:text-2xl leading-tight mt-0.5 break-words"
                style={{ color: headerText }}
                data-testid="text-church-name"
              >
                {church?.name}
              </h1>
              {church?.denomination && (
                <p className="text-sm mt-0.5" style={{ color: headerTextMuted }}>{church.denomination}</p>
              )}
              <p className="text-base font-medium mt-2" style={{ color: headerText }} data-testid="text-pastor-welcome">
                {t("cm_welcomeBack").replace("{name}", displayName)}
              </p>
            </div>

            {/* View Member Experience button */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setLocation(`/church/${slug}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border"
                style={{ color: headerText, borderColor: `${headerText}33`, backgroundColor: `${headerText}12` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = `${headerText}22`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = `${headerText}12`}
                data-testid="button-view-member-experience"
              >
                <Users className="w-3.5 h-3.5" />
                {t("cm_viewMemberExperience")}
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        {statsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />{t("cm_loadingDashboard")}
          </div>
        ) : stats ? (
          <section aria-label={t("cm_overview")}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9a9080" }}>
              {t("cm_overview")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={Users} value={stats.activeMembers} label={t("cm_totalActiveMembers")} onClick={() => setLocation(`/church/${slug}/members`)} color="#1d3461" testId="card-stat-members" />
              <SummaryCard icon={Heart} value={stats.activePrayers} label={t("cm_activePrayers")} onClick={() => setLocation(`/church/${slug}/prayer`)} color="#e11d48" testId="card-stat-prayer" />
              <SummaryCard icon={Megaphone} value={stats.announcements} label={t("cm_publishedAnnouncements")} onClick={() => setLocation(`/church/${slug}/announcements`)} color="#059669" testId="card-stat-announcements" />
              <SummaryCard icon={CalendarDays} value={stats.upcomingEvents} label={t("cm_upcomingEvents")} onClick={() => setLocation(`/church/${slug}/departments`)} color="#0891b2" testId="card-stat-events" />
              <SummaryCard icon={Building2} value={stats.activeDepartments} label={t("cm_activeDepartments")} onClick={() => setLocation(`/church/${slug}/departments`)} color="#7c3aed" testId="card-stat-departments" />
              <SummaryCard icon={ClipboardList} value={stats.openTasks} label={t("cm_openTasks")} onClick={() => setLocation(`/church/${slug}/departments`)} color="#d97706" testId="card-stat-tasks" />
              <SummaryCard icon={GraduationCap} value={stats.sundaySchoolLessons} label={t("cm_sundaySchoolLessons")} onClick={() => setLocation(`/church/${slug}/admin`)} color="#4f46e5" testId="card-stat-sunday-school" />
              {stats.complianceNotices > 0 && (
                <SummaryCard icon={ShieldAlert} value={stats.complianceNotices} label={t("cm_complianceNotices")} onClick={() => setLocation(`/church/${slug}/admin`)} color="#dc2626" testId="card-stat-compliance" />
              )}
              {stats.complianceNotices === 0 && (
                <SummaryCard icon={MessageSquare} value={stats.unreadMessages} label={t("cm_unreadMessages")} onClick={() => setLocation(`/church/${slug}/messages`)} color="#6b7280" testId="card-stat-messages" />
              )}
            </div>
          </section>
        ) : null}

        {/* ── Quick Actions ── */}
        <section aria-label={t("cm_quickActions")}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9a9080" }}>
            {t("cm_quickActions")}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {quickActions.map(a => (
              <QuickActionButton key={a.label} icon={a.icon} label={a.label} onClick={() => setLocation(a.path)} color={a.color} />
            ))}
          </div>
        </section>

        {/* ── This Week ── */}
        {stats && (
          <section aria-label={t("cm_thisWeek")}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9a9080" }}>
              {t("cm_thisWeek")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Next Event */}
              <Card style={{ borderColor: "#c9b99022" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-4 h-4" style={{ color: "#0891b2" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0891b2" }}>{t("cm_nextEvent")}</span>
                  </div>
                  {stats.nextEvent ? (
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1d3461" }}>{stats.nextEvent.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(stats.nextEvent.start_date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        {stats.nextEvent.location ? ` · ${stats.nextEvent.location}` : ""}
                        {stats.nextEvent.dept_name ? ` · ${stats.nextEvent.dept_name}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noNextEvent")}</p>
                  )}
                  <button onClick={() => setLocation(`/church/${slug}/departments`)} className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1">
                    {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                  </button>
                </CardContent>
              </Card>

              {/* Latest Announcement */}
              <Card style={{ borderColor: "#c9b99022" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-4 h-4" style={{ color: "#059669" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#059669" }}>{t("cm_latestAnnouncement")}</span>
                  </div>
                  {stats.latestAnnouncement ? (
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1d3461" }}>{stats.latestAnnouncement.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(stats.latestAnnouncement.created_at).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noLatestAnnouncement")}</p>
                  )}
                  <button onClick={() => setLocation(`/church/${slug}/announcements`)} className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1">
                    {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                  </button>
                </CardContent>
              </Card>

              {/* Latest Sunday School Lesson */}
              <Card style={{ borderColor: "#c9b99022" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4" style={{ color: "#4f46e5" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#4f46e5" }}>{t("cm_latestLesson")}</span>
                  </div>
                  {stats.latestLesson ? (
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#1d3461" }}>{stats.latestLesson.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(stats.latestLesson.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noLatestLesson")}</p>
                  )}
                  <button onClick={() => setLocation(`/church/${slug}/admin`)} className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1">
                    {t("cm_openSundaySchool")} <ArrowRight className="w-3 h-3" />
                  </button>
                </CardContent>
              </Card>

              {/* Pending Member Requests */}
              <Card style={{ borderColor: "#c9b99022" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-red-500">{t("cm_pendingJoinRequests")}</span>
                    </div>
                    {stats.pendingMembersList.length > 0 && (
                      <button onClick={() => setLocation(`/church/${slug}/members`)} className="text-xs text-blue-500 hover:underline flex items-center gap-1" data-testid="link-review-pending">
                        {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {stats.pendingMembersList.length > 0 ? (
                    <div className="space-y-1">
                      {stats.pendingMembersList.slice(0, 3).map(m => (
                        <div key={m.id} className="text-sm" style={{ color: "#1d3461" }}>
                          <span className="font-medium">{m.display_name}</span>
                          <span className="text-gray-400 text-xs ml-1.5 truncate inline-block max-w-[120px] align-middle">{m.email}</span>
                        </div>
                      ))}
                      {stats.pendingMembersList.length > 3 && (
                        <p className="text-xs text-gray-400">+{stats.pendingMembersList.length - 3} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noPendingRequests")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Active Prayers */}
              <Card className="sm:col-span-2" style={{ borderColor: "#c9b99022" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" style={{ color: "#e11d48" }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e11d48" }}>{t("cm_activePrayersList")}</span>
                    </div>
                    {stats.activePrayersList.length > 0 && (
                      <button onClick={() => setLocation(`/church/${slug}/prayer`)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        {t("cm_viewAll")} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {stats.activePrayersList.length > 0 ? (
                    <div className="space-y-1">
                      {stats.activePrayersList.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium" style={{ color: "#1d3461" }}>{p.display_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t("cm_noActivePrayers")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* ── Recent Activity ── */}
        {stats && (
          <section aria-label={t("cm_recentActivity")} data-testid="section-recent-activity">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9a9080" }}>
              {t("cm_recentActivity")}
            </h2>
            <Card style={{ borderColor: "#c9b99022" }}>
              <CardContent className="p-4">
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100">
                          <ActivityIcon type={item.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500">{activityLabel(item.type, t)}</p>
                          <p className="text-sm font-medium leading-snug truncate" style={{ color: "#1d3461" }}>
                            {item.description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{formatRelativeTime(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">{t("cm_noRecentActivity")}</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Compliance Alert ── */}
        {stats && stats.complianceNotices > 0 && (
          <section data-testid="section-compliance-alert">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-red-700">{t("cm_complianceAlert").replace("{n}", String(stats.complianceNotices))}</p>
                <p className="text-xs text-red-500 mt-0.5">{t("cm_complianceAlertSubtitle")}</p>
              </div>
              <Button size="sm" variant="outline" className="flex-shrink-0 border-red-200 text-red-600 hover:bg-red-100 text-xs" onClick={() => setLocation(`/church/${slug}/admin`)}>
                {t("cm_reviewNow")}
              </Button>
            </div>
          </section>
        )}

      </div>
    </ChurchModeShell>
  );
}
