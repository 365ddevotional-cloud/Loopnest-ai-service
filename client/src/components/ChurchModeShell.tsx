import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Church } from "@shared/schema";
import { CHURCH_ROLE_LABELS, type ChurchRole } from "@shared/schema";

interface ChurchModeShellProps {
  church: Church | null;
  currentRole: string | null;
  children: React.ReactNode;
}

function DefaultEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#b8962e" fillOpacity="0.18" />
      <rect x="18.5" y="6" width="3" height="24" rx="1.5" fill="#b8962e" />
      <rect x="12" y="12.5" width="16" height="3" rx="1.5" fill="#b8962e" />
      <rect x="15" y="22" width="10" height="12" rx="2" fill="#b8962e" fillOpacity="0.5" />
      <rect x="18.5" y="22" width="3" height="12" rx="0" fill="#b8962e" fillOpacity="0.3" />
    </svg>
  );
}

export function ChurchModeShell({ church, currentRole, children }: ChurchModeShellProps) {
  const [location, setLocation] = useLocation();

  const slug = church?.slug;
  const isAdmin = currentRole === "owner" || currentRole === "administrator" || currentRole === "lead_pastor";

  const navItems = [
    { label: "Home", path: `/church/${slug}` },
    { label: "Members", path: `/church/${slug}/members` },
    ...(isAdmin ? [{ label: "Administration", path: `/church/${slug}/admin` }] : []),
  ];

  const roleLabel = currentRole ? (CHURCH_ROLE_LABELS[currentRole as ChurchRole] ?? currentRole) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5efe6" }}>
      {/* Subtle geometric texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23b8962e' strokeWidth='0.3' strokeOpacity='0.12'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
          zIndex: 0,
        }}
      />

      {/* Church Mode Header */}
      <header className="relative z-10 shadow-md" style={{ backgroundColor: "#1a2744" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {church?.logoUrl ? (
              <img src={church.logoUrl} alt={church.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/20" />
            ) : (
              <div className="flex-shrink-0"><DefaultEmblem size={40} /></div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-lg font-semibold leading-tight truncate" style={{ color: "#faf6f0" }}>
                  {church?.name ?? "Church Mode"}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ backgroundColor: "#b8962e22", color: "#d4a83a", border: "1px solid #b8962e44" }}
                >
                  Church Mode
                </span>
              </div>
              {roleLabel && (
                <p className="text-xs mt-0.5" style={{ color: "#b8962e" }}>{roleLabel}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setLocation("/")}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#faf6f0aa", border: "1px solid #ffffff22" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff15"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            data-testid="button-return-to-365"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            365 Daily Devotional
          </button>
        </div>

        {/* Internal navigation */}
        {slug && (
          <div className="border-t" style={{ borderColor: "#ffffff18" }}>
            <nav className="max-w-5xl mx-auto px-4 flex items-center gap-0 overflow-x-auto" data-testid="nav-church-mode">
              {navItems.map(item => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 flex-shrink-0",
                      isActive
                        ? "border-[#b8962e]"
                        : "border-transparent"
                    )}
                    style={{
                      color: isActive ? "#d4a83a" : "#faf6f088",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#faf6f0cc"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#faf6f088"; }}
                    data-testid={`link-church-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer strip */}
      <footer className="relative z-10 py-4 text-center border-t" style={{ borderColor: "#c9b99044", backgroundColor: "#f0e8d8" }}>
        <p className="text-xs" style={{ color: "#9a9490" }}>
          Church Mode · <button onClick={() => setLocation("/")} className="underline hover:opacity-80">Return to 365 Daily Devotional</button>
        </p>
      </footer>
    </div>
  );
}
