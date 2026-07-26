import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { useI18n } from "@/hooks/useI18n";

export function OfflineStatusBanner() {
  const { isOnline, justCameOnline } = useConnectionStatus();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
    } else if (justCameOnline) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOnline, justCameOnline]);

  const isOfflineState = !isOnline;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={isOfflineState ? "offline" : "back-online"}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-20 left-4 z-50 sm:bottom-6"
          role="status"
          aria-live="polite"
          aria-label={isOfflineState ? t("offlineBadge") : t("offlineBackOnline")}
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-medium min-h-[44px] ${
              isOfflineState
                ? "bg-zinc-800 text-white dark:bg-zinc-900"
                : "bg-emerald-600 text-white"
            }`}
          >
            {isOfflineState ? (
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            ) : (
              <Wifi className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            )}
            <span>{isOfflineState ? t("offlineBadge") : t("offlineBackOnline")}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
