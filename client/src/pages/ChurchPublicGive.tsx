import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Heart, Shield, CreditCard } from "lucide-react";

export default function ChurchPublicGive() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${primary}12` }}>
            <Heart className="w-8 h-8" style={{ color: primary }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_givePageTitle")}</p>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#1a1a1a" }}>{t("cm_supportMinistryHeading")}</h1>
          <p className="text-base max-w-lg mx-auto" style={{ color: "#6b6460" }}>
            {t("cm_givingGenerosity")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : (
          <>
            <div className="p-6 rounded-2xl mb-8 text-center" style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}20` }}>
              <p className="text-base italic font-medium mb-2" style={{ color: "#3d3a36" }}>
                "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
              </p>
              <p className="text-xs font-semibold" style={{ color: primary }}>2 Corinthians 9:7</p>
            </div>

            <div className="space-y-4 mb-10">
              <p className="text-sm font-semibold" style={{ color: "#3d3a36" }}>{t("cm_waysToGive")}</p>

              <div className="p-5 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primary}10` }}>
                    <CreditCard className="w-5 h-5" style={{ color: primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>{t("cm_givePublic")}</p>
                    <p className="text-xs mb-3" style={{ color: "#9a9080" }}>{t("cm_giveOnlineDesc")}</p>
                    <a href={`/church/${slug}/giving`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white"
                      style={{ backgroundColor: primary }}
                      data-testid="button-give-now">
                      <Heart className="w-4 h-4" /> {t("cm_giveNowButton")}
                    </a>
                  </div>
                </div>
              </div>

              {church?.address && (
                <div className="p-5 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#b8962e12" }}>
                      <span className="text-lg">🏦</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>{t("cm_giveInPerson")}</p>
                      <p className="text-xs" style={{ color: "#9a9080" }}>
                        {t("cm_giveInPerson")} — {church.address}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {church?.email && (
                <div className="p-5 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#28a74512" }}>
                      <span className="text-lg">✉️</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>{t("cm_givingEnquiries")}</p>
                      <a href={`mailto:${church.email}`} className="text-xs font-medium" style={{ color: primary }}>
                        {church.email}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 py-6 border-t" style={{ borderColor: "#ece8e0" }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: "#9a9080" }}>
                <Shield className="w-4 h-4" /> {t("cm_secureEncrypted")}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "#9a9080" }}>
                <Heart className="w-4 h-4" /> {t("cm_taxDeductible")}
              </div>
            </div>
          </>
        )}
      </div>
    </ChurchPublicShell>
  );
}
