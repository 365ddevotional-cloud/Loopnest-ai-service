import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MenuTransitionContextType {
  isTransitioning: boolean;
  triggerTransition: (callback: () => void) => void;
  completeTransition: () => void;
}

const MenuTransitionContext = createContext<MenuTransitionContextType | undefined>(undefined);

export function MenuTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const triggerTransition = useCallback((callback: () => void) => {
    setIsTransitioning(true);
    setPendingCallback(() => callback);
  }, []);

  const completeTransition = useCallback(() => {
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
    setIsTransitioning(false);
  }, [pendingCallback]);

  return (
    <MenuTransitionContext.Provider value={{ isTransitioning, triggerTransition, completeTransition }}>
      {children}
    </MenuTransitionContext.Provider>
  );
}

export function useMenuTransition() {
  const context = useContext(MenuTransitionContext);
  if (!context) {
    throw new Error("useMenuTransition must be used within a MenuTransitionProvider");
  }
  return context;
}
