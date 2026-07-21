import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Church } from "@shared/schema";
import { CHURCH_ROLE_LABELS, type ChurchRole } from "@shared/schema";
import { Home, Mic2, Megaphone, Users, Heart, Shield, Settings, ChevronRight } from "lucide-react";

interface ChurchModeShellProps {
  church: Church | null;
  currentRole: string | null;
  children: React.ReactNode;
}

function DefaultEmblem({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="44" height="44" rx="10" fill="#b8962e" fillOpacity="0.15" />
      <rect x="20" y="6" width="4" height="26" rx="2" fill="#b8962e" />
      <rect x="13" y="13" width="18" height="4" rx="2" fill="#b8962e" />
      <rect x="16" y="25" width="12" height="13" rx="2" fill="#b8962e" fillOpacity="0.5" />
      <rect x="20" y="25" width="4" height="13" rx="0" fill="#b8962e" fillOpacity="0.25" />
    </svg>
  );
}

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
const MINISTRY_ROLES = [...ADMIN_ROLES, "ministry_leader", "group_leader"];

export function ChurchModeShell({ church, currentRole, children }: ChurchModeShellProps) {
  const [location, setLocation] = useLocation();

  const slug = church?.slug;
  const isAdmin = ADMIN_ROLES.includes(currentRole ?? "");
  const isMember = !!currentRole;

  const navItems = slug && isMember ? [
    { label: "Home", path: `/church/${slug}`, icon: Home },
    { label: "Sermons", path: `/church/${slug}/sermons`, icon: Mic2 },
    { label: "Announcements", path: `/church/${slug}/announcements`, icon: Megaphone },
    { label: "Groups", path: `/church/${slug}/groups`, icon: Users },
    { label: "Prayer", path: `/church/${slug}/prayer`, icon: Heart },
    { label: "Members", path: `/church/${slug}/members`, icon: Shield },
    ...(isAdmin ? [{ label: "Admin", path: `/church/${slug}/admin`, icon: Settings }] : []),
  ] : [];

  const roleLabel = currentRole ? (CHURCH_ROLE_LABELS[currentRole as ChurchRole] ?? currentRole) : null;

  const isNavActive = (path: string) => {
    if (path === `/church/${slug}`) return location === path;
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8f4ee" }}>
      {/* Subtle linen texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='none'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23c9b990' fillOpacity='0.3'/%3E%3Ccircle cx='21' cy='21' r='0.6' fill='%23c9b990' fillOpacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header className="relative z-10" style={{ backgroundColor: "#1a2744" }}>
        {/* Top strip */}
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {church?.logoUrl ? (
              <img src={church.logoUrl} alt={church.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 shadow-sm border border-white/15" />
            ) : (
              <div className="flex-shrink-0"><DefaultEmblem size={44} /></div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-xl font-semibold leading-snug" style={{ color: "#f5ede0" }}>
                  {church?.name ?? "Church Mode"}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ backgroundColor: "#b8962e20", color: "#d4a83a", border: "1px solid #b8962e40" }}>
                  Church Mode
                </span>
              </div>
              {church?.denomination && (
                <p className="text-xs mt-0.5 truncate" style={{ color: "#b8962e" }}>{church.denomination}</p>
              )}
              {roleLabel && !church?.denomination && (
                <p className="text-xs mt-0.5 truncate" style={{ color: "#b8962e" }}>{roleLabel}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setLocation("/")}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{ color: "#f5ede0aa", border: "1px solid #ffffff20" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff12"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            data-testid="button-return-to-365"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            <span className="hidden sm:inline">365 Daily Devotional</span>
            <span className="sm:hidden">Home</span>
          </button>
        </div>

        {/* Navigation bar */}
        {navItems.length > 0 && (
          <div className="border-t" style={{ borderColor: "#ffffff14" }}>
            <nav className="max-w-5xl mx-auto px-2 flex items-center overflow-x-auto scrollbar-hide" data-testid="nav-church-mode">
              {navItems.map(item => {
                const active = isNavActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-all duration-150 border-b-2 flex-shrink-0 whitespace-nowrap",
                      active ? "border-[#d4a83a]" : "border-transparent"
                    )}
                    style={{ color: active ? "#d4a83a" : "#f5ede070" }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#f5ede0c0"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#f5ede070"; }}
                    data-testid={`link-church-nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center border-t" style={{ borderColor: "#c9b99033", backgroundColor: "#efe8d8" }}>
        <p className="text-xs" style={{ color: "#9a9080" }}>
          Church Mode on{" "}
          <button onClick={() => setLocation("/")} className="underline hover:opacity-75 transition-opacity">
            365 Daily Devotional
          </button>
        </p>
      </footer>
    </div>
  );
}
