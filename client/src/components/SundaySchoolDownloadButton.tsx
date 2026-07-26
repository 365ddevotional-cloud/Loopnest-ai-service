import { useState, useEffect, useCallback } from "react";
import { Download, CheckCircle2, Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveSSDownload,
  getSSDownload,
  removeSSDownload,
  saveSundayLessons,
  type SSDownload,
} from "@/lib/offlineDb";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/use-toast";
import { useConnectionStatus } from "@/hooks/use-connection-status";

interface SSLessonProps {
  id: number;
  date: string;
  title: string;
  scriptureReferences: string;
  updatedAt?: string | Date | null;
  [key: string]: unknown;
}

interface Props {
  lesson: SSLessonProps;
  compact?: boolean;
}

function toISOString(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  try { return v.toISOString(); } catch { return null; }
}

export function SundaySchoolDownloadButton({ lesson, compact = false }: Props) {
  const { user } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const { isOnline } = useConnectionStatus();

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const serverUpdatedAt = toISOString(lesson.updatedAt as string | Date | null | undefined);

  useEffect(() => {
    let cancelled = false;
    getSSDownload(lesson.id)
      .then((record) => {
        if (cancelled) return;
        if (record) {
          setIsDownloaded(true);
          if (isOnline && serverUpdatedAt && record.serverUpdatedAt && record.serverUpdatedAt !== serverUpdatedAt) {
            setHasUpdate(true);
          }
        }
        setChecked(true);
      })
      .catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [lesson.id, serverUpdatedAt, isOnline]);

  const doDownload = useCallback(async () => {
    setIsBusy(true);
    try {
      await saveSundayLessons([lesson]);
      const year = parseInt(lesson.date.slice(0, 4), 10);
      const record: SSDownload = {
        id: lesson.id,
        date: lesson.date,
        year,
        title: lesson.title,
        scriptureReferences: lesson.scriptureReferences,
        downloadedAt: Date.now(),
        serverUpdatedAt,
        firebaseUid: user?.uid ?? null,
      };
      await saveSSDownload(record);
      setIsDownloaded(true);
      setHasUpdate(false);
      toast({ title: t("ssOfflineSaved"), description: lesson.title, duration: 2500 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("QuotaExceeded") || msg.includes("quota")) {
        toast({ title: t("ssOfflineStorageFull"), variant: "destructive", duration: 3000 });
      } else {
        toast({ title: "Could not save lesson", variant: "destructive", duration: 2500 });
      }
    } finally {
      setIsBusy(false);
    }
  }, [lesson, serverUpdatedAt, user, t, toast]);

  const handleRemove = useCallback(async () => {
    setIsBusy(true);
    try {
      await removeSSDownload(lesson.id);
      setIsDownloaded(false);
      setHasUpdate(false);
      toast({ title: t("ssOfflineRemoved"), duration: 2000 });
    } catch {
      toast({ title: "Could not remove", variant: "destructive", duration: 2000 });
    } finally {
      setIsBusy(false);
    }
  }, [lesson.id, t, toast]);

  if (!checked) return null;

  if (isDownloaded && !hasUpdate) {
    if (compact) {
      return (
        <span
          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap"
          data-testid={`badge-ss-available-offline-${lesson.id}`}
        >
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {t("ssOfflineAvailable")}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium min-h-[44px]"
          data-testid={`badge-ss-available-offline-${lesson.id}`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{t("ssOfflineAvailable")}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive gap-1 min-h-[44px]"
          onClick={handleRemove}
          disabled={isBusy}
          data-testid={`button-ss-remove-offline-${lesson.id}`}
          aria-label={t("ssOfflineRemove")}
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {t("ssOfflineRemove")}
        </Button>
      </div>
    );
  }

  if (hasUpdate) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"
          data-testid={`badge-ss-update-available-${lesson.id}`}
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          {t("ssOfflineUpdateAvailable")}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-h-[44px] text-sm border-amber-400/50"
          onClick={doDownload}
          disabled={isBusy || !isOnline}
          data-testid={`button-ss-update-offline-${lesson.id}`}
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
          {isBusy ? t("ssOfflineDownloading") : t("ssOfflineUpdate")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive gap-1 min-h-[44px]"
          onClick={handleRemove}
          disabled={isBusy}
          data-testid={`button-ss-remove-offline-update-${lesson.id}`}
          aria-label={t("ssOfflineRemove")}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          {t("ssOfflineRemove")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={compact ? "gap-1 text-xs h-7 px-2 flex-shrink-0" : "gap-2 min-h-[44px] text-sm"}
      onClick={doDownload}
      disabled={isBusy || !isOnline}
      data-testid={`button-ss-download-offline-${lesson.id}`}
      aria-label={t("ssOfflineDownloadBtn")}
    >
      {isBusy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {isBusy ? t("ssOfflineDownloading") : t("ssOfflineDownloadBtn")}
    </Button>
  );
}
