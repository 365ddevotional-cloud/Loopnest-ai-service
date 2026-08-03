import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Church } from "@shared/schema";
import { CHURCH_ROLE_LABELS, type ChurchRole } from "@shared/schema";
import { Home, Mic2, Megaphone, Users, Heart, Shield, Settings, ChevronRight, HandCoins, MessageSquare, UserCircle, Building2, Globe, Check, Menu, X, CalendarDays, ClipboardList, LayoutDashboard, BookText } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { getCurrentLang } from "@/utils/i18n";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface ChurchModeShellProps {
  church: Church | null;
  currentRole: string | null;
  children: React.ReactNode;
  unreadMessages?: number;
  pendingMembers?: number;
}

function DefaultEmblem({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="52" height="52" rx="12" fill="#b8962e" fillOpacity="0.18" />
      <rect x="23.5" y="7" width="5" height="30" rx="2.5" fill="#d4a83a" />
      <rect x="14" y="15" width="24" height="5" rx="2.5" fill="#d4a83a" />
      <rect x="18" y="30" width="16" height="15" rx="2.5" fill="#d4a83a" fillOpacity="0.55" />
      <rect x="23.5" y="30" width="5" height="15" rx="0" fill="#d4a83a" fillOpacity="0.3" />
    </svg>
  );
}

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const LEADER_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "ministry_leader", "group_leader", "prayer_team"];

