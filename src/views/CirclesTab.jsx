import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon';
import CreateCircleModal from '../components/circles/CreateCircleModal';
import JoinCircleModal from '../components/circles/JoinCircleModal';
import CircleSettingsSheet from '../components/circles/CircleSettingsSheet';
import SquadScorecardsModal from '../components/circles/SquadScorecardsModal';
import PostComposer from '../components/circles/PostComposer';
import CirclePostCard from '../components/circles/CirclePostCard';
import MemberScoreCard from '../components/circles/MemberScoreCard';
import {
  fetchMyCircles,
  fetchCircleMembers,
  fetchCircleDailySnapshots,
  fetchCirclePosts,
  publishDailySnapshot,
  fetchUserProfileName,
  getSupabase
} from '../lib/supabase';

export default function CirclesTab() {
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');

  // Dropdown & Modals state
  const [showSquadDropdown, setShowSquadDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showScorecardsModal, setShowScorecardsModal] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  // Member Detail Sheet
  const [selectedMember, setSelectedMember] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getSupabase();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session) setCurrentUserId(session.user.id);
      }

      const name = await fetchUserProfileName();
      if (name) setCurrentUserName(name);

      await publishDailySnapshot(todayStr).catch(console.error);

      const myCircles = await fetchMyCircles();
      setCircles(myCircles || []);

      if (myCircles && myCircles.length > 0) {
        const active = selectedCircle
          ? myCircles.find(c => c.id === selectedCircle.id) || myCircles[0]
          : myCircles[0];
        
        setSelectedCircle(active);

        const [mList, snaps, pList] = await Promise.all([
          fetchCircleMembers(active.id),
          fetchCircleDailySnapshots(active.id, todayStr),
          fetchCirclePosts(active.id),
        ]);

        setMembers(mList || []);
        setSnapshots(snaps || {});
        setPosts(pList || []);
      }
    } catch (err) {
      console.error('Failed to load circle data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCircle, todayStr]);

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSquadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCircle = async (circle) => {
    setSelectedCircle(circle);
    setShowSquadDropdown(false);
    setLoading(true);
    try {
      const [mList, snaps, pList] = await Promise.all([
        fetchCircleMembers(circle.id),
        fetchCircleDailySnapshots(circle.id, todayStr),
        fetchCirclePosts(circle.id),
      ]);
      setMembers(mList || []);
      setSnapshots(snaps || {});
      setPosts(pList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComposer = () => {
    if (!selectedCircle) {
      setShowCreateModal(true);
    } else {
      setShowComposer(prev => !prev);
    }
  };

  // Calculate squad momentum & active counts
  const activeCount = members.length;
  const totalRoutinesCompleted = Object.values(snapshots).reduce(
    (acc, s) => acc + (s?.routines_completed || 0), 0
  );

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 select-none max-w-lg mx-auto gap-4">
      {/* 1. TOP HEADER BAR WITH SQUAD SELECTOR DROPDOWN */}
      <header className="flex items-center justify-between pt-1">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowSquadDropdown(prev => !prev)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-on-surface font-headline text-sm font-bold tracking-tight transition-all active:scale-95 shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span>{selectedCircle?.name || 'Select Squad'}</span>
            <Icon name="keyboard_arrow_down" size={18} className={`text-on-surface-variant transition-transform ${showSquadDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Squad Switcher Dropdown Menu */}
          <AnimatePresence>
            {showSquadDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                className="absolute left-0 top-12 z-50 w-64 rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30 p-2 space-y-1"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-outline border-b border-outline-variant/15">
                  Your Squads ({circles.length})
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
                  {circles.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-on-surface-variant italic">
                      No squads joined yet
                    </div>
                  ) : (
                    circles.map((c) => {
                      const isSelected = selectedCircle?.id === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCircle(c)}
                          className={`w-full px-3 py-2.5 rounded-xl text-left font-headline text-xs font-bold flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-on-surface hover:bg-surface-container-low'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              {c.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <span className="truncate">{c.name}</span>
                          </div>
                          {isSelected && <Icon name="check" size={16} className="text-primary" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1 border-t border-outline-variant/15 grid grid-cols-2 gap-1">
                  <button
                    onClick={() => { setShowSquadDropdown(false); setShowCreateModal(true); }}
                    className="w-full px-2.5 py-2 text-center text-xs font-bold text-primary hover:bg-primary/10 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Icon name="add" size={14} />
                    <span>Create</span>
                  </button>
                  <button
                    onClick={() => { setShowSquadDropdown(false); setShowJoinModal(true); }}
                    className="w-full px-2.5 py-2 text-center text-xs font-bold text-secondary hover:bg-secondary/10 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Icon name="group_add" size={14} />
                    <span>Join</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Circle Settings"
          >
            <Icon name="tune" size={20} />
          </button>
          <button
            onClick={handleToggleComposer}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label text-xs font-bold shadow-sm active:scale-95 transition-transform"
          >
            <Icon name={showComposer ? "close" : "add"} size={16} />
            <span>{showComposer ? "Cancel" : "Post"}</span>
          </button>
        </div>
      </header>

      {/* 2. CIRCLE PULSE BAR (Gradient Border Card) */}
      <div className="w-full rounded-2xl p-[1.5px] bg-gradient-to-r from-primary via-purple-500 to-secondary shadow-sm overflow-hidden">
        <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-[15px] flex flex-col p-3 gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="font-headline text-xs font-bold text-on-surface">Squad Pulse</span>
              <span className="text-[10px] font-label text-on-surface-variant">· {selectedCircle?.name || 'Squad'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-on-surface font-label text-[10px] font-semibold">
                <Icon name="group" size={12} className="text-primary" />
                <span>{activeCount}/8 Active</span>
              </div>
              <button
                onClick={() => setShowSquadDropdown(prev => !prev)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label text-[10px] font-semibold hover:bg-primary-fixed/80 transition-colors active:scale-95"
              >
                <Icon name="swap_horiz" size={12} />
                <span>Switch</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="font-label text-[10px] text-on-surface-variant font-medium">Momentum</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-sm font-bold text-on-surface">🔥 {totalRoutinesCompleted > 0 ? totalRoutinesCompleted : '4'} Streaks</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant font-label text-[10px] font-semibold">
                Syncing
              </span>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="font-label text-[10px] text-on-surface-variant font-medium">Your Pace</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-sm font-bold text-on-surface">85%</span>
                  <span className="font-body text-[10px] text-secondary font-semibold">On Track</span>
                </div>
              </div>
              <span className="font-data text-[10px] text-primary font-bold">3/4 Done</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-full bg-surface-container-highest/80 rounded-full h-1.5 overflow-hidden p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-xs" style={{ width: '85%' }}></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
              <span className="font-body">Squad Daily Target</span>
              <span className="font-data font-semibold text-on-surface">Target: 100% by 8 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MEMBER AVATARS STORY ROW (Strictly Members Pics) */}
      <div className="w-full overflow-x-auto scrollbar-none flex items-center gap-3.5 py-1">
        {members.length === 0 ? (
          <div className="text-xs text-on-surface-variant italic px-1 py-2">
            No members in this circle yet
          </div>
        ) : (
          members.map((mem) => {
            const snap = snapshots[mem.user_id];
            const isDone = (snap?.routines_completed || 0) > 0;
            const displayName = mem.display_name || mem.user_name || 'Member';

            return (
              <motion.button
                whileTap={{ scale: 0.92 }}
                key={mem.user_id || mem.id}
                onClick={() => setSelectedMember(mem)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
                title={`View ${displayName}'s scorecard`}
              >
                <div className={`w-[60px] h-[60px] rounded-full p-[2.5px] flex items-center justify-center transition-transform active:scale-95 ${
                  isDone ? 'bg-secondary' : 'bg-primary-container'
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-lowest border-2 border-white flex items-center justify-center text-primary font-headline font-bold text-base shadow-inner">
                    {displayName[0].toUpperCase()}
                  </div>
                </div>
                <span className="font-label text-xs text-on-surface max-w-[68px] truncate text-center font-medium">
                  {displayName}
                </span>
              </motion.button>
            );
          })
        )}
      </div>

      {/* 4. ACTION BANNER: SQUAD SCORECARDS */}
      <button
        onClick={() => setShowScorecardsModal(true)}
        className="w-full h-12 rounded-full bg-secondary-container text-on-secondary-container font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform"
      >
        <Icon name="emoji_events" size={18} filled />
        <span>🏆 Squad Scorecards · Weekly Leaderboard</span>
      </button>

      {/* 5. POST COMPOSER CARD (Visible when showComposer is true) */}
      <AnimatePresence>
        {showComposer && selectedCircle && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <PostComposer
              circleId={selectedCircle.id}
              onPostCreated={() => {
                setShowComposer(false);
                loadData();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. SOCIAL FEED */}
      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="p-6 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xs">
            <Icon name="campaign" size={32} className="text-primary opacity-60 mx-auto mb-2" />
            <p className="font-headline font-bold text-sm text-on-surface">No updates yet today</p>
            <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
              Be the first to share your progress or post a workout proof to motivate your squad!
            </p>
            <button
              onClick={handleToggleComposer}
              className="mt-3 px-4 py-2 bg-primary text-white rounded-full font-label text-xs font-bold shadow-sm active:scale-95 transition-transform"
            >
              Post Progress
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <CirclePostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostUpdated={() => loadData()}
            />
          ))
        )}
      </div>

      {/* Modals & Sheets */}
      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadData()}
      />

      <JoinCircleModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={() => loadData()}
      />

      <SquadScorecardsModal
        isOpen={showScorecardsModal}
        onClose={() => setShowScorecardsModal(false)}
        members={members}
        circleName={selectedCircle?.name || 'Titan Squad'}
      />

      <CircleSettingsSheet
        isOpen={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        circle={selectedCircle}
        members={members}
        currentUserId={currentUserId}
        onCircleUpdated={() => loadData()}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenJoin={() => setShowJoinModal(true)}
      />

      {selectedMember && (
        <MemberScoreCard
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
