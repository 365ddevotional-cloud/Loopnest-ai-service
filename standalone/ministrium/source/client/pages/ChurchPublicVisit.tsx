import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, MapPin, Clock, CheckCircle } from "lucide-react";

export default function ChurchPublicVisit() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";
  const base = `/church/${slug}`;

  const VISITOR_TIPS = [
    t("cm_tipEarlyArrival"),
    t("cm_tipDressCode"),
    t("cm_tipWelcomeTeam"),
    t("cm_tipChildrenPrograms"),
    t("cm_tipStayAfter"),
    t("cm_tipPressureFree"),
  ];

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_firstVisit")}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_planYourVisit")}</h1>
          <p className="mt-2 text-sm" style={{ color: "#9a9080" }}>{t("cm_visitExcited")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              {church?.serviceTimes && church.serviceTimes.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_whenToCome")}</h2>
                  <div className="space-y-2">
                    {church.serviceTimes.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primary }} />
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{s.day} — {s.time}</p>
                          {s.type && <p className="text-xs" style={{ color: "#9a9080" }}>{s.type}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {church?.address && (
                <div>
                  <h2 className="text-lg font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_whereWeMeet")}</h2>
                  <div className="p-4 rounded-xl border bg-white flex items-start gap-3" style={{ borderColor: "#ece8e0" }}>
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#3d3a36" }}>{church.address}</p>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(church.address)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium mt-1 inline-block" style={{ color: primary }}>
                        {t("cm_getDirections")}
                      </a>
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden border h-52 mt-3" style={{ borderColor: "#ece8e0" }}>
                    <iframe
                      src={church.mapEmbedUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(church.address)}&output=embed`}
                      title="Location" className="w-full h-full" style={{ border: 0 }} loading="lazy" allowFullScreen />
                  </div>
                </div>
              )}

              {church?.visitorInfo && (
                <div>
                  <h2 className="text-lg font-bold mb-3" style={{ color: "#1a1a1a" }}>{t("cm_whatToExpect")}</h2>
                  <p className="text-sm leading-relaxed p-5 rounded-xl bg-white border" style={{ color: "#6b6460", borderColor: "#ece8e0" }}>
                    {church.visitorInfo}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-4" style={{ color: "#1a1a1a" }}>{t("cm_tipsForFirstTimers")}</h2>
                <div className="space-y-3">
                  {VISITOR_TIPS.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                      <p className="text-sm" style={{ color: "#6b6460" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: `${primary}06` }}>
                <p className="font-semibold text-sm mb-3" style={{ color: "#1a1a1a" }}>{t("cm_haveQuestions")}</p>
                <p className="text-xs mb-4" style={{ color: "#9a9080" }}>{t("cm_happyToAnswer")}</p>
                <div className="space-y-2">
                  {church?.phone && (
                    <a href={`tel:${church.phone}`} className="block text-sm font-medium" style={{ color: primary }}>
                      📞 {church.phone}
                    </a>
                  )}
                  {church?.email && (
                    <a href={`mailto:${church.email}`} className="block text-sm font-medium" style={{ color: primary }}>
                      ✉️ {church.email}
                    </a>
                  )}
                </div>
                <Link href={`${base}/contact`}
                  className="inline-block mt-4 px-5 py-2.5 text-sm font-semibold rounded-xl text-white"
                  style={{ backgroundColor: primary }}
                  data-testid="button-contact-us">
                  {t("cm_contactUsHeading")}
                </Link>
              </div>

              <div className="p-6 rounded-2xl border bg-white text-center" style={{ borderColor: "#ece8e0" }}>
                <p className="font-bold text-base mb-2" style={{ color: "#1a1a1a" }}>{t("cm_readyToBeMember")}</p>
                <p className="text-xs mb-4" style={{ color: "#9a9080" }}>{t("cm_joinFaithTogether")}</p>
                <Link href={`${base}/join-us`}
                  className="inline-block px-6 py-3 text-sm font-semibold rounded-xl text-white"
                  style={{ backgroundColor: primary }}
                  data-testid="button-join-now">
                  {t("cm_joinOurChurch")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChurchPublicShell>
  );
}
