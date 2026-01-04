import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationPrompt() {
  const { 
    isSupported, 
    permission, 
    hasSeenPrompt, 
    requestPermission, 
    markPromptShown 
  } = useNotifications();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSupported && !hasSeenPrompt && permission === "default") {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, hasSeenPrompt, permission]);

  const handleAllow = async () => {
    setIsLoading(true);
    await requestPermission();
    setIsLoading(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    markPromptShown();
    setIsVisible(false);
  };

  if (!isSupported) return null;

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
                <p className="text-muted-foreground text-sm mt-1">
                  Would you like to receive gentle daily reminders when new devotionals are available?
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleAllow}
                    disabled={isLoading}
                    data-testid="button-allow-notifications"
                  >
                    {isLoading ? "Enabling..." : "Allow"}
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
