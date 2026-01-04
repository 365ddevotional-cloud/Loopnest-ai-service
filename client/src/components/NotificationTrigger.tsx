import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/use-notifications";
import type { Devotional } from "@shared/schema";

export function NotificationTrigger() {
  const { canNotify, hasNotifiedToday, sendDevotionalNotification } = useNotifications();
  const hasTriggered = useRef(false);

  const { data: todayDevotional } = useQuery<Devotional>({
    queryKey: ["/api/devotionals/today"],
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: canNotify() && !hasNotifiedToday(),
  });

  useEffect(() => {
    if (
      todayDevotional && 
      canNotify() && 
      !hasNotifiedToday() && 
      !hasTriggered.current
    ) {
      hasTriggered.current = true;
      const timer = setTimeout(() => {
        sendDevotionalNotification();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [todayDevotional, canNotify, hasNotifiedToday, sendDevotionalNotification]);

  return null;
}
