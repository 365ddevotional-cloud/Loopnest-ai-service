import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search, ChevronDown, ChevronUp, Loader2, ArrowRight } from "lucide-react";
import type { Church } from "@shared/schema";

interface MyRole { role: string | null; memberId: number | null; status: string | null; }
interface PastorNote {
  id: number; churchId: number; title: string; sermonDate: string | null;
  scripture: string | null; summary: string | null; keyPoints: string[] | null;
  closingPrayer: string | null; status: string; authorName: string | null;
  publishedAt: string | null; createdAt: string;
}

const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];

export default function ChurchPastorNotes() {
  const [, params] = useRoute("/church/:slug/pastor-notes");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const { getIdToken, user, emailVerified } = useUser();
  const { t } = useI18n();
  const isSignedIn = !!user && !!emailVerified;
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: church } = useQuery<Church>({
    queryKey: ["/api/churches/slug", slug],
    queryFn: async () => {
      const token = isSignedIn ? await getIdToken() : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}`, { headers });
      if (!r.ok) return Promise.reject(new Error("Church not found"));
      return r.json();
    },
    enabled: !!slug,
  });

  const { data: myRole } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const currentRole = myRole?.role ?? null;
  const isAdmin = ADMIN_ROLES.includes(currentRole ?? "");

  const { data: notes = [], isLoading } = useQuery<PastorNote[]>({
    queryKey: ["/api/churches", church?.id, "pastor-notes"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${church!.id}/pastor-notes`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
    enabled: !!church?.id && !!myRole?.role,
  });

  const filtered = notes.filter(n =>
    !search.trim() ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.scripture && n.scripture.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ChurchModeShell church={church ?? null} currentRole={currentRole}>
      <div className="space-y-5 pb-8">

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#1d3461" }} data-testid="text-sermon-notes-title">
              {t("cm_sermonNotes")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("cm_sermonNotesSubtitle")}</p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setLocation(`/church/${slug}/pastor-dashboard`)}
              variant="outline"
              className="gap-1.5 text-xs flex-shrink-0"
              data-testid="button-manage-notes"
            >
              {t("cm_manageNotes")} <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("cm_searchNotes")}
            className="pl-9"
            data-testid="input-search-notes"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("cm_loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: "#c9b99033", backgroundColor: "#fffdf9" }}>
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400" data-testid="text-no-notes">
              {search ? t("cm_noNotesFound") : t("cm_noPublishedNotes")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(note => (
              <div key={note.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "#c9b99033", backgroundColor: "#fff" }} data-testid={`card-published-note-${note.id}`}>
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug" style={{ color: "#1d3461" }}>{note.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {note.sermonDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(note.sermonDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {note.scripture && (
                          <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "#1d346114", color: "#1d3461", border: "1px solid #1d346122" }}>
                            {note.scripture}
                          </Badge>
                        )}
                      </div>
                      {note.summary && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{note.summary}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {expanded === note.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </button>

                {expanded === note.id && (
                  <div className="border-t px-4 pb-5" style={{ borderColor: "#c9b99022" }}>
                    {note.summary && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9a9080" }}>{t("cm_summary")}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{note.summary}</p>
                      </div>
                    )}

                    {note.keyPoints && note.keyPoints.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9a9080" }}>{t("cm_keyPoints")}</p>
                        <ol className="space-y-2">
                          {note.keyPoints.map((kp, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                              <span className="font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs" style={{ backgroundColor: "#1d346114", color: "#1d3461" }}>{i + 1}</span>
                              <span className="leading-relaxed">{kp}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {note.closingPrayer && (
                      <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f8f4ee" }}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9a9080" }}>{t("cm_closingPrayer")}</p>
                        <p className="text-sm text-gray-700 italic leading-relaxed">{note.closingPrayer}</p>
                      </div>
                    )}

                    {note.publishedAt && (
                      <p className="text-xs text-gray-400 mt-4">
                        {t("cm_publishedOn")} {new Date(note.publishedAt).toLocaleDateString()}
                        {note.authorName ? ` · ${note.authorName}` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ChurchModeShell>
  );
}
