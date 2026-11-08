import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, MapPin, Clock } from "lucide-react";
import { format, isPast } from "date-fns";

export default function ChurchPublicEvents() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });
  const { data: eventsData } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}/events`] });

  const church = data?.church ?? null;
  const events: any[] = eventsData?.events ?? [];
  const primary = church?.themeColor ?? "#1d3461";

  const upcoming = events.filter(e => e.startDate && !isPast(new Date(e.startDate)));
  const past = events.filter(e => e.startDate && isPast(new Date(e.startDate)));

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_calendarLabel")}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_upcomingEventsHeading")}</h1>
          <p className="mt-2 text-sm" style={{ color: "#9a9080" }}>{t("cm_eventsSubtitle")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-semibold" style={{ color: "#3d3a36" }}>{t("cm_noEventsScheduled")}</p>
            <p className="text-sm mt-1" style={{ color: "#9a9080" }}>{t("cm_checkBackSoonEvents")}</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-12">
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#9a9080" }}>{t("cm_upcomingTab")}</h2>
                <div className="space-y-4">
                  {upcoming.map(e => (
                    <EventCard key={e.id} event={e} primary={primary} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#c0b8b0" }}>{t("cm_pastEvents")}</h2>
                <div className="space-y-4 opacity-70">
                  {past.slice(0, 5).map(e => (
                    <EventCard key={e.id} event={e} primary={primary} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ChurchPublicShell>
  );
}

function EventCard({ event: e, primary }: { event: any; primary: string }) {
  return (
    <div className="p-5 rounded-2xl border bg-white flex gap-4" style={{ borderColor: "#ece8e0" }}
      data-testid={`card-event-${e.id}`}>
      {e.startDate && (
        <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border"
          style={{ backgroundColor: `${primary}08`, borderColor: `${primary}20` }}>
          <p className="text-lg font-bold leading-none" style={{ color: primary }}>
            {format(new Date(e.startDate), "d")}
          </p>
          <p className="text-xs font-medium" style={{ color: "#9a9080" }}>
            {format(new Date(e.startDate), "MMM")}
          </p>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{e.title}</p>
        {e.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#6b6460" }}>{e.description}</p>}
        <div className="flex flex-wrap gap-3 mt-2">
          {e.startDate && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#9a9080" }}>
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(e.startDate), "EEE, MMM d · h:mm a")}
            </span>
          )}
          {e.location && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#9a9080" }}>
              <MapPin className="w-3.5 h-3.5" />{e.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
