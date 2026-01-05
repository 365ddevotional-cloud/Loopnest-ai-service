import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@assets/IMG_202512182225101_-_Copy_1767468127874.PNG";

interface MenuTransitionOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function MenuTransitionOverlay({ isVisible, onComplete }: MenuTransitionOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowOverlay(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
        onComplete();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          data-testid="menu-transition-overlay"
        >
          <div className="relative">
            <motion.img
              src={logoImage}
              alt="365 Daily Devotional"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain relative z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              style={{ transform: "scale(1.3)" }}
            >
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  pathLength: { duration: 0.35, ease: "easeInOut" },
                  opacity: { duration: 0.1 }
                }}
              />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
