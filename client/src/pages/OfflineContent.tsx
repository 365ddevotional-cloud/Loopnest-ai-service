import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  getAllDownloads,
  removeDownload,
  clearUserDownloads,
  getAllSSDownloads,
  removeSSDownloadsByYear,
  clearAllSSDownloads,
  type UserDownload,
  type SSDownload,
} from "@/lib/offlineDb";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  WifiOff,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  BookOpen,
  HardDrive,
  ArrowLeft,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  yo: "Yorùbá",
  pcm: "Pidgin",
  ha: "Hausa",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OfflineContent() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();

  const [downloads, setDownloads] = useState<UserDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  const [ssDownloads, setSSDownloads] = useState<SSDownload[]>([]);
  const [removingYear, setRemovingYear] = useState<number | null>(null);
  const [clearingAllSS, setClearingAllSS] = useState(false);

  const firebaseUid = user?.uid ?? null;

  const loadDownloads = useCallback(async () => {
    try {
      const all = await getAllDownloads(firebaseUid);
      const sorted = [...all].sort((a, b) => b.downloadedAt - a.downloadedAt);
      setDownloads(sorted);
    } catch {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUid]);

  const loadSSDownloads = useCallback(async () => {
    try {
      const all = await getAllSSDownloads();
      const sorted = [...all].sort((a, b) => b.downloadedAt - a.downloadedAt);
      setSSDownloads(sorted);
    } catch {
      setSSDownloads([]);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
    loadSSDownloads();
  }, [loadDownloads, loadSSDownloads]);

  useEffect(() => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageEstimate({ usage: est.usage, quota: est.quota });
        }
      }).catch(() => {});
    }
  }, []);

  const handleRemove = useCallback(async (id: number) => {
    setRemovingId(id);
    try {
      await removeDownload(id);
      setDownloads((prev) => prev.filter((d) => d.id !== id));
      toast({ title: t("offlineRemoved"), duration: 2000 });
    } catch {
      toast({ title: "Could not remove", variant: "destructive", duration: 2000 });
    } finally {
      setRemovingId(null);
    }
  }, [t, toast]);

  const handleClearAll = useCallback(async () => {
    const confirmed = window.confirm(t("offlineRemoveAllConfirm"));
    if (!confirmed) return;
    setClearingAll(true);
    try {
      await clearUserDownloads(firebaseUid);
      setDownloads([]);
      toast({ title: t("offlineRemoved"), duration: 2000 });
    } catch {
      toast({ title: "Could not clear downloads", variant: "destructive", duration: 2000 });
    } finally {
      setClearingAll(false);
    }
  }, [firebaseUid, t, toast]);

  const ssYears = Array.from(new Set(ssDownloads.map((d) => d.year))).sort((a, b) => b - a);

  const handleRemoveSSYear = useCallback(async (year: number) => {
    const confirmed = window.confirm(t("ssOfflineRemoveYearConfirm"));
    if (!confirmed) return;
    setRemovingYear(year);
    try {
      await removeSSDownloadsByYear(year);
      setSSDownloads((prev) => prev.filter((d) => d.year !== year));
      toast({ title: t("ssOfflineRemoved"), duration: 2000 });
    } catch {
      toast({ title: "Could not remove year", variant: "destructive", duration: 2000 });
    } finally {
      setRemovingYear(null);
    }
  }, [t, toast]);

  const handleClearAllSS = useCallback(async () => {
    const confirmed = window.confirm(t("ssOfflineClearAllConfirm"));
    if (!confirmed) return;
    setClearingAllSS(true);
    try {
      await clearAllSSDownloads(null);
      setSSDownloads([]);
      toast({ title: t("ssOfflineRemoved"), duration: 2000 });
    } catch {
      toast({ title: "Could not clear Sunday School downloads", variant: "destructive", duration: 2000 });
    } finally {
      setClearingAllSS(false);
    }
  }, [t, toast]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/my-library">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary/5 text-muted-foreground gap-1.5"
            data-testid="button-back-library"
          >
            <ArrowLeft className="w-4 h-4" />
            My Library
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <WifiOff className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1
                className="font-serif text-2xl font-bold text-foreground"
                data-testid="heading-offline-content"
              >
                {t("offlineContent")}
              </h1>
              {downloads.length > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {downloads.length} devotional{downloads.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {downloads.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 min-h-[44px]"
              onClick={handleClearAll}
              disabled={clearingAll}
              data-testid="button-remove-all-downloads"
              aria-label={t("offlineRemoveAll")}
            >
              {clearingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
              {t("offlineRemoveAll")}
            </Button>
          )}
        </div>

        {storageEstimate && (
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2"
            data-testid="text-storage-usage"
          >
            <HardDrive className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {t("offlineStorageUsed")}: {formatBytes(storageEstimate.usage)} /{" "}
              {formatBytes(storageEstimate.quota)}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading" />
          </div>
        ) : downloads.length === 0 ? (
          <Card
            className="p-10 text-center border-dashed border-border/50 bg-card/50"
            data-testid="section-offline-empty"
          >
            <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
              <Download className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-2" data-testid="text-offline-empty">
              {t("offlineEmpty")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              {t("offlineEmptyHint")}
            </p>
            <Link href="/">
              <Button
                variant="outline"
                className="gap-2 min-h-[44px]"
                data-testid="button-go-home-from-empty"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                Today&apos;s Devotional
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="list-offline-downloads">
            {downloads.map((dl) => (
              <DownloadCard
                key={dl.id}
                download={dl}
                onOpen={() => navigate(`/devotional/${dl.date}`)}
                onRemove={() => handleRemove(dl.id)}
                isRemoving={removingId === dl.id}
              />
            ))}
          </div>
        )}

        {ssDownloads.length > 0 && (
          <div className="space-y-3" data-testid="section-ss-offline">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <GraduationCap className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    {t("ssOfflineHeading")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-ss-offline-count">
                    {ssDownloads.length} {t("ssOfflineLessonsCount")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 min-h-[44px]"
                onClick={handleClearAllSS}
                disabled={clearingAllSS}
                data-testid="button-ss-clear-all"
              >
                {clearingAllSS ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                )}
                {t("ssOfflineClearAll")}
              </Button>
            </div>

            {ssYears.map((year) => {
              const yearDownloads = ssDownloads.filter((d) => d.year === year);
              const newest = yearDownloads.reduce((a, b) => a.downloadedAt > b.downloadedAt ? a : b);
              let formattedNewest = "";
              try {
                formattedNewest = format(new Date(newest.downloadedAt), "MMM d, yyyy");
              } catch {
                formattedNewest = new Date(newest.downloadedAt).toLocaleDateString();
              }
              return (
                <Card
                  key={year}
                  className="p-4 bg-card border-border/40 hover:border-primary/20 transition-colors"
                  data-testid={`card-ss-offline-year-${year}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-4 h-4 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{year}</p>
                        <p className="text-xs text-muted-foreground">
                          {yearDownloads.length} {t("ssOfflineLessonsCount")} &middot;{" "}
                          {t("ssOfflineLastUpdated")} {formattedNewest}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
                      onClick={() => handleRemoveSSYear(year)}
                      disabled={removingYear === year}
                      data-testid={`button-ss-remove-year-${year}`}
                    >
                      {removingYear === year ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      {t("ssOfflineRemoveYear")}
                    </Button>
                  </div>
                </Card>
              );
            })}

            <Link href="/sunday-school">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground text-sm"
                data-testid="link-go-to-sunday-school"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                {t("ssOfflineManageLink")}
              </Button>
            </Link>
          </div>
        )}

        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Church administration, private messages, payments, and counseling are not available offline.
            Devotional content only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function DownloadCard({
  download,
  onOpen,
  onRemove,
  isRemoving,
}: {
  download: UserDownload;
  onOpen: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const { t } = useI18n();
  const langLabel = LANG_LABELS[download.language] || download.language.toUpperCase();
  const downloadedDate = new Date(download.downloadedAt);

  let formattedDownloadDate = "";
  try {
    formattedDownloadDate = format(downloadedDate, "MMM d, yyyy");
  } catch {
    formattedDownloadDate = downloadedDate.toLocaleDateString();
  }

  let formattedDevotionalDate = download.date;
  try {
    const [y, m, d] = download.date.split("-").map(Number);
    formattedDevotionalDate = format(new Date(y, m - 1, d), "MMMM d, yyyy");
  } catch {}

  return (
    <Card
      className="p-4 bg-card border-border/40 hover:border-primary/20 transition-colors"
      data-testid={`card-offline-download-${download.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm text-foreground leading-snug line-clamp-2"
            data-testid={`text-offline-title-${download.id}`}
          >
            {download.title}
          </p>
          <p
            className="text-xs text-muted-foreground mt-0.5"
            data-testid={`text-offline-date-${download.id}`}
          >
            {formattedDevotionalDate}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5"
              data-testid={`badge-offline-lang-${download.id}`}
            >
              {langLabel}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5"
              data-testid={`badge-offline-translation-${download.id}`}
            >
              {download.translation}
            </Badge>
            <span
              className="text-xs text-muted-foreground"
              data-testid={`text-offline-downloaded-on-${download.id}`}
            >
              {t("offlineDownloadedOn")} {formattedDownloadDate}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 justify-end flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 min-h-[44px] text-sm"
          onClick={onOpen}
          data-testid={`button-open-offline-${download.id}`}
          aria-label={`${t("offlineOpenBtn")}: ${download.title}`}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          {t("offlineOpenBtn")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 min-h-[44px] text-sm text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
          data-testid={`button-remove-offline-${download.id}`}
          aria-label={`${t("offlineRemoveDownload")}: ${download.title}`}
        >
          {isRemoving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {t("offlineRemoveDownload")}
        </Button>
      </div>
    </Card>
  );
}
