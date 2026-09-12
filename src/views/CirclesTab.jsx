import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon';
import CreateCircleModal from '../components/circles/CreateCircleModal';
import JoinCircleModal from '../components/circles/JoinCircleModal';
import CircleSettingsSheet from '../components/circles/CircleSettingsSheet';
import MemberDetailSheet from '../components/circles/MemberDetailSheet';
import SquadScorecardsModal from '../components/circles/SquadScorecardsModal';
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
        className={`relative w-[60px] h-[60px] rounded-full p-[3px] transition-all ${
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
        className="w-[60px] h-[60px] rounded-full bg-surface-container-low border-2 border-dashed border-primary/40 flex items-center justify-center text-primary hover:bg-primary/5 transition-colors"
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
  const [showScorecardsModal, setShowScorecardsModal] = useState(false);
  
  // Member Detail Sheet
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

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* ── TOP HEADER BAR ── */}
      <div className="px-4 pt-4 pb-3 bg-surface-container-lowest border-b border-outline-variant/20 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span>Circles & Gangs</span>
            </h1>
            <p className="text-xs text-on-surface-variant">Daily accountability squad feed</p>
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
              className="px-3.5 py-2 rounded-2xl bg-primary text-on-primary text-xs font-headline font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1"
            >
              <Icon name="add" className="text-sm" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* ── INSTAGRAM-STYLE GANG STORIES ROW ── */}
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1">
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
          <p className="text-xs font-medium mt-2">Loading squad feed…</p>
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
            Create an 8-member circle or join an existing gang to share daily progress snaps and tips!
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
          {/* Active Circle Title & Leaderboard Button */}
          <div className="flex items-center justify-between mb-4 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/20 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-headline font-bold text-on-surface">
                  {selectedCircle.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                  {members.length}/8 members
                </span>
              </div>
              {selectedCircle.description && (
                <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                  {selectedCircle.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScorecardsModal(true)}
                className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1 border border-primary/20"
                title="View Squad Scorecards"
              >
                <span>🏆 Scorecards</span>
              </button>

              <button
                onClick={() => setShowSettingsSheet(true)}
                className="w-8 h-8 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
                title="Circle Settings"
              >
                <Icon name="settings" className="text-base" />
              </button>
            </div>
          </div>

          {/* ── INSTAGRAM SNAP & WISDOM FEED ── */}
          <div className="space-y-4">
            {/* Post Composer */}
            <PostComposer
              circleId={selectedCircle.id}
              onPostCreated={() => loadCircleDetails(selectedCircle.id)}
            />

            {/* Feed Posts */}
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant/60 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30">
                <span className="text-4xl mb-3">📸</span>
                <p className="text-sm font-headline font-bold text-on-surface">No snaps shared today</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Snap a photo of your workout or share a squad advice tip above!
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
      <SquadScorecardsModal
        isOpen={showScorecardsModal}
        onClose={() => setShowScorecardsModal(false)}
        circle={selectedCircle}
        members={members}
        snapshots={snapshots}
        currentUserId={currentUserId}
        onSelectMember={(member) => setSelectedMemberDetail(member)}
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
