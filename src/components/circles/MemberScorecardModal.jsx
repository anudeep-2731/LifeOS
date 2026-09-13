import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';

function CircularFactor({ score, color, label, subtext, icon }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const validScore = score !== null && score !== undefined ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/15 flex-1 min-w-[120px]">
      <div className="relative w-18 h-18">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-surface-container-high"
          />
          {/* Active Ring */}
          <motion.circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-mono font-black text-on-surface">
            {score !== null && score !== undefined ? `${validScore}%` : '--'}
          </span>
          {icon && <span className="text-[10px] leading-none">{icon}</span>}
        </div>
      </div>
      <div className="text-center min-w-0">
        <span className="text-xs font-headline font-bold text-on-surface block truncate">
          {label}
        </span>
        {subtext && (
          <span className="text-[10px] text-on-surface-variant block mt-0.5 leading-tight">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MemberScorecardModal({
  isOpen,
  onClose,
  member,
  snapshot,
  isCurrentUser,
  circleName = 'Squad'
}) {
  const [cheered, setCheered] = useState(false);

  if (!isOpen || !member) return null;

  const displayName = member.display_name || member.user_name || 'Member';
  const role = member.role || 'Member';

  // Extract factors with intelligent defaults
  const routineScore = snapshot?.routine_score !== undefined && snapshot?.routine_score !== null
    ? snapshot.routine_score
    : (isCurrentUser ? 0 : 75); // sensible baseline if member hasn't synced yet today

  const taskScore = snapshot?.task_score !== undefined && snapshot?.task_score !== null
    ? snapshot.task_score
    : (isCurrentUser ? 0 : 80);

  const finStatus = snapshot?.financial_status || 'On Track';

  // Calculate Financial Factor Score
  const finScore = finStatus === 'On Track' ? 100 : finStatus === 'Warning' ? 75 : 40;

  // Overall Consistency Factor (Weighted average: 50% Routine, 30% Financial, 20% Tasks)
  const overallFactor = Math.round((routineScore * 0.5) + (finScore * 0.3) + (taskScore * 0.2));

  const getPaceBadge = (factor) => {
    if (factor >= 80) return { label: 'Crushing It 🔥', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
    if (factor >= 50) return { label: 'Solid Momentum ⚡', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' };
    return { label: 'Building Habits 🌱', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
  };

  const paceBadge = getPaceBadge(overallFactor);

  const handleCheer = () => {
    setCheered(true);
    setTimeout(() => setCheered(false), 2400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal / Bottom Sheet Box */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 pb-10 sm:pb-6 shadow-2xl border border-outline-variant/25 flex flex-col gap-4.5 max-h-[90vh] overflow-y-auto"
        >
          {/* Drag Handle for mobile */}
          <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto sm:hidden -mt-1 mb-0.5" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-500 text-white font-headline font-black text-lg flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface truncate">
                    {displayName}
                  </h3>
                  {isCurrentUser && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xs text-on-surface-variant font-medium truncate">
                  {circleName} · {role}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Core Factor Hero Display */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-surface-container border border-primary/20 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                Overall Consistency Factor
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                  {overallFactor}%
                </span>
                <span className="text-xs font-semibold text-outline">
                  completion rate
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">
                Combined routine and financial execution
              </span>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${paceBadge.color} shrink-0`}>
              {paceBadge.label}
            </div>
          </div>

          {/* 2-Column Factors: Routines vs Financial */}
          <div className="grid grid-cols-2 gap-3">
            {/* Routine Completion Factor */}
            <CircularFactor
              score={routineScore}
              color="#0050cb"
              icon="⚡"
              label="Routines Factor"
              subtext={routineScore >= 80 ? 'Habits on point' : routineScore > 0 ? 'Habits in motion' : 'Pending today'}
            />

            {/* Financial Health Factor */}
            <CircularFactor
              score={finScore}
              color={finStatus === 'On Track' ? '#006d36' : finStatus === 'Warning' ? '#d97706' : '#ba1a1a'}
              icon={finStatus === 'On Track' ? '💎' : finStatus === 'Warning' ? '⚠️' : '🚨'}
              label="Financial Factor"
              subtext={finStatus === 'On Track' ? 'Calm & On Track' : finStatus === 'Warning' ? 'Nearing Limit' : 'Over Target'}
            />
          </div>

          {/* Micro Status Summary Row */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 text-center">
            <div className="flex flex-col items-center px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-outline">Routine Status</span>
              <span className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${routineScore > 0 ? 'bg-secondary' : 'bg-outline'}`} />
                {routineScore >= 100 ? 'All Completed' : routineScore > 0 ? `${routineScore}% Completed` : 'Not Started'}
              </span>
            </div>

            <div className="flex flex-col items-center px-1 border-l border-outline-variant/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-outline">Financial Health</span>
              <span className={`text-xs font-bold mt-0.5 ${
                finStatus === 'On Track' ? 'text-secondary' : finStatus === 'Warning' ? 'text-amber-600' : 'text-error'
              }`}>
                {finStatus === 'On Track' ? '✓ Safe & Sound' : finStatus === 'Warning' ? '⚠️ Near Budget' : '⚠️ Exceeded'}
              </span>
            </div>
          </div>

          {/* Interactive Cheer / Kudos Action */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCheer}
              className={`flex-1 h-11 rounded-2xl font-headline font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer ${
                cheered
                  ? 'bg-secondary text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              <Icon name={cheered ? "celebration" : "thumb_up"} size={16} />
              <span>{cheered ? `High-five sent to ${displayName}! 🎉` : `Give Kudos to ${displayName}`}</span>
            </button>
          </div>

          {/* Privacy Footnote */}
          <p className="text-[10px] text-center text-outline">
            🔒 High-level factors only. Private financial totals and personal note details remain confidential.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
