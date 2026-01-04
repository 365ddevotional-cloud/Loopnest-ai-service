import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const NOTIFICATION_PREF_KEY = "devotional-notifications-enabled";
const NOTIFICATION_PROMPT_SHOWN_KEY = "devotional-notification-prompt-shown";
const LAST_NOTIFICATION_DATE_KEY = "devotional-last-notification-date";

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    console.warn("Failed to save to localStorage:", key);
  }
}

export interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isEnabled: boolean;
  hasSeenPrompt: boolean;
}

interface NotificationContextValue extends NotificationState {
  requestPermission: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => void;
  markPromptShown: () => void;
  canNotify: () => boolean;
  hasNotifiedToday: () => boolean;
  sendNotification: (title: string, options?: NotificationOptions) => boolean;
  sendDevotionalNotification: () => boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationState>(() => {
    const isSupported = typeof window !== "undefined" && "Notification" in window;
    const savedPref = safeGetItem(NOTIFICATION_PREF_KEY);
    const promptShown = safeGetItem(NOTIFICATION_PROMPT_SHOWN_KEY);
    
    return {
      isSupported,
      permission: isSupported ? Notification.permission : "unsupported",
      isEnabled: savedPref === "true",
      hasSeenPrompt: promptShown === "true",
    };
  });

  useEffect(() => {
    if (state.isSupported) {
      setState(prev => ({
        ...prev,
        permission: Notification.permission,
      }));
    }
  }, [state.isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;
    
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      
      setState(prev => ({
        ...prev,
        permission,
        isEnabled: granted,
        hasSeenPrompt: true,
      }));
      
      safeSetItem(NOTIFICATION_PREF_KEY, granted.toString());
      safeSetItem(NOTIFICATION_PROMPT_SHOWN_KEY, "true");
      
      return granted;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [state.isSupported]);

  const setEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      isEnabled: enabled,
    }));
    safeSetItem(NOTIFICATION_PREF_KEY, enabled.toString());
  }, []);

  const markPromptShown = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenPrompt: true,
    }));
    safeSetItem(NOTIFICATION_PROMPT_SHOWN_KEY, "true");
  }, []);

  const canNotify = useCallback((): boolean => {
    return state.isSupported && 
           state.permission === "granted" && 
           state.isEnabled;
  }, [state.isSupported, state.permission, state.isEnabled]);

  const hasNotifiedToday = useCallback((): boolean => {
    const lastDate = safeGetItem(LAST_NOTIFICATION_DATE_KEY);
    const today = new Date().toISOString().split("T")[0];
    return lastDate === today;
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions): boolean => {
    if (!canNotify()) return false;
    if (hasNotifiedToday()) return false;
    
    try {
      const notification = new Notification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "daily-devotional",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      const today = new Date().toISOString().split("T")[0];
      safeSetItem(LAST_NOTIFICATION_DATE_KEY, today);
      
      return true;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  }, [canNotify, hasNotifiedToday]);

  const sendDevotionalNotification = useCallback(() => {
    const messages = [
      "Today's devotional is ready. Take a quiet moment with God.",
      "Your daily devotional for today is now available.",
      "A new devotional awaits you. Begin your day with Scripture.",
      "Today's spiritual reflection is ready for you.",
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    return sendNotification("365 Daily Devotional", {
      body: message,
      silent: false,
    });
  }, [sendNotification]);

  const value: NotificationContextValue = {
    ...state,
    requestPermission,
    setEnabled,
    markPromptShown,
    canNotify,
    hasNotifiedToday,
    sendNotification,
    sendDevotionalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
