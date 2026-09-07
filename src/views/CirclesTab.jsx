import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon';
import CreateCircleModal from '../components/circles/CreateCircleModal';
import JoinCircleModal from '../components/circles/JoinCircleModal';
import CircleSettingsSheet from '../components/circles/CircleSettingsSheet';
import MemberDetailSheet from '../components/circles/MemberDetailSheet';
import PostComposer from '../components/circles/PostComposer';
import CirclePostCard from '../components/circles/CirclePostCard';
import {
  fetchMyCircles,
  fetchCircleMembers,
  fetchCircleDailySnapshots,
  fetchCirclePosts,
  publishDailySnapshot,
  getSupabase
} from '../lib/supabase';

// Instagram-style story bubble for each Gang (Circle)
function GangStoryBubble({ circle, isActive, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
    >
      <div
        className={`relative w-[62px] h-[62px] rounded-full p-[3px] transition-all ${
          isActive
            ? 'bg-gradient-to-tr from-pink-500 via-purple-500 to-primary shadow-md scale-105'
            : 'bg-surface-container-high hover:bg-outline-variant/40'
        }`}
      >
        <div className="w-full h-full rounded-full bg-surface-container-lowest border-2 border-surface-container-lowest flex items-center justify-center font-headline font-extrabold text-lg text-primary shadow-inner">
          {circle.name?.charAt(0).toUpperCase() || 'G'}
        </div>
        {isActive && (
          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-secondary border-2 border-surface-container-lowest flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
        )}
      </div>
      <span className={`text-[11px] font-bold max-w-[68px] truncate transition-colors ${
        isActive ? 'text-primary font-headline' : 'text-on-surface-variant group-hover:text-on-surface'
      }`}>
        {circle.name}
      </span>
    </motion.button>
  );
}