function hexIsBright(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

const CHURCH_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

function LangPicker({ headerTextSecondary, headerBorder }: { headerTextSecondary: string; headerBorder: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => getCurrentLang());

  const handleSelect = (code: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (code === "en") localStorage.removeItem("devotionalLang");
    else localStorage.setItem("devotionalLang", code);
    setCurrent(code);
    setOpen(false);
    window.location.reload();
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(o => !o);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onMouseDown={() => setOpen(false)}
          onTouchStart={() => setOpen(false)}
        />
      )}
      <div className="relative flex-shrink-0" style={{ zIndex: open ? 9999 : "auto" }}>
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg transition-all"
          style={{ color: headerTextSecondary, border: `1px solid ${headerBorder}`, backgroundColor: "transparent" }}
          title="Language"
          data-testid="button-church-lang"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline uppercase">{current}</span>
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-36"
            style={{ zIndex: 9999 }}
          >
            {CHURCH_LANGS.map(l => (
              <button
                key={l.code}
                onMouseDown={(e) => handleSelect(l.code, e)}
                onTouchEnd={(e) => handleSelect(l.code, e)}
                className="w-full text-left px-4 flex items-center justify-between gap-2"
                style={{ minHeight: "44px" }}
                data-testid={`button-church-lang-${l.code}`}
              >
                <span className={l.code === current ? "font-semibold text-primary" : "text-gray-700"}>{l.label}</span>
                {l.code === current && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ChurchModeShell({ church, currentRole, children, unreadMessages = 0, pendingMembers }: ChurchModeShellProps) {
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { currentSong } = useMusicPlayer();

  const slug = church?.slug;
  const isAdmin = ADMIN_ROLES.includes(currentRole ?? "");
  const isLeader = LEADER_ROLES.includes(currentRole ?? "");

  // Live pending-count query — runs in the shell so every Church Mode page shows a live badge
  const { data: pendingCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/churches", church?.id, "pending-count"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token || !church?.id) return { count: 0 };
      const r = await fetch(`/api/churches/${church.id}/members/pending-count`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : { count: 0 };
    },
    enabled: !!church?.id && isSignedIn && isAdmin,
    refetchInterval: 30000,
  });
  const livePendingCount = pendingMembers ?? pendingCountData?.count ?? 0;
  const isMember = !!currentRole;

  const navItems = slug && isMember ? [
    { label: t("cm_home"), path: `/church/${slug}`, icon: Home },
    { label: t("cm_sermons"), path: `/church/${slug}/sermons`, icon: Mic2 },
    { label: t("cm_announcements"), path: `/church/${slug}/announcements`, icon: Megaphone },
    { label: t("cm_groups"), path: `/church/${slug}/groups`, icon: Users },
    { label: t("cm_departments"), path: `/church/${slug}/departments`, icon: Building2 },
    { label: t("cm_prayer"), path: `/church/${slug}/prayer`, icon: Heart },
    { label: t("cm_giving"), path: `/church/${slug}/giving`, icon: HandCoins },
    { label: t("cm_messages"), path: `/church/${slug}/messages`, icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : 0 },
    ...(isLeader || church?.memberDirectoryEnabled ? [{ label: t("cm_members"), path: `/church/${slug}/members`, icon: Users, badge: livePendingCount > 0 ? livePendingCount : 0 }] : []),
    { label: t("cm_sermonNotes"), path: `/church/${slug}/pastor-notes`, icon: BookText },
    { label: t("cm_myProfile"), path: `/church/${slug}/profile`, icon: UserCircle },
    ...(isAdmin ? [
      { label: t("cm_dashboard"), path: `/church/${slug}/dashboard`, icon: LayoutDashboard },
      { label: t("cm_admin"), path: `/church/${slug}/admin`, icon: Settings },
    ] : []),
  ] : [];

  const roleLabel = currentRole ? (CHURCH_ROLE_LABELS[currentRole as ChurchRole] ?? currentRole) : null;

  const isNavActive = (path: string) => {
    if (path === `/church/${slug}`) return location === path;
    return location.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    setMenuOpen(false);
    setLocation(path);
  };

  const headerBg = church?.themeColor ?? "#1d3461";
  const bright = hexIsBright(headerBg);
  const headerText = bright ? "#1a2744" : "#ffffff";
  const headerTextSecondary = bright ? "#1a274488" : "#ffffffcc";
  const headerAccent = bright ? "#b8962e" : "#d4a83a";
  const headerBorder = bright ? "#1a274418" : "#ffffff1a";
  const navActiveColor = headerAccent;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f4ee" }}>
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='none'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23c9b990' fillOpacity='0.3'/%3E%3Ccircle cx='21' cy='21' r='0.6' fill='%23c9b990' fillOpacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
          zIndex: 0,
        }}
      />

      {/* Hamburger menu backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 100 }}
          onClick={() => setMenuOpen(false)}
          onTouchStart={() => setMenuOpen(false)}
        />
      )}

      <header className="relative" style={{ backgroundColor: headerBg, zIndex: 200 }}>
        {church?.bannerUrl && (
          <div className="w-full h-24 overflow-hidden opacity-30">
            <img src={church.bannerUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {church?.logoUrl ? (
              <img
                src={church.logoUrl}
                alt={church.name}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-md border-2"
                style={{ borderColor: bright ? "#00000018" : "#ffffff22" }}
              />
            ) : (
              <div className="flex-shrink-0"><DefaultEmblem size={52} /></div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className="font-serif font-bold leading-tight tracking-tight"
                  style={{ color: headerText, fontSize: "clamp(22px, 4vw, 34px)" }}
                  data-testid="text-church-name"
                >
                  {church?.name ?? t("cm_churchMode")}
                </h1>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline-flex"
                  style={{ backgroundColor: `${headerAccent}28`, color: headerAccent, border: `1px solid ${headerAccent}50` }}
                >
                  {t("cm_churchMode")}
                </span>
              </div>
              {church?.denomination && (
                <p className="text-sm mt-0.5 truncate font-medium" style={{ color: headerAccent }}>
                  {church.denomination}
                </p>
              )}
              {roleLabel && !church?.denomination && (
                <p className="text-xs mt-0.5 truncate" style={{ color: `${headerAccent}aa` }}>{roleLabel}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {navItems.length > 0 && (
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-all"
                style={{
                  color: menuOpen ? headerText : headerTextSecondary,
                  border: `1px solid ${headerBorder}`,
                  backgroundColor: menuOpen ? (bright ? "#1a274410" : "#ffffff15") : "transparent",
                }}
                aria-label={menuOpen ? t("cm_close") : t("cm_menu")}
                aria-expanded={menuOpen}
                data-testid="button-church-hamburger"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
            <LangPicker headerTextSecondary={headerTextSecondary} headerBorder={headerBorder} />
            <button
              onClick={() => setLocation("/")}
              className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all"
              style={{ color: headerTextSecondary, border: `1px solid ${headerBorder}`, backgroundColor: "transparent" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = bright ? "#1a274410" : "#ffffff15"; (e.currentTarget as HTMLElement).style.color = headerText; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = headerTextSecondary; }}
              data-testid="button-return-to-365"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="hidden sm:inline">365 Daily Devotional</span>
            </button>
          </div>
        </div>

        {/* Hamburger dropdown menu */}
        {menuOpen && navItems.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full"
            style={{
              backgroundColor: headerBg,
              borderTop: `1px solid ${headerBorder}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              zIndex: 200,
              maxHeight: "75vh",
              overflowY: "auto",
            }}
          >
            <nav className="max-w-5xl mx-auto px-2 py-2" data-testid="nav-church-mode">
              {navItems.map(item => {
                const active = isNavActive(item.path);
                const Icon = item.icon;
                const badge = (item as any).badge ?? 0;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className="relative w-full flex items-center gap-3 px-4 rounded-xl transition-all duration-150"
                    style={{
                      minHeight: "48px",
                      color: active ? navActiveColor : headerTextSecondary,
                      backgroundColor: active ? (bright ? "#1a274410" : "#ffffff12") : "transparent",
                      fontWeight: active ? 700 : 500,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = bright ? "#1a274408" : "#ffffff0d"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                    data-testid={`link-church-nav-${item.label.toLowerCase()}`}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                        style={{ backgroundColor: navActiveColor }}
                      />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#e53e3e", color: "#fff" }}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className={`relative flex-grow max-w-5xl mx-auto w-full px-4 pt-6 sm:pt-8 ${currentSong ? "pb-28 sm:pb-32" : "pb-6 sm:pb-8"}`} style={{ zIndex: 10 }}>
        {children}
      </main>

      <footer className="relative py-4 text-center border-t" style={{ borderColor: "#c9b99033", backgroundColor: "#efe8d8", zIndex: 10 }}>
        <p className="text-sm" style={{ color: "#9a9080" }}>
          {t("cm_churchModeOn")}{" "}
          <button onClick={() => setLocation("/")} className="underline hover:opacity-75 transition-opacity font-medium">
            {t("cm_365DailyDevotional")}
          </button>
        </p>
      </footer>
    </div>
  );
}
