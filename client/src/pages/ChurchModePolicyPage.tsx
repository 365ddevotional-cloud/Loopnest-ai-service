import { useI18n } from "@/hooks/useI18n";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ChurchModePolicyPage() {
  const { t } = useI18n();

  const sections = [
    {
      title: t("cm_policyPlatformTech"),
      body: `365 Daily Devotional ("the Platform") is a technology service that provides tools for churches and faith-based organizations ("Organizations") to manage their communities, share content, and communicate with members. The Platform is not a church, denomination, theological institution, or regulatory body. We make no endorsements regarding the theology, doctrine, governance structure, or financial practices of any Organization registered on the Platform.`,
    },
    {
      title: t("cm_policyApproval"),
      body: `All new Organizations begin in a pending review state. Platform administrators review new applications to confirm that basic information is accurate and complete, and that the Organization's stated purpose is consistent with our usage terms. Approval means only that the Organization passed this review — it is not an accreditation, certification, or guarantee. The Platform reserves the right to request additional information, extend review timelines, or decline applications at its sole discretion.`,
    },
    {
      title: t("cm_policyOrgResponsibility"),
      body: `Organizations are solely responsible for all content, communications, financial transactions, pastoral decisions, member safety, and legal compliance within their community spaces on the Platform. The Platform provides tools only and does not supervise, monitor, or control the day-to-day operations of any Organization. Organization leaders must ensure their use of the Platform complies with applicable laws, including data privacy, consumer protection, and tax laws in their jurisdiction.`,
    },
    {
      title: t("cm_policyFairProcess"),
      body: `When a compliance concern is raised, the Platform will open a compliance case and notify the Organization. The Organization will be given an opportunity to review the concern and submit a response or evidence. The Platform will investigate and communicate findings. Enforcement decisions are made by Platform administrators after reviewing all available information. The Platform aims to handle compliance cases promptly and fairly, but makes no guarantees about investigation timelines.`,
    },
    {
      title: t("cm_policyAppeals"),
      body: `Organizations that receive an enforcement action (including suspension or removal) have the right to submit a formal appeal through their Administration panel. Appeals should explain why the enforcement action was incorrect, provide any new evidence, and describe steps taken to remedy the issue. Appeals are reviewed by Platform administrators, and their decision is final. Organizations are encouraged to engage constructively and professionally throughout the appeal process.`,
    },
    {
      title: t("cm_policySuspension"),
      body: `The Platform may temporarily suspend or permanently remove an Organization's access in cases of serious or repeated violations of our usage terms, credible reports of harm to members, fraudulent misrepresentation, or non-compliance with legal requirements. Suspension restricts public access and invitations while the matter is investigated or resolved. Permanent removal ("archiving") terminates the Organization's access to Church Mode features. Data retention policies apply as described below.`,
    },
    {
      title: t("cm_policyDataRetention"),
      body: `Organization data (including member records, sermons, announcements, giving records, and messages) is retained for 90 days after account closure or removal, after which it may be permanently deleted. During the retention period, Organization owners may request an export of their data by contacting Platform support. The Platform is not responsible for data loss resulting from Organization-initiated deletion or account closure.`,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf8f5" }}>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "#b8962e" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274415" }}>
            <ShieldCheck className="w-5 h-5" style={{ color: "#1a2744" }} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: "#1a2744" }}>{t("cm_churchModePolicyTitle")}</h1>
            <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>Effective July 2026</p>
          </div>
        </div>

        {/* Approval disclaimer box */}
        <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: "#b8962e40", backgroundColor: "#fffbf0" }}>
          <p className="font-semibold text-sm" style={{ color: "#92400e" }}>{t("cm_approvalDisclaimerTitle")}</p>
          <p className="text-sm" style={{ color: "#78350f" }}>{t("cm_approvalDisclaimerDesc")}</p>
        </div>

        {/* Policy sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="space-y-2">
              <h2 className="font-serif text-lg font-semibold" style={{ color: "#1a2744" }}>
                {i + 1}. {section.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#4a4540" }}>{section.body}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-xl border p-4" style={{ borderColor: "#e0dcd8", backgroundColor: "#fff" }}>
          <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>Questions?</p>
          <p className="text-sm mt-1" style={{ color: "#7a7570" }}>
            If you have questions about this policy or a specific governance decision, use the <strong>Governance → Platform Messages</strong> tab in your church Administration panel, or contact us through the platform's support channels.
          </p>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center" style={{ color: "#9a9590" }}>
          365 Daily Devotional is a technology platform. Nothing in this policy constitutes legal advice.
        </p>
      </div>
    </div>
  );
}