// Add Gang Story Bubble (+)
function AddGangStoryBubble({ onCreate, onJoin }) {
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-1.5 flex-shrink-0">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpenMenu(prev => !prev)}
        className="w-[62px] h-[62px] rounded-full bg-surface-container-low border-2 border-dashed border-primary/40 flex items-center justify-center text-primary hover:bg-primary/5 transition-colors"
      >
        <Icon name="add" className="text-2xl" />
      </motion.button>
      <span className="text-[11px] font-bold text-on-surface-variant">New Gang</span>

      <AnimatePresence>
        {openMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute left-0 top-16 z-30 bg-surface-container-lowest backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-2xl p-2 w-40 space-y-1"
          >
            <button
              onClick={() => { onCreate(); setOpenMenu(false); }}
              className="w-full px-3 py-2 text-left text-xs font-bold text-on-surface hover:bg-surface-container-high rounded-xl flex items-center gap-2"
            >
              <Icon name="groups" className="text-primary text-base" />
              <span>Create Circle</span>
            </button>
            <button
              onClick={() => { onJoin(); setOpenMenu(false); }}
              className="w-full px-3 py-2 text-left text-xs font-bold text-on-surface hover:bg-surface-container-high rounded-xl flex items-center gap-2"
            >
              <Icon name="group_add" className="text-secondary text-base" />
              <span>Join Circle</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact Member Leaderboard Chip (in squad strip)
function MemberLeaderboardChip({ member, snapshot, rank, isCurrentUser, onClick }) {
  const routineScore = snapshot?.routine_score ?? 0;
  const taskScore = snapshot?.task_score ?? 0;
  const hasData = !!snapshot;
  const avgScore = hasData ? Math.round((routineScore + taskScore) / 2) : null;
  const finStatus = snapshot?.financial_status || null;

  const ringColor = avgScore >= 80 ? '#006d36' : avgScore >= 50 ? '#d97706' : '#005da7';
  const rankBadge = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔥';

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 pr-4 rounded-2xl flex-shrink-0 transition-all border shadow-xs cursor-pointer ${
        isCurrentUser
          ? 'bg-primary/5 border-primary/30 text-on-surface ring-1 ring-primary/20'
          : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/40'
      }`}
    >
      <div
        className="relative w-11 h-11 rounded-full p-[2px]"
        style={{
          background: hasData
            ? `conic-gradient(${ringColor} ${avgScore}%, rgba(0,0,0,0.08) ${avgScore}%)`
            : 'rgba(0,0,0,0.08)'
        }}
      >
        <div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center font-headline font-extrabold text-xs text-on-surface">
          {member.user_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {hasData && (
          <span className="absolute -bottom-1 -right-1 text-[11px] leading-none">
            {rankBadge}
          </span>
        )}
      </div>

      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-headline font-bold text-on-surface max-w-[90px] truncate">
            {isCurrentUser ? 'You' : member.user_name}
          </span>
          {finStatus === 'Over Budget' && (
            <span className="w-2 h-2 rounded-full bg-error" title="Over Budget" />
          )}
          {finStatus === 'Warning' && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Warning" />
          )}
          {finStatus === 'On Track' && (
            <span className="w-2 h-2 rounded-full bg-secondary" title="On Track" />
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] font-extrabold" style={{ color: hasData ? ringColor : '#717783' }}>
            {hasData ? `${avgScore}% score` : 'No check-in'}
          </span>
          <span className="text-[9px] text-on-surface-variant/60">• Inspect ➔</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function CirclesTab() {
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  
  // Member Detail Sheet (Scorecard bottom sheet)
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getSupabase();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) setCurrentUserId(session.user.id);
      }
      await publishDailySnapshot(todayStr);
      const myCircles = await fetchMyCircles();
      setCircles(myCircles);
      if (myCircles.length > 0) {
        const active = selectedCircle
          ? myCircles.find(c => c.id === selectedCircle.id) || myCircles[0]
          : myCircles[0];
        setSelectedCircle(active);
      } else {
        setSelectedCircle(null);
      }
    } catch (err) {
      console.error('Error loading circles:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  const loadCircleDetails = useCallback(async (circleId) => {
    if (!circleId) return;
    const [memberList, snapshotList, postList] = await Promise.all([
      fetchCircleMembers(circleId),
      fetchCircleDailySnapshots(todayStr),
      fetchCirclePosts(circleId),
    ]);
    setMembers(memberList);
    const snapshotMap = {};
    snapshotList.forEach(s => { snapshotMap[s.user_id] = s; });
    setSnapshots(snapshotMap);
    setPosts(postList);
  }, [todayStr]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedCircle) loadCircleDetails(selectedCircle.id);
  }, [selectedCircle, loadCircleDetails]);

  // Sort members by performance score for leaderboard order
  const sortedMembers = [...members].sort((a, b) => {
    const sA = snapshots[a.user_id];
    const sB = snapshots[b.user_id];
    const scoreA = sA ? (sA.routine_score + sA.task_score) / 2 : -1;
    const scoreB = sB ? (sB.routine_score + sB.task_score) / 2 : -1;
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* ── TOP HEADER BAR ── */}
      <div className="px-4 pt-5 pb-3 bg-surface-container-lowest border-b border-outline-variant/20 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span>Circles & Gangs</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                Social
              </span>
            </h1>
            <p className="text-xs text-on-surface-variant">Daily accountability with your close squad</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-9 h-9 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors border border-outline-variant/30"
              title="Join via Code"
            >
              <Icon name="group_add" className="text-base" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-primary text-on-primary text-xs font-headline font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <Icon name="add" className="text-sm" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* ── INSTAGRAM-STYLE GANG STORIES ROW ── */}
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1.5">
          <AddGangStoryBubble
            onCreate={() => setShowCreateModal(true)}
            onJoin={() => setShowJoinModal(true)}
          />

          {circles.map(circle => (
            <GangStoryBubble
              key={circle.id}
              circle={circle}
              isActive={selectedCircle?.id === circle.id}
              onClick={() => setSelectedCircle(circle)}
            />
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant/50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <Icon name="sync" className="text-3xl text-primary mb-2" />
          </motion.div>
          <p className="text-xs font-medium mt-2">Loading your gang feed…</p>
        </div>
      ) : circles.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white mb-5 shadow-lg shadow-primary/20"
          >
            <Icon name="groups" className="text-4xl" />
          </motion.div>
          <h2 className="text-lg font-headline font-bold text-on-surface mb-1">No Gangs Joined Yet</h2>
          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed mb-8">
            Create an 8-member circle or join an existing gang to share daily progress snaps and compete on scorecards!
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-5 py-2.5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Icon name="group_add" className="text-sm text-secondary" />
              Join via Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-primary text-on-primary text-xs font-bold shadow-md hover:brightness-110 flex items-center gap-1.5"
            >
              <Icon name="add" className="text-sm" />
              Create Circle
            </button>
          </div>
        </div>
      ) : selectedCircle ? (
        <div className="px-4 pt-4">
          {/* Active Circle Title & Settings Bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-headline font-bold text-on-surface">
                  {selectedCircle.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                  {members.length}/8 members
                </span>
              </div>
              {selectedCircle.description && (
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                  {selectedCircle.description}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowSettingsSheet(true)}
              className="w-9 h-9 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center transition-colors shadow-xs"
              title="Circle Settings"
            >
              <Icon name="settings" className="text-base" />
            </button>
          </div>

          {/* ── SQUAD PERFORMANCE LEADERBOARD STRIP ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h3 className="text-xs font-headline font-bold text-on-surface flex items-center gap-1.5">
                <span>Squad Performance</span>
                <span className="text-[10px] text-on-surface-variant font-normal">(Tap for detailed scorecard)</span>
              </h3>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-2 pt-0.5">
              {sortedMembers.map((member, idx) => (
                <MemberLeaderboardChip
                  key={member.id}
                  member={member}
                  snapshot={snapshots[member.user_id]}
                  rank={idx + 1}
                  isCurrentUser={member.user_id === currentUserId}
                  onClick={() => setSelectedMemberDetail(member)}
                />
              ))}
            </div>
          </div>

          {/* ── INSTAGRAM SNAP FEED SECTION ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-headline font-bold text-on-surface flex items-center gap-1.5">
                <span>📸 Activity & Snaps</span>
              </h3>
            </div>

            {/* Post Composer */}
            <PostComposer
              circleId={selectedCircle.id}
              onPostCreated={() => loadCircleDetails(selectedCircle.id)}
            />

            {/* Feed Posts */}
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant/60 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30">
                <span className="text-4xl mb-3">📷</span>
                <p className="text-sm font-headline font-bold text-on-surface">No snaps shared today</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Snap a photo of your workout, meal, or productivity milestone above to motivate your gang!
                </p>
              </div>
            ) : (
              posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CirclePostCard
                    post={post}
                    currentUserId={currentUserId}
                    onPostUpdated={() => loadCircleDetails(selectedCircle.id)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* ── MODALS & SHEETS ── */}
      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(circle) => {
          setCircles(prev => [...prev, circle]);
          setSelectedCircle(circle);
        }}
      />
      <JoinCircleModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={() => loadData()}
      />
      <CircleSettingsSheet
        isOpen={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        circle={selectedCircle}
        members={members}
        currentUserId={currentUserId}
        onCircleUpdated={loadData}
      />
      <MemberDetailSheet
        isOpen={!!selectedMemberDetail}
        onClose={() => setSelectedMemberDetail(null)}
        member={selectedMemberDetail}
        snapshot={selectedMemberDetail ? snapshots[selectedMemberDetail.user_id] : null}
        isCurrentUser={selectedMemberDetail?.user_id === currentUserId}
      />
    </div>
  );
}
