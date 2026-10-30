import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Users, CheckCircle } from "lucide-react";

export default function ChurchPublicJoin() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });
  const [code, setCode] = useState("");

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";

  const BENEFITS = [
    t("cm_benefitExclusiveContent"),
    t("cm_benefitMinistries"),
    t("cm_benefitPrayerNetwork"),
    t("cm_benefitAnnouncements"),
    t("cm_benefitConnect"),
    t("cm_benefitGiving"),
  ];

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${primary}12` }}>
            <Users className="w-8 h-8" style={{ color: primary }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_membershipLabel")}</p>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#1a1a1a" }}>
            {isLoading ? t("cm_joinOurChurch") : `${t("cm_join")} ${church?.name ?? t("cm_joinOurChurch")}`}
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#6b6460" }}>{t("cm_becomeAMember")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold mb-4" style={{ color: "#3d3a36" }}>{t("cm_memberBenefits")}</p>
            <div className="space-y-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28a745" }} />
                  <p className="text-sm" style={{ color: "#6b6460" }}>{b}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>{t("cm_haveInviteCode")}</p>
              <p className="text-xs mb-4" style={{ color: "#9a9080" }}>{t("cm_membersCanInvite")}</p>
              <div className="flex gap-2">
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder={t("cm_enterCode")} maxLength={10}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none font-mono uppercase tracking-widest"
                  style={{ borderColor: "#ece8e0" }}
                  data-testid="input-invite-code" />
                <Link href={`/church/join/${code}`}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white flex-shrink-0"
                  style={{ backgroundColor: code.length > 0 ? primary : "#c0b8b0", pointerEvents: code.length === 0 ? "none" : "auto" }}
                  data-testid="button-use-code">
                  {t("cm_join")}
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>
                {church?.approvalMode === "auto_approve" ? t("cm_openMembership") : t("cm_requestToJoin")}
              </p>
              <p className="text-xs mb-4" style={{ color: "#9a9080" }}>
                {church?.approvalMode === "auto_approve"
                  ? t("cm_openMembershipDesc")
                  : t("cm_approvalMembershipDesc")}
              </p>
              <Link href="/signin"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-xl text-white"
                style={{ backgroundColor: primary }}
                data-testid="button-join-signup">
                <Users className="w-4 h-4" />
                {church?.approvalMode === "auto_approve" ? t("cm_joinInstantly") : t("cm_requestMembership")}
              </Link>
            </div>

            <div className="p-5 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#9a9080" }}>{t("cm_questionsAboutJoining")}</p>
              <Link href={`/church/${slug}/contact`} className="text-sm font-medium" style={{ color: primary }}>
                {t("cm_contactUsArrow")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ChurchPublicShell>
  );
}
