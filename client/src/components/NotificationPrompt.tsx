import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from "framer-motion";

type PromptStatus = "idle" | "loading" | "success" | "denied" | "unsupported" | "error";

// Detect iPhone/iPad (iOS) for install-to-home-screen guidance
function isIOS(): boolean {
  return typeof navigator !== "undefined" &&
    /iP(hone|ad|od)/.test(navigator.userAgent);
}

const TIMEOUT_MS = 15000;

export function NotificationPrompt() {
  const { 
    isSupported, 
    permission, 
    hasSeenPrompt, 
    requestPermission, 
    markPromptShown 
  } = useNotifications();
  
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<PromptStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSupported && !hasSeenPrompt && permission === "default") {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, hasSeenPrompt, permission]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAllow = async () => {
    if (status === "loading") return;

    // iOS Safari: push notifications require Add to Home Screen
    if (isIOS() && !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      markPromptShown();
      return;
    }

    setStatus("loading");

    // Safety timeout — ensures we never stay stuck on "Enabling…"
    timeoutRef.current = setTimeout(() => {
      setStatus("error");
      markPromptShown();
    }, TIMEOUT_MS);

    try {
      const granted = await requestPermission();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (granted) {
        setStatus("success");
        markPromptShown();
        // Auto-dismiss after showing success
        setTimeout(() => setIsVisible(false), 2500);
      } else {
        // Permission was denied by the user in the browser dialog
        setStatus("denied");
        markPromptShown();
      }
    } catch (err) {
      console.error("[NotificationPrompt] requestPermission error:", err);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus("error");
      markPromptShown();
    }
  };

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    markPromptShown();
    setIsVisible(false);
  };

  if (!isSupported) return null;

  const statusMessage = (): { icon: React.ReactNode; text: string } | null => {
    switch (status) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
          text: "Daily reminders are enabled.",
        };
      case "denied":
        return {
          icon: <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />,
          text: "Notifications are blocked. Please allow notifications in your browser or device settings.",
        };
      case "unsupported":
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
          text: isIOS()
            ? "To receive reminders on iPhone or iPad, add 365 Daily Devotional to your Home Screen and allow notifications."
            : "Notifications are not supported in this browser.",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />,
          text: "We could not enable reminders right now. Please try again.",
        };
      default:
        return null;
    }
  };

  const msg = statusMessage();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <Card className="p-4 shadow-lg border-primary/20">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  Daily Devotional Reminders
                </h3>

                {msg ? (
                  <div className="flex items-start gap-1.5 mt-2">
                    {msg.icon}
                    <p className="text-sm text-muted-foreground">{msg.text}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm mt-1">
                    Would you like to receive gentle daily reminders when new devotionals are available?
                  </p>
                )}

                {status === "idle" && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleAllow}
                      data-testid="button-allow-notifications"
                    >
                      Allow
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      data-testid="button-dismiss-notifications"
                    >
                      Not now
                    </Button>
                  </div>
                )}

                {status === "loading" && (
                  <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                    Enabling… waiting for browser permission
                  </p>
                )}

                {(status === "denied" || status === "error") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleDismiss}
                    data-testid="button-dismiss-notifications"
                  >
                    Close
                  </Button>
                )}

                {status === "unsupported" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleDismiss}
                    data-testid="button-dismiss-notifications"
                  >
                    OK
                  </Button>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="flex-shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
                data-testid="button-close-notification-prompt"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
