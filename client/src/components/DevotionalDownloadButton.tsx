import { useState, useEffect, useCallback } from "react";
import { Download, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveDownload,
  getDownload,
  removeDownload,
  saveDevotionals,
  type UserDownload,
} from "@/lib/offlineDb";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { getCurrentLang } from "@/utils/i18n";
import { useToast } from "@/hooks/use-toast";
import { useConnectionStatus } from "@/hooks/use-connection-status";

interface Props {
  devotional: {
    id: number;
    date: string;
    title: string;
    bibleTranslation?: string | null;
    [key: string]: unknown;
  };
}

export function DevotionalDownloadButton({ devotional }: Props) {
  const { user } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const { isOnline } = useConnectionStatus();

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDownload(devotional.id)
      .then((record) => {
        if (!cancelled) {
          setIsDownloaded(!!record);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => { cancelled = true; };
  }, [devotional.id]);

  const handleDownload = useCallback(async () => {
    setIsBusy(true);
    try {
      await saveDevotionals([devotional]);

      const record: UserDownload = {
        id: devotional.id,
        date: devotional.date,
        title: devotional.title,
        language: getCurrentLang(),
        translation: (devotional.bibleTranslation as string) || "KJV",
        downloadedAt: Date.now(),
        firebaseUid: user?.uid ?? null,
      };
      await saveDownload(record);
      setIsDownloaded(true);
      toast({
        title: t("offlineSaved"),
        description: devotional.title,
        duration: 2500,
      });
    } catch {
      toast({
        title: "Could not save",
        description: "Please try again.",
        variant: "destructive",
        duration: 2500,
      });
    } finally {
      setIsBusy(false);
    }
  }, [devotional, user, t, toast]);

  const handleRemove = useCallback(async () => {
    setIsBusy(true);
    try {
      await removeDownload(devotional.id);
      setIsDownloaded(false);
      toast({
        title: t("offlineRemoved"),
        duration: 2000,
      });
    } catch {
      toast({
        title: "Could not remove",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsBusy(false);
    }
  }, [devotional.id, t, toast]);

  if (!checked) return null;

  if (isDownloaded) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium min-h-[44px]"
          data-testid="badge-available-offline"
          aria-label={t("offlineAvailableBtn")}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{t("offlineAvailableBtn")}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive gap-1 min-h-[44px]"
          onClick={handleRemove}
          disabled={isBusy}
          data-testid="button-remove-offline-download"
          aria-label={t("offlineRemoveDownload")}
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {t("offlineRemoveDownload")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 min-h-[44px] text-sm"
      onClick={handleDownload}
      disabled={isBusy || !isOnline}
      data-testid="button-download-offline"
      aria-label={t("offlineDownloadBtn")}
    >
      {isBusy ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="w-4 h-4" aria-hidden="true" />
      )}
      {isBusy ? t("offlineDownloading") : t("offlineDownloadBtn")}
    </Button>
  );
}
