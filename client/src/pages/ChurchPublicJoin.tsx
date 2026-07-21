import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Users, CheckCircle } from "lucide-react";

export default function ChurchPublicJoin() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });
  const [code, setCode] = useState("");

  const church = data?.church ?? null;
  const primary = church?.themeColor ?? "#1d3461";

  const BENEFITS = [
    "Access to member-exclusive content and sermons",
    "Join ministry departments and small groups",
    "Participate in members-only prayer network",
    "Receive church announcements and updates",
    "Connect with fellow members in the community",
    "Access giving records and contribution statements",
  ];

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${primary}12` }}>
            <Users className="w-8 h-8" style={{ color: primary }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>Membership</p>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#1a1a1a" }}>
            Join {isLoading ? "Our Church" : church?.name ?? "Our Church"}
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#6b6460" }}>
            Become a member and experience the full benefits of our faith community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Benefits */}
          <div>
            <p className="text-sm font-semibold mb-4" style={{ color: "#3d3a36" }}>Member Benefits</p>
            <div className="space-y-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28a745" }} />
                  <p className="text-sm" style={{ color: "#6b6460" }}>{b}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Join options */}
          <div className="space-y-4">
            {/* Join with invite code */}
            <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>Have an Invite Code?</p>
              <p className="text-xs mb-4" style={{ color: "#9a9080" }}>
                Members can invite you with a personal invite code.
              </p>
              <div className="flex gap-2">
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter code" maxLength={10}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none font-mono uppercase tracking-widest"
                  style={{ borderColor: "#ece8e0" }}
                  data-testid="input-invite-code" />
                <Link href={`/church/join/${code}`}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white flex-shrink-0"
                  style={{ backgroundColor: code.length > 0 ? primary : "#c0b8b0", pointerEvents: code.length === 0 ? "none" : "auto" }}
                  data-testid="button-use-code">
                  Join
                </Link>
              </div>
            </div>

            {/* General join */}
            <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: "#ece8e0" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>
                {church?.approvalMode === "auto_approve" ? "Open Membership" : "Request to Join"}
              </p>
              <p className="text-xs mb-4" style={{ color: "#9a9080" }}>
                {church?.approvalMode === "auto_approve"
                  ? "This church has open membership. Create an account and join instantly."
                  : "Submit a request and the church admin will review and approve your membership."}
              </p>
              <Link href="/signin"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-xl text-white"
                style={{ backgroundColor: primary }}
                data-testid="button-join-signup">
                <Users className="w-4 h-4" />
                {church?.approvalMode === "auto_approve" ? "Join Instantly" : "Request Membership"}
              </Link>
            </div>

            {/* Contact */}
            <div className="p-5 rounded-2xl border" style={{ borderColor: "#ece8e0", backgroundColor: "#fafaf8" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#9a9080" }}>Questions about joining?</p>
              <Link href={`/church/${slug}/contact`} className="text-sm font-medium" style={{ color: primary }}>
                Contact us →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ChurchPublicShell>
  );
}
