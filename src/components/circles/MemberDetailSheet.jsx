import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';

function CircularScore({ score, color, label, subtext }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const validScore = score !== null && score !== undefined ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          {/* Background Track */}
          <circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-surface-container-high"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-headline font-extrabold text-on-surface">
            {score !== null ? `${validScore}%` : '--'}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-on-surface">{label}</p>
        {subtext && <p className="text-[10px] text-on-surface-variant">{subtext}</p>}
      </div>
    </div>
  );
}

function FinancialBadge({ status }) {
  const config = {
    'Over Budget': { color: 'text-error', bg: 'bg-error/10 border-error/20', icon: '⚠️', text: 'Over Budget' },
    'Warning':     { color: 'text-amber-700', bg: 'bg-amber-500/10 border-amber-500/20', icon: '📊', text: 'Nearing Limit' },
    'On Track':    { color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20', icon: '✅', text: 'On Track' },
  };
  const { color, bg, icon, text } = config[status] || config['On Track'];

  return (
    <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${bg} ${color}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function MemberDetailSheet({ isOpen, onClose, member, snapshot, isCurrentUser }) {
  if (!isOpen || !member) return null;

  const routineScore = snapshot?.routine_score ?? null;
  const taskScore = snapshot?.task_score ?? null;
  const finStatus = snapshot?.financial_status || null;
  const hasData = snapshot !== undefined && snapshot !== null;

  const overallScore = (routineScore !== null && taskScore !== null)
    ? Math.round((routineScore + taskScore) / 2)
    : (routineScore ?? taskScore ?? 0);

  const getStatusText = (score) => {
    if (!hasData) return { label: 'No check-in yet today', emoji: '⏳' };
    if (score >= 85) return { label: 'Crushing It Today!', emoji: '🔥' };
    if (score >= 65) return { label: 'Solid Progress', emoji: '💪' };
    if (score >= 40) return { label: 'Gaining Momentum', emoji: '⚡' };
    return { label: 'Off to a Slow Start', emoji: '🌱' };
  };

  const statusInfo = getStatusText(overallScore);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-t-[2.5rem] p-6 shadow-2xl border-t border-outline-variant/30 max-h-[90vh] overflow-y-auto"
        >
          {/* Drag Pill */}
          <div className="w-12 h-1.5 rounded-full bg-surface-container-high mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center font-headline font-extrabold text-lg shadow-md">
                  {member.user_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {isCurrentUser && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary text-white border-2 border-surface-container-lowest flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-headline font-bold text-on-surface">
                    {member.user_name}
                  </h3>
                  {isCurrentUser && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-extrabold">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">Daily Accountability Scorecard</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>

          {/* Performance Hero Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant/30 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{statusInfo.emoji}</span>
              <div>
                <p className="text-xs font-bold text-on-surface">{statusInfo.label}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {hasData ? `Overall Score: ${overallScore}%` : 'Waiting for daily check-in'}
                </p>
              </div>
            </div>
            {hasData && finStatus && <FinancialBadge status={finStatus} />}
          </div>

          {/* Circular Score Metrics */}
          {hasData ? (
            <div className="bg-surface-container-low/50 rounded-3xl p-5 border border-outline-variant/20 mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant mb-4 uppercase tracking-wider text-center">
                Today's Breakdown
              </h4>
              <div className="flex items-center justify-around">
                <CircularScore
                  score={routineScore}
                  color="#005da7"
                  label="Routines"
                  subtext="Daily habits completed"
                />
                <div className="w-px h-16 bg-outline-variant/30" />
                <CircularScore
                  score={taskScore}
                  color="#006d36"
                  label="Tasks"
                  subtext="Scheduled tasks done"
                />
                <div className="w-px h-16 bg-outline-variant/30" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-2xl shadow-inner">
                    {finStatus === 'On Track' ? '💚' : finStatus === 'Warning' ? '🟡' : '🔴'}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-on-surface">Financial Status</p>
                    <p className="text-[10px] text-on-surface-variant">{finStatus || 'On Track'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/40 mb-6">
              <span className="text-3xl block mb-2">📊</span>
              <p className="text-xs font-semibold text-on-surface">No activity posted yet today</p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Scores will automatically sync when {isCurrentUser ? 'you complete tasks or routines' : `${member.user_name} checks in`}.
              </p>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-2.5">
            <Icon name="shield" className="text-primary text-base flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface font-semibold">Privacy First:</strong> Only percentage completion scores and high-level financial status badges are shared with your squad. Detailed financial amounts and private notes are never visible.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
