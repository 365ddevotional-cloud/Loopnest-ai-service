import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Play, Calendar, Users, MapPin, Phone, Mail, Heart, ArrowRight, Share2, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/useI18n";

const SECTION_ORDER = ["hero","serviceTimes","about","sermons","events","ministries","announcements","gallery","prayer","give","contact","join"];

function SEOHead({ church, slug }: { church: any; slug: string }) {
  useEffect(() => {
    const title = `${church.name}${church.denomination ? ` — ${church.denomination}` : ""} | 365 Daily Devotional`;
    const desc = church.welcomeMessage || church.description || `Welcome to ${church.name}. Join our community of faith.`;
    document.title = title;
    const setMeta = (name: string, content: string, prop?: boolean) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        prop ? el.setAttribute("property", name) : el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "website", true);
    setMeta("og:url", `${window.location.origin}/church/${slug}`, true);
    if (church.bannerUrl || church.logoUrl) setMeta("og:image", church.bannerUrl ?? church.logoUrl, true);
    const schema = {
      "@context": "https://schema.org",
      "@type": "Church",
      name: church.name,
      description: desc,
      url: `${window.location.origin}/church/${slug}`,
      ...(church.address && { address: { "@type": "PostalAddress", streetAddress: church.address } }),
      ...(church.phone && { telephone: church.phone }),
      ...(church.email && { email: church.email }),
      ...(church.logoUrl && { logo: church.logoUrl }),
    };
    let schemaEl = document.querySelector("#church-schema") as HTMLScriptElement | null;
    if (!schemaEl) {
      schemaEl = document.createElement("script");
      schemaEl.id = "church-schema";
      schemaEl.type = "application/ld+json";
      document.head.appendChild(schemaEl);
    }
    schemaEl.textContent = JSON.stringify(schema);
    return () => { document.title = "365 Daily Devotional"; };
  }, [church, slug]);
  return null;
}

