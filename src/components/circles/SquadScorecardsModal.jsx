import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import MemberScoreCard from './MemberScoreCard';

export default function SquadScorecardsModal({ isOpen, onClose, circle, members, snapshots, currentUserId, onSelectMember }) {
  if (!isOpen || !circle) return null;

  // Sort members by daily performance score
  const sortedMembers = [...members].sort((a, b) => {
    const sA = snapshots[a.user_id];
    const sB = snapshots[b.user_id];
    const scoreA = sA ? (sA.routine_score + sA.task_score) / 2 : -1;
    const scoreB = sB ? (sB.routine_score + sB.task_score) / 2 : -1;
    return scoreB - scoreA;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal / Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-outline-variant/30 max-h-[85vh] flex flex-col"
        >
          {/* Mobile Drag Pill */}
          <div className="w-12 h-1.5 rounded-full bg-surface-container-high mx-auto mb-4 sm:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-headline font-extrabold text-base">
                🏆
              </div>
              <div>
                <h3 className="text-base font-headline font-extrabold text-on-surface">
                  {circle.name} Leaderboard
                </h3>
                <p className="text-xs text-on-surface-variant">Daily squad accountability & scorecards</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>

          {/* Members Scorecards Scroll Area */}
          <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
            {sortedMembers.map((member, idx) => (
              <div key={member.id} className="relative">
                <div className="absolute -top-2 left-4 z-20 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-extrabold shadow-xs">
                  Rank #{idx + 1} {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                </div>
                <MemberScoreCard
                  member={member}
                  snapshot={snapshots[member.user_id]}
                  isCurrentUser={member.user_id === currentUserId}
                  onClick={() => {
                    onClose();
                    if (onSelectMember) onSelectMember(member);
                  }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
