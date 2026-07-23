import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Menu, X, Building2, ChevronRight } from "lucide-react";
import type { Church } from "@shared/schema";
import { useI18n } from "@/hooks/useI18n";

interface ChurchPublicShellProps {
  church: Church | null;
  children: React.ReactNode;
}

export function ChurchPublicShell({ church, children }: ChurchPublicShellProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const slug = church?.slug ?? "";
  const base = `/church/${slug}`;
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_ITEMS = [
    { label: t("cm_pub_home"), path: "" },
    { label: t("cm_pub_about"), path: "/about" },
    { label: t("cm_pub_sermons"), path: "/watch" },
    { label: t("cm_pub_events"), path: "/events" },
    { label: t("cm_pub_ministries"), path: "/ministries" },
    { label: t("cm_pub_give"), path: "/give-online" },
    { label: t("cm_pub_contact"), path: "/contact" },
  ];

  const primary = church?.themeColor ?? "#1d3461";
  const currentSuffix = location.replace(base, "") || "/";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#fafaf8" }}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: "#fff", borderBottom: "1px solid #ece8e0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Name */}
            <Link href={base} className="flex items-center gap-3 flex-shrink-0">
              {church?.logoUrl ? (
                <img src={church.logoUrl} alt={church.name} className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primary}18` }}>
                  <Building2 className="w-5 h-5" style={{ color: primary }} />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight" style={{ color: primary }}>{church?.name ?? "Church"}</p>
                {church?.denomination && (
                  <p className="text-xs leading-tight" style={{ color: "#9a9080" }}>{church.denomination}</p>
                )}
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map(item => {
                const active = currentSuffix === (item.path || "/") || (item.path && currentSuffix.startsWith(item.path));
                return (
                  <Link key={item.path} href={`${base}${item.path}`}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    style={{ color: active ? primary : "#6b6460", backgroundColor: active ? `${primary}12` : "transparent" }}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2">
              <Link href={`${base}/join-us`}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm"
                style={{ backgroundColor: primary }}>
                {t("cm_pub_joinUs")}
              </Link>
              <Link href={`/church/${slug}`}
                className="px-4 py-2 text-sm font-medium rounded-xl border"
                style={{ borderColor: `${primary}40`, color: primary }}>
                {t("cm_pub_memberLogin")}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2 rounded-lg" onClick={() => setMenuOpen(m => !m)} data-testid="button-mobile-menu">
              {menuOpen ? <X className="w-5 h-5" style={{ color: "#3d3a36" }} /> : <Menu className="w-5 h-5" style={{ color: "#3d3a36" }} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="lg:hidden border-t px-4 py-4 space-y-1" style={{ borderColor: "#ece8e0", backgroundColor: "#fff" }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.path} href={`${base}${item.path}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: "#3d3a36" }}
                onClick={() => setMenuOpen(false)}>
                {item.label}
                <ChevronRight className="w-4 h-4" style={{ color: "#c0b8b0" }} />
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link href={`${base}/join-us`}
                className="text-center py-2.5 text-sm font-semibold rounded-xl text-white"
                style={{ backgroundColor: primary }}
                onClick={() => setMenuOpen(false)}>
                {t("cm_pub_joinUs")}
              </Link>
              <Link href={`/church/${slug}`}
                className="text-center py-2.5 text-sm font-medium rounded-xl border"
                style={{ borderColor: `${primary}40`, color: primary }}
                onClick={() => setMenuOpen(false)}>
                {t("cm_pub_memberLogin")}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t" style={{ backgroundColor: "#111827", borderColor: "#1f2937" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {church?.logoUrl ? (
                  <img src={church.logoUrl} alt={church.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primary}40` }}>
                    <Building2 className="w-5 h-5" style={{ color: primary }} />
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">{church?.name}</p>
                  {church?.denomination && <p className="text-xs" style={{ color: "#9ca3af" }}>{church.denomination}</p>}
                </div>
              </div>
              {church?.description && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#9ca3af" }}>{church.description}</p>
              )}
              {church?.address && (
                <p className="text-xs flex items-start gap-1.5" style={{ color: "#6b7280" }}>
                  <span className="mt-0.5">📍</span>{church.address}
                </p>
              )}
              {/* Social links */}
              {church?.socialLinks && (
                <div className="flex gap-3 mt-4">
                  {church.socialLinks.facebook && (
                    <a href={church.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}>f</a>
                  )}
                  {church.socialLinks.instagram && (
                    <a href={church.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                      className="text-sm w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}>📷</a>
                  )}
                  {church.socialLinks.youtube && (
                    <a href={church.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                      className="text-sm w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}>▶</a>
                  )}
                  {church.socialLinks.twitter && (
                    <a href={church.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}>𝕏</a>
                  )}
                  {church.socialLinks.whatsapp && (
                    <a href={`https://wa.me/${church.socialLinks.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="text-sm w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ backgroundColor: "#1f2937", color: "#9ca3af" }}>💬</a>
                  )}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#6b7280" }}>{t("cm_pub_quickLinks")}</p>
              <div className="space-y-2.5">
                {NAV_ITEMS.slice(1).map(item => (
                  <Link key={item.path} href={`${base}${item.path}`}
                    className="block text-sm transition-colors hover:text-white"
                    style={{ color: "#9ca3af" }}>
                    {item.label}
                  </Link>
                ))}
                <Link href={`${base}/join-us`}
                  className="block text-sm transition-colors hover:text-white"
                  style={{ color: "#9ca3af" }}>
                  {t("cm_pub_joinUs")}
                </Link>
                <Link href={`${base}/visit`}
                  className="block text-sm transition-colors hover:text-white"
                  style={{ color: "#9ca3af" }}>
                  {t("cm_pub_planVisit")}
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#6b7280" }}>{t("cm_pub_contact")}</p>
              <div className="space-y-2.5">
                {church?.email && (
                  <a href={`mailto:${church.email}`} className="block text-sm transition-colors hover:text-white" style={{ color: "#9ca3af" }}>
                    ✉️ {church.email}
                  </a>
                )}
                {church?.phone && (
                  <a href={`tel:${church.phone}`} className="block text-sm transition-colors hover:text-white" style={{ color: "#9ca3af" }}>
                    📞 {church.phone}
                  </a>
                )}
                {church?.websiteUrl && (
                  <a href={church.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="block text-sm transition-colors hover:text-white" style={{ color: "#9ca3af" }}>
                    🌐 {t("cm_pub_officialWebsite")}
                  </a>
                )}
                {church?.pastorName && (
                  <p className="text-sm" style={{ color: "#9ca3af" }}>⛪ {t("cm_pub_pastor")} {church.pastorName}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: "#1f2937" }}>
            <p className="text-xs" style={{ color: "#4b5563" }}>
              © {new Date().getFullYear()} {church?.name}. {t("cm_pub_allRightsReserved")}
            </p>
            <p className="text-xs" style={{ color: "#4b5563" }}>
              {t("cm_pub_poweredBy")} <a href="/" className="transition-colors hover:text-white">365 Daily Devotional</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
