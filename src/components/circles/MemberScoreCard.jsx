import React from 'react';
import { motion } from 'framer-motion';

function CircularScore({ score, color, label }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          <circle
            cx="25" cy="25" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-surface-container-high"
          />
          <motion.circle
            cx="25" cy="25" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-extrabold text-on-surface">{score}%</span>
        </div>
      </div>
      <span className="text-[10px] text-on-surface-variant font-medium">{label}</span>
    </div>
  );
}

function FinancialBadge({ status }) {
  const config = {
    'Over Budget': { color: 'text-error', bg: 'bg-error/10 border-error/20', icon: '⚠️' },
    'Warning':     { color: 'text-amber-700', bg: 'bg-amber-500/10 border-amber-500/20', icon: '📊' },
    'On Track':    { color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20', icon: '✅' },
  };
  const { color, bg, icon } = config[status] || config['On Track'];

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${bg} ${color}`}>
      <span>{icon}</span>
      <span>{status}</span>
    </div>
  );
}

export default function MemberScoreCard({ member, snapshot, isCurrentUser, onClick }) {
  const routineScore = snapshot?.routine_score ?? null;
  const taskScore = snapshot?.task_score ?? null;
  const finStatus = snapshot?.financial_status || null;
  const hasData = snapshot !== undefined && snapshot !== null;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-3xl p-4 cursor-pointer transition-all shadow-card border ${
        isCurrentUser
          ? 'bg-surface-container-lowest border-primary/40 ring-2 ring-primary/20'
          : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
            {member.user_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-headline font-bold text-on-surface">{member.user_name}</h4>
              {isCurrentUser && (
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-extrabold">You</span>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant">Tap to inspect detailed scorecard</p>
          </div>
        </div>

        {hasData && finStatus && <FinancialBadge status={finStatus} />}
      </div>

      {hasData ? (
        <div className="flex items-center justify-around pt-1">
          <CircularScore score={routineScore} color="#005da7" label="Routines" />
          <div className="w-px h-10 bg-outline-variant/30" />
          <CircularScore score={taskScore} color="#006d36" label="Tasks" />
          <div className="w-px h-10 bg-outline-variant/30" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-xl">
              {finStatus === 'On Track' ? '💚' : finStatus === 'Warning' ? '🟡' : '🔴'}
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium">Finance</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 text-on-surface-variant/60 gap-2">
          <span className="text-sm">⏳</span>
          <span className="text-xs">No check-in posted yet today</span>
        </div>
      )}
    </motion.div>
  );
}