export default function ChurchPublicHome() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { t } = useI18n();
  const [prayerForm, setPrayerForm] = useState({ name: "", email: "", request: "" });
  const [prayerSent, setPrayerSent] = useState(false);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/public/churches/${slug}`],
  });

  const prayerMutation = useMutation({
    mutationFn: (body: typeof prayerForm) =>
      apiRequest("POST", `/api/public/churches/${slug}/prayer`, body),
    onSuccess: () => { setPrayerSent(true); setPrayerForm({ name: "", email: "", request: "" }); },
    onError: () => toast({ title: t("cm_error"), description: t("cm_prayerSubmitError"), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#b8962e" }} />
      </div>
    );
  }
  if (error || !data?.church) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <div className="text-4xl">⛪</div>
        <h1 className="text-xl font-bold" style={{ color: "#3d3a36" }}>{t("cm_pub_churchNotFound")}</h1>
        <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_pub_churchPageInactive")}</p>
        <Link href="/church" className="text-sm font-medium" style={{ color: "#b8962e" }}>{t("cm_pub_browseChurches")}</Link>
      </div>
    );
  }

  const { church, recentSermons = [], recentAnnouncements = [], departments = [] } = data;
  const primary = church.themeColor ?? "#1d3461";
  const base = `/church/${slug}`;

  const sections = church.homepageSections?.sort((a: any, b: any) => a.order - b.order) ??
    SECTION_ORDER.map((id, i) => ({ id, enabled: true, order: i }));

  const isEnabled = (id: string) => sections.find((s: any) => s.id === id)?.enabled !== false;

  return (
    <>
      <SEOHead church={church} slug={slug!} />
      <ChurchPublicShell church={church}>
        {/* ── HERO ─────────────────────────────────────────── */}
        {isEnabled("hero") && (
          <section className="relative overflow-hidden" style={{ minHeight: 480 }}>
            {/* Background */}
            {(church.websiteHeroImage || church.bannerUrl) ? (
              <div className="absolute inset-0">
                <img src={church.websiteHeroImage ?? church.bannerUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${primary}cc 0%, ${primary}ee 100%)` }} />
              </div>
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }} />
            )}

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
              {church.logoUrl && (
                <img src={church.logoUrl} alt={church.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6 shadow-xl border-4 border-white/30" />
              )}
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 leading-tight" data-testid="text-church-name">
                {church.name}
              </h1>
              {church.denomination && (
                <p className="text-base sm:text-lg mb-4 font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{church.denomination}</p>
              )}
              {church.pastorName && (
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>{t("cm_pub_ledByPastor")} {church.pastorName}</p>
              )}
              <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
                {church.welcomeMessage ?? church.description ?? ""}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href={`${base}/visit`} className="px-6 py-3 text-sm font-semibold rounded-xl bg-white"
                  style={{ color: primary }}>
                  {t("cm_pub_planVisit")}
                </Link>
                <Link href={`${base}/watch`} className="px-6 py-3 text-sm font-semibold rounded-xl border-2 border-white text-white flex items-center gap-2">
                  <Play className="w-4 h-4" /> {t("cm_pub_watchOnline")}
                </Link>
                <Link href={`${base}/give-online`} className="px-6 py-3 text-sm font-semibold rounded-xl text-white" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                  {t("cm_pub_give")}
                </Link>
              </div>
              {church.address && (
                <p className="mt-6 text-sm flex items-center justify-center gap-1.5 text-white/70">
                  <MapPin className="w-4 h-4" />{church.address}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── SERVICE TIMES ─────────────────────────────────── */}
        {isEnabled("serviceTimes") && church.serviceTimes && church.serviceTimes.length > 0 && (
          <section className="py-10 border-b" style={{ backgroundColor: "#fff", borderColor: "#ece8e0" }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className="text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#9a9080" }}>
                {t("cm_pub_joinUsForWorship")}
              </h2>
              <div className="flex flex-wrap justify-center gap-4">
                {church.serviceTimes.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ borderColor: "#ece8e0" }}
                    data-testid={`card-service-time-${i}`}>
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primary }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#3d3a36" }}>{s.day} — {s.time}</p>
                      {s.type && <p className="text-xs" style={{ color: "#9a9080" }}>{s.type}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ABOUT ─────────────────────────────────────────── */}
        {isEnabled("about") && (church.description || church.missionStatement || church.vision) && (
          <section className="py-16" style={{ backgroundColor: "#fafaf8" }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: primary }}>{t("cm_pub_aboutUs")}</p>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: "#1a1a1a" }}>
                    {church.denomination ? `A ${church.denomination} Church` : church.name}
                  </h2>
                  {church.description && (
                    <p className="text-base leading-relaxed mb-4" style={{ color: "#6b6460" }}>{church.description}</p>
                  )}
                  <Link href={`${base}/about`} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: primary }}>
                    {t("cm_pub_learnMore")} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {church.missionStatement && (
                    <div className="p-5 rounded-xl border-l-4" style={{ backgroundColor: `${primary}08`, borderColor: primary }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: primary }}>{t("cm_pub_mission")}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "#3d3a36" }}>{church.missionStatement}</p>
                    </div>
                  )}
                  {church.vision && (
                    <div className="p-5 rounded-xl border-l-4" style={{ backgroundColor: "#b8962e0a", borderColor: "#b8962e" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#b8962e" }}>{t("cm_pub_vision")}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "#3d3a36" }}>{church.vision}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── LATEST SERMONS ─────────────────────────────────── */}
        {isEnabled("sermons") && recentSermons.length > 0 && (
          <section className="py-16" style={{ backgroundColor: "#fff" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_messages")}</p>
                  <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_latestSermons")}</h2>
                </div>
                <Link href={`${base}/watch`} className="text-sm font-medium flex items-center gap-1" style={{ color: primary }}>
                  {t("cm_pub_viewAll")} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentSermons.slice(0, 3).map((s: any) => (
                  <Link key={s.id} href={`${base}/watch`}
                    className="group rounded-2xl border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    style={{ borderColor: "#ece8e0" }}
                    data-testid={`card-sermon-${s.id}`}>
                    <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: `${primary}18` }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-10 h-10" style={{ color: `${primary}50` }} />
                        </div>
                      )}
                      {(s.videoUrl || s.audioUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 ml-0.5" style={{ color: primary }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: "#1a1a1a" }}>{s.title}</p>
                      {s.speakerName && <p className="text-xs mb-1" style={{ color: "#9a9080" }}>{s.speakerName}</p>}
                      {s.bibleReference && <p className="text-xs font-medium" style={{ color: primary }}>{s.bibleReference}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ANNOUNCEMENTS ─────────────────────────────────── */}
        {isEnabled("announcements") && recentAnnouncements.length > 0 && (
          <section className="py-16" style={{ backgroundColor: "#fafaf8" }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_updates")}</p>
                  <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_announcements")}</h2>
                </div>
              </div>
              <div className="space-y-4">
                {recentAnnouncements.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="p-5 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}
                    data-testid={`card-announcement-${a.id}`}>
                    <div className="flex items-start gap-3">
                      {a.isPinned && <span className="mt-0.5 text-base">📌</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{a.title}</p>
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: "#6b6460" }}>{a.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── MINISTRIES ─────────────────────────────────────── */}
        {isEnabled("ministries") && departments.length > 0 && (
          <section className="py-16" style={{ backgroundColor: "#fff" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_getInvolved")}</p>
                  <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_ministriesDepts")}</h2>
                </div>
                <Link href={`${base}/ministries`} className="text-sm font-medium flex items-center gap-1" style={{ color: primary }}>
                  {t("cm_pub_viewAll")} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.slice(0, 6).map((d: any) => (
                  <div key={d.id} className="p-5 rounded-xl border hover:shadow-sm transition-shadow"
                    style={{ borderColor: "#ece8e0" }}
                    data-testid={`card-ministry-${d.id}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${primary}12` }}>
                      <Users className="w-5 h-5" style={{ color: primary }} />
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>{d.name}</p>
                    {d.description && <p className="text-xs line-clamp-2" style={{ color: "#9a9080" }}>{d.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── GALLERY ────────────────────────────────────────── */}
        {isEnabled("gallery") && church.publicPhotos && church.publicPhotos.length > 0 && (
          <section className="py-16" style={{ backgroundColor: "#fafaf8" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_photos")}</p>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_churchGallery")}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {church.publicPhotos.slice(0, 8).map((url: string, i: number) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden" data-testid={`img-gallery-${i}`}>
                    <img src={url} alt={`${church.name} ${i + 1}`} loading="lazy"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── PRAYER REQUEST ─────────────────────────────────── */}
        {isEnabled("prayer") && (
          <section className="py-16" style={{ backgroundColor: "#fff" }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primary}12` }}>
                  <Heart className="w-7 h-7" style={{ color: primary }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_prayer")}</p>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_submitPrayerRequest")}</h2>
                <p className="text-sm mt-2" style={{ color: "#9a9080" }}>{t("cm_pub_prayerDesc")}</p>
              </div>
              {prayerSent ? (
                <div className="text-center p-8 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
                  <div className="text-4xl mb-3">🙏</div>
                  <p className="font-semibold" style={{ color: "#1a1a1a" }}>{t("cm_pub_thankYouPraying")}</p>
                  <p className="text-sm mt-1" style={{ color: "#9a9080" }}>{t("cm_pub_requestReceived")}</p>
                  <button onClick={() => setPrayerSent(false)} className="mt-4 text-sm font-medium" style={{ color: primary }}>
                    {t("cm_pub_submitAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); prayerMutation.mutate(prayerForm); }}
                  className="space-y-4" data-testid="form-prayer-request">
                  <input value={prayerForm.name} onChange={e => setPrayerForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t("cm_pub_yourName")} required
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                    style={{ borderColor: "#ece8e0" }}
                    data-testid="input-prayer-name" />
                  <input value={prayerForm.email} onChange={e => setPrayerForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={t("cm_pub_emailOptional")} type="email"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#ece8e0" }}
                    data-testid="input-prayer-email" />
                  <textarea value={prayerForm.request} onChange={e => setPrayerForm(f => ({ ...f, request: e.target.value }))}
                    placeholder={t("cm_pub_sharePrayer")} required rows={4}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: "#ece8e0" }}
                    data-testid="input-prayer-request" />
                  <button type="submit" disabled={prayerMutation.isPending}
                    className="w-full py-3 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: primary }}
                    data-testid="button-submit-prayer">
                    {prayerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                    {t("cm_pub_sendPrayerRequest")}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* ── GIVE ONLINE ────────────────────────────────────── */}
        {isEnabled("give") && (
          <section className="py-16" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-white/70">{t("cm_pub_supportMinistry")}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t("cm_pub_giveOnline")}</h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                {t("cm_pub_giveDesc")}
              </p>
              <Link href={`${base}/give-online`}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-xl bg-white"
                style={{ color: primary }}
                data-testid="button-give-online">
                <Heart className="w-4 h-4" /> {t("cm_pub_giveNow")}
              </Link>
            </div>
          </section>
        )}

        {/* ── CONTACT & MAP ─────────────────────────────────── */}
        {isEnabled("contact") && (church.address || church.phone || church.email || church.mapEmbedUrl) && (
          <section className="py-16" style={{ backgroundColor: "#fafaf8" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-10">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_pub_findUs")}</p>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_pub_contactLocation")}</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  {church.address && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border" style={{ borderColor: "#ece8e0" }}>
                      <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#9a9080" }}>{t("cm_pub_addressLabel")}</p>
                        <p className="text-sm" style={{ color: "#3d3a36" }}>{church.address}</p>
                      </div>
                    </div>
                  )}
                  {church.phone && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border" style={{ borderColor: "#ece8e0" }}>
                      <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#9a9080" }}>{t("cm_pub_phoneLabel")}</p>
                        <a href={`tel:${church.phone}`} className="text-sm font-medium" style={{ color: primary }}>{church.phone}</a>
                      </div>
                    </div>
                  )}
                  {church.email && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border" style={{ borderColor: "#ece8e0" }}>
                      <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#9a9080" }}>{t("cm_pub_emailLabel")}</p>
                        <a href={`mailto:${church.email}`} className="text-sm font-medium" style={{ color: primary }}>{church.email}</a>
                      </div>
                    </div>
                  )}
                  <Link href={`${base}/contact`}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium w-fit"
                    style={{ borderColor: primary, color: primary }}>
                    <Mail className="w-4 h-4" /> {t("cm_pub_sendMessage")}
                  </Link>
                </div>
                {church.mapEmbedUrl ? (
                  <div className="rounded-2xl overflow-hidden border h-72 lg:h-auto" style={{ borderColor: "#ece8e0" }}>
                    <iframe src={church.mapEmbedUrl} title="Church location" className="w-full h-full" style={{ border: 0 }} loading="lazy" allowFullScreen />
                  </div>
                ) : church.address ? (
                  <div className="rounded-2xl overflow-hidden border h-72 lg:h-auto" style={{ borderColor: "#ece8e0" }}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(church.address)}&output=embed`}
                      title="Church location" className="w-full h-full" style={{ border: 0 }} loading="lazy" allowFullScreen />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {/* ── JOIN CHURCH ─────────────────────────────────────── */}
        {isEnabled("join") && (
          <section className="py-16" style={{ backgroundColor: "#fff" }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: `${primary}12` }}>
                <Users className="w-8 h-8" style={{ color: primary }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: primary }}>{t("cm_pub_community")}</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_pub_becomePartFamily")}</h2>
              <p className="mb-8 max-w-xl mx-auto" style={{ color: "#6b6460" }}>
                {t("cm_pub_joinFamilyDesc")}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href={`${base}/join-us`}
                  className="px-8 py-3.5 text-sm font-semibold rounded-xl text-white"
                  style={{ backgroundColor: primary }}
                  data-testid="button-join-church">
                  {t("cm_pub_joinOurChurch")}
                </Link>
                <Link href={`${base}/visit`}
                  className="px-8 py-3.5 text-sm font-semibold rounded-xl border"
                  style={{ borderColor: `${primary}40`, color: primary }}>
                  {t("cm_pub_planVisit")}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── SHARE ──────────────────────────────────────────── */}
        <section className="py-8 border-t" style={{ backgroundColor: "#fafaf8", borderColor: "#ece8e0" }}>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: church.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href).then(() =>
                    toast({ title: t("cm_pub_linkCopied"), description: t("cm_pub_sharePageDesc") })
                  );
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium"
              style={{ borderColor: "#ece8e0", color: "#6b6460" }}
              data-testid="button-share-church">
              <Share2 className="w-4 h-4" /> {t("cm_pub_shareChurchPage")}
            </button>
          </div>
        </section>
      </ChurchPublicShell>
    </>
  );
}
