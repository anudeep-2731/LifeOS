import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';

const CELEBRATION_MESSAGES = [
  { text: "You're on fire! 🔥", subtitle: "Keep the heat going!", color: "from-amber-500 via-orange-500 to-red-500", glow: "rgba(249, 115, 22, 0.4)", icon: "local_fire_department" },
  { text: "Done well! Crushing it! ⚡", subtitle: "Momentum is real!", color: "from-emerald-500 via-teal-500 to-cyan-500", glow: "rgba(16, 185, 129, 0.4)", icon: "bolt" },
  { text: "Unstoppable! 🚀", subtitle: "One step closer to greatness!", color: "from-indigo-500 via-purple-500 to-pink-500", glow: "rgba(99, 102, 241, 0.4)", icon: "rocket_launch" },
  { text: "Flawless execution! 💎", subtitle: "Pure daily discipline!", color: "from-cyan-500 via-blue-500 to-indigo-500", glow: "rgba(6, 182, 212, 0.4)", icon: "diamond" },
  { text: "Habit conquered! 🏆", subtitle: "Streak leveled up!", color: "from-yellow-400 via-amber-500 to-orange-500", glow: "rgba(245, 158, 11, 0.4)", icon: "trophy" },
  { text: "Locked in! 🎯", subtitle: "Outstanding focus!", color: "from-violet-500 via-purple-600 to-fuchsia-600", glow: "rgba(168, 85, 247, 0.4)", icon: "target" },
];

/**
 * Triggers Android hardware vibration pattern
 */
export function triggerHapticCelebration() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // Android pattern: short tick, pause, medium tick, pause, strong finish
      navigator.vibrate([40, 50, 45, 60, 70]);
    } catch {
      // Ignore vibration unsupported errors
    }
  }
}

export default function CompletionCelebration({ celebration, onDismiss }) {
  const [currentPraise, setCurrentPraise] = useState(null);

  useEffect(() => {
    if (celebration && celebration.id) {
      triggerHapticCelebration();
      const randomIdx = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
      setCurrentPraise(CELEBRATION_MESSAGES[randomIdx]);

      const timer = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 1900);

      return () => clearTimeout(timer);
    }
  }, [celebration?.id]);

  return (
    <AnimatePresence>
      {celebration && currentPraise && (
        <div className="fixed inset-0 pointer-events-none z-[95] flex flex-col items-center justify-start pt-20 sm:pt-24 px-4 overflow-hidden">
          {/* Confetti sparkle rings */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.4, 2.2], opacity: [0, 0.7, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute top-28 w-44 h-44 rounded-full border-2 border-dashed border-primary/40 pointer-events-none"
          />

          {/* Floating animated Praise Toast */}
          <motion.div
            key={celebration.id}
            initial={{ opacity: 0, y: -40, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="relative max-w-sm w-full mx-auto"
          >
            <div
              className={`p-3.5 sm:p-4 rounded-3xl bg-surface-container-lowest/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl flex items-center gap-3.5`}
              style={{
                boxShadow: `0 20px 40px -10px ${currentPraise.glow}, 0 0 15px 0 ${currentPraise.glow}`
              }}
            >
              {/* Vibrant Badge Icon */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentPraise.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                <Icon name={currentPraise.icon} size={26} className="text-white animate-bounce" />
              </div>

              {/* Praise Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-headline font-black text-sm sm:text-base text-on-surface tracking-tight truncate">
                    {currentPraise.text}
                  </h3>
                </div>
                <p className="text-xs font-semibold text-primary truncate">
                  {celebration.title || currentPraise.subtitle}
                </p>
                <p className="text-[10px] text-outline truncate font-medium">
                  {currentPraise.subtitle}
                </p>
              </div>

              {/* Done check badge */}
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name="check" size={16} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
