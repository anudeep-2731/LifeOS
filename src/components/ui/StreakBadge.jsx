import React from 'react';
import { motion } from 'framer-motion';

export default function StreakBadge({ count = 5, compact = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 rounded-full font-headline font-extrabold shadow-xs border transition-all ${
        compact
          ? 'px-2 py-0.5 bg-amber-500/10 border-amber-500/30 text-amber-600 text-[10px]'
          : 'px-3 py-1 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 border-amber-500/30 text-amber-700 text-xs'
      }`}
      title="Daily Habit Streak — Keep checking in daily to hold your streak!"
    >
      <motion.span
        animate={{ scale: [1, 1.25, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="text-sm select-none"
      >
        🔥
      </motion.span>
      <span>{count} {compact ? 'D' : 'Day Streak'}</span>
    </motion.div>
  );
}
