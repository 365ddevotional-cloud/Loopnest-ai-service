import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { ChurchPublicShell } from "@/components/ChurchPublicShell";
import { Loader2, Play, Download, BookOpen, Search, X } from "lucide-react";

export default function ChurchPublicWatch() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<any>(null);

  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/public/churches/${slug}`] });
  const { data: sermonsData, isLoading: sermonsLoading } = useQuery<any>({
    queryKey: [`/api/public/churches/${slug}/sermons`],
  });

  const church = data?.church ?? null;
  const sermons: any[] = sermonsData?.sermons ?? data?.recentSermons ?? [];
  const primary = church?.themeColor ?? "#1d3461";

  const filtered = sermons.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.speakerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.bibleReference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ChurchPublicShell church={church}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary }}>{t("cm_mediaLabel")}</p>
          <h1 className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>{t("cm_sermonMessagesHeading")}</h1>
          <p className="mt-2 text-sm" style={{ color: "#9a9080" }}>{t("cm_watchEncouraged")}</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#c0b8b0" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("cm_searchSermonsPlaceholder")}
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: "#ece8e0" }}
            data-testid="input-search-sermons" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "#c0b8b0" }} />
            </button>
          )}
        </div>

        {playing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlaying(null)}>
            <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm truncate pr-4">{playing.title}</p>
                <button onClick={() => setPlaying(null)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {playing.videoUrl ? (
                playing.videoUrl.includes("youtube") || playing.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={playing.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full aspect-video rounded-xl"
                    allowFullScreen
                    title={playing.title}
                  />
                ) : (
                  <video src={playing.videoUrl} controls autoPlay className="w-full aspect-video rounded-xl" />
                )
              ) : playing.audioUrl ? (
                <div className="bg-gray-900 rounded-xl p-8 text-center">
                  <p className="text-white mb-4 font-semibold">{playing.title}</p>
                  <audio src={playing.audioUrl} controls autoPlay className="w-full" />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {(isLoading || sermonsLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="font-semibold" style={{ color: "#3d3a36" }}>{t("cm_noSermonsYet")}</p>
            <p className="text-sm mt-1" style={{ color: "#9a9080" }}>{t("cm_checkBackForSermons")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => (
              <div key={s.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "#ece8e0" }}
                data-testid={`card-sermon-${s.id}`}>
                <div className="relative aspect-video overflow-hidden cursor-pointer group"
                  style={{ backgroundColor: `${primary}12` }}
                  onClick={() => (s.videoUrl || s.audioUrl) && setPlaying(s)}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10" style={{ color: `${primary}40` }} />
                    </div>
                  )}
                  {(s.videoUrl || s.audioUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 ml-0.5" style={{ color: primary }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: "#1a1a1a" }}>{s.title}</h3>
                  {s.speakerName && <p className="text-xs mb-0.5" style={{ color: "#9a9080" }}>{s.speakerName}</p>}
                  {s.bibleReference && (
                    <p className="text-xs font-medium mb-2" style={{ color: primary }}>{s.bibleReference}</p>
                  )}
                  {s.description && (
                    <p className="text-xs line-clamp-2 mb-3" style={{ color: "#6b6460" }}>{s.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.videoUrl && (
                      <button onClick={() => setPlaying(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
                        style={{ backgroundColor: primary }}
                        data-testid={`button-watch-sermon-${s.id}`}>
                        <Play className="w-3.5 h-3.5" /> {t("cm_watchButton")}
                      </button>
                    )}
                    {s.audioUrl && !s.videoUrl && (
                      <button onClick={() => setPlaying(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
                        style={{ backgroundColor: primary }}
                        data-testid={`button-listen-sermon-${s.id}`}>
                        🎧 {t("cm_listenButton")}
                      </button>
                    )}
                    {s.pdfNotesUrl && (
                      <a href={s.pdfNotesUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border"
                        style={{ borderColor: "#ece8e0", color: "#6b6460" }}
                        data-testid={`button-notes-sermon-${s.id}`}>
                        <Download className="w-3.5 h-3.5" /> {t("cm_notesButton")}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChurchPublicShell>
  );
}
