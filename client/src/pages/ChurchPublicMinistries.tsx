import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Users } from "lucide-react";
import { Link } from "wouter";

const TYPE_ICONS: Record<string, string> = {
  worship: "🎵", youth: "🌟", women: "💜", men: "💪", children: "🧒",
  evangelism: "📢", prayer: "🙏", media: "📹", ushers: "🚪", choir: "🎶",
  general: "⛪",
};

export default function ChurchPublicMinistries() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });

  const church = data?.church ?? null;
  const departments: any[] = data?.departments ?? [];
  const primary = church?.themeColor ?? "#1d3461";
  const base = `/church/${slug}`;

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>Get Involved</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>Ministries & Departments</h1>
          <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: "#9a9080" }}>
            Find a community where you belong and use your gifts to serve.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">⛪</div>
            <p className="font-semibold" style={{ color: "#3d3a36" }}>No departments listed yet</p>
            <p className="text-sm mt-1" style={{ color: "#9a9080" }}>Check back soon for ministry information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map(d => {
              const typeKey = d.type?.toLowerCase() ?? "general";
              const icon = TYPE_ICONS[typeKey] ?? "⛪";
              return (
                <div key={d.id} className="p-6 rounded-2xl border bg-white hover:shadow-md transition-shadow"
                  style={{ borderColor: "#ece8e0" }}
                  data-testid={`card-department-${d.id}`}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                    style={{ backgroundColor: `${primary}10` }}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color: "#1a1a1a" }}>{d.name}</h3>
                  {d.description && (
                    <p className="text-sm line-clamp-3 mb-4" style={{ color: "#6b6460" }}>{d.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    {d.leaderName && (
                      <p className="text-xs" style={{ color: "#9a9080" }}>
                        👤 Led by {d.leaderName}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "#f0ece6" }}>
                    <Link href={`${base}/join-us`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ backgroundColor: primary }}>
                      Get Involved
                    </Link>
                    {d.meetingSchedule && (
                      <p className="text-xs" style={{ color: "#c0b8b0" }}>{d.meetingSchedule}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-14 p-8 rounded-2xl text-center" style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}20` }}>
          <Users className="w-8 h-8 mx-auto mb-3" style={{ color: primary }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#1a1a1a" }}>Ready to get connected?</h2>
          <p className="text-sm mb-5" style={{ color: "#6b6460" }}>Join our church and become part of a ministry team.</p>
          <Link href={`${base}/join-us`}
            className="inline-flex px-6 py-3 text-sm font-semibold rounded-xl text-white"
            style={{ backgroundColor: primary }}
            data-testid="button-join-ministries">
            Join {church?.name ?? "Our Church"}
          </Link>
        </div>
      </div>
    </ChurchPublicShell>
  );
}
