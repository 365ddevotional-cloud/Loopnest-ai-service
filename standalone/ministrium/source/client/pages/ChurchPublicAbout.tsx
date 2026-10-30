import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Clock } from "lucide-react";

export default function ChurchPublicAbout() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";
  const base = `/church/${slug}`;

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_ourStory")}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>
            {t("cm_aboutUs")} {church?.name ?? ""}
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : (
          <>
            {(church?.bannerUrl || church?.websiteHeroImage) && (
              <div className="rounded-2xl overflow-hidden mb-10 aspect-video max-h-64">
                <img src={church.bannerUrl ?? church.websiteHeroImage} alt={church.name}
                  className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {church?.denomination && (
                <div className="p-5 rounded-2xl border bg-white text-center" style={{ borderColor: "#ece8e0" }}>
                  <p className="text-2xl mb-2">⛪</p>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_denominationLabel")}</p>
                  <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{church.denomination}</p>
                </div>
              )}
              {church?.pastorName && (
                <div className="p-5 rounded-2xl border bg-white text-center" style={{ borderColor: "#ece8e0" }}>
                  <p className="text-2xl mb-2">👤</p>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_leadPastor")}</p>
                  <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{church.pastorName}</p>
                </div>
              )}
              {church?.address && (
                <div className="p-5 rounded-2xl border bg-white text-center" style={{ borderColor: "#ece8e0" }}>
                  <p className="text-2xl mb-2">📍</p>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9080" }}>{t("cm_locationLabel")}</p>
                  <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{church.address}</p>
                </div>
              )}
            </div>

            {church?.description && (
              <div className="mb-10">
                <h2 className="text-xl font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_whoWeAre")}</h2>
                <p className="text-base leading-loose" style={{ color: "#6b6460" }}>{church.description}</p>
              </div>
            )}

            {(church?.missionStatement || church?.vision) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {church.missionStatement && (
                  <div className="p-6 rounded-2xl border-l-4" style={{ backgroundColor: `${primary}06`, borderColor: primary }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: primary }}>{t("cm_ourMission")}</p>
                    <p className="text-base leading-relaxed" style={{ color: "#3d3a36" }}>{church.missionStatement}</p>
                  </div>
                )}
                {church.vision && (
                  <div className="p-6 rounded-2xl border-l-4" style={{ backgroundColor: "#b8962e08", borderColor: "#b8962e" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#b8962e" }}>{t("cm_ourVision")}</p>
                    <p className="text-base leading-relaxed" style={{ color: "#3d3a36" }}>{church.vision}</p>
                  </div>
                )}
              </div>
            )}

            {church?.serviceTimes && church.serviceTimes.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-5" style={{ color: "#1a1a1a" }}>{t("cm_serviceTimes")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {church.serviceTimes.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                      <Clock className="w-5 h-5 flex-shrink-0" style={{ color: primary }} />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{s.day} — {s.time}</p>
                        {s.type && <p className="text-xs" style={{ color: "#9a9080" }}>{s.type}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {church?.visitorInfo && (
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_planningVisit")}</h2>
                <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <p className="text-sm leading-loose" style={{ color: "#6b6460" }}>{church.visitorInfo}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-6 border-t" style={{ borderColor: "#ece8e0" }}>
              <Link href={`${base}/visit`}
                className="px-6 py-3 text-sm font-semibold rounded-xl text-white"
                style={{ backgroundColor: primary }}>
                {t("cm_planAVisit")}
              </Link>
              <Link href={`${base}/contact`}
                className="px-6 py-3 text-sm font-semibold rounded-xl border"
                style={{ borderColor: primary, color: primary }}>
                {t("cm_contactUsHeading")}
              </Link>
              <Link href={`${base}/join-us`}
                className="px-6 py-3 text-sm font-semibold rounded-xl border"
                style={{ borderColor: "#ece8e0", color: "#6b6460" }}>
                {t("cm_joinOurChurch")}
              </Link>
            </div>
          </>
        )}
      </div>
    </ChurchPublicShell>
  );
}
