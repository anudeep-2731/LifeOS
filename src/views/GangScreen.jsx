import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import CreateCircleModal from '../components/circles/CreateCircleModal';
import JoinCircleModal from '../components/circles/JoinCircleModal';
import PostComposer from '../components/circles/PostComposer';
import SquadScorecardsModal from '../components/circles/SquadScorecardsModal';
import CircleSettingsSheet from '../components/circles/CircleSettingsSheet';
import MemberScoreCard from '../components/circles/MemberScoreCard';
import CirclePostCard from '../components/circles/CirclePostCard';
import {
  fetchMyCircles,
  fetchCircleMembers,
  fetchCirclePosts,
  createCirclePost,
  fetchUserProfileName,
} from '../lib/supabase';
import { getTodayStr } from '../db/database';

export default function GangScreen() {
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScorecardsModal, setShowScorecardsModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const today = getTodayStr();

  const loadCirclesData = async () => {
    setLoading(true);
    const [name, myCircles] = await Promise.all([
      fetchUserProfileName(),
      fetchMyCircles(),
    ]);

    if (name) setCurrentUserName(name);
    setCircles(myCircles || []);

    if (myCircles && myCircles.length > 0) {
      const activeCircle = selectedCircle || myCircles[0];
      setSelectedCircle(activeCircle);

      const [mList, pList] = await Promise.all([
        fetchCircleMembers(activeCircle.id),
        fetchCirclePosts(activeCircle.id),
      ]);

      setMembers(mList || []);
      setPosts(pList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCirclesData();
  }, []);

  const handleSelectCircle = async (circle) => {
    setSelectedCircle(circle);
    setLoading(true);
    const [mList, pList] = await Promise.all([
      fetchCircleMembers(circle.id),
      fetchCirclePosts(circle.id),
    ]);
    setMembers(mList || []);
    setPosts(pList || []);
    setLoading(false);
  };

  const handleCreatePost = async (postData) => {
    if (!selectedCircle) return;
    await createCirclePost({
      circleId: selectedCircle.id,
      postType: postData.postType || 'photo',
      caption: postData.content,
      photoUrl: postData.mediaUrl || null,
    });
    setShowComposer(false);
    loadCirclesData();
  };

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 select-none max-w-lg mx-auto gap-4">
      {/* 1. CIRCLE SELECTOR HEADER BAR */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-on-surface font-headline text-sm font-bold tracking-tight transition-all active:scale-95 shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span>{selectedCircle?.name || 'Titan Squad'}</span>
            <Icon name="keyboard_arrow_down" size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-on-primary font-label text-xs font-semibold shadow-sm active:scale-95 transition-transform"
          >
            <Icon name="add" size={16} />
            <span>Post</span>
          </button>
        </div>
      </div>

      {/* 2. CIRCLE PULSE BAR */}
      <div className="w-full rounded-2xl p-[1.5px] bg-gradient-to-r from-primary via-purple-500 to-secondary shadow-sm overflow-hidden">
        <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-[15px] flex flex-col p-3 gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="font-headline text-xs font-bold text-on-surface">Squad Pulse</span>
              <span className="text-[10px] font-label text-on-surface-variant">· {selectedCircle?.name || 'Titan'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-on-surface font-label text-[10px] font-semibold">
                <Icon name="group" size={12} className="text-primary" />
                <span>{members.length || 6}/8 Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="font-label text-[10px] text-on-surface-variant font-medium">Momentum</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-sm font-bold text-on-surface">🔥 4 Streaks</span>
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
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: '85%' }}></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
              <span className="font-body">Squad Daily Target</span>
              <span className="font-data font-semibold text-on-surface">Target: 100% by 8 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GANG STORY ROW */}
      <div className="w-full overflow-x-auto scrollbar-none flex items-center gap-3 py-1">
        {/* Render Members as Story Avatars */}
        {members.map((mem) => {
          const isDone = mem.score >= 80;
          return (
            <button
              key={mem.user_id}
              onClick={() => setSelectedMember(mem)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div className={`w-14 h-14 rounded-full p-[2.5px] flex items-center justify-center transition-transform active:scale-95 ${
                isDone ? 'bg-secondary' : 'bg-primary-container'
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-lowest border-2 border-white flex items-center justify-center text-primary font-headline font-bold text-sm">
                  {mem.display_name ? mem.display_name[0].toUpperCase() : 'U'}
                </div>
              </div>
              <span className="font-label text-xs text-on-surface max-w-[64px] truncate text-center font-medium">
                {mem.display_name || 'Member'}
              </span>
            </button>
          );
        })}

        {/* Add Circle Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary transition-colors active:scale-95">
            <Icon name="add" size={24} />
          </div>
          <span className="font-label text-xs text-on-surface-variant max-w-[64px] truncate text-center">New Gang</span>
        </button>
      </div>

      {/* 4. ACTION BANNER */}
      <button
        onClick={() => setShowScorecardsModal(true)}
        className="w-full h-12 rounded-full bg-secondary-container text-on-secondary-container font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform"
      >
        <Icon name="emoji_events" size={18} filled />
        <span>🏆 Squad Scorecards · Weekly Leaderboard</span>
      </button>

      {/* 5. SOCIAL FEED */}
      <div className="flex flex-col gap-4 mt-1">
        {posts.length === 0 ? (
          <div className="p-6 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
            <Icon name="campaign" size={32} className="text-primary opacity-60 mx-auto mb-2" />
            <p className="font-headline font-bold text-sm text-on-surface">No updates yet today</p>
            <p className="font-body text-xs text-on-surface-variant mt-1">
              Be the first to share your progress or post a workout proof to motivate the squad!
            </p>
            <button
              onClick={() => setShowComposer(true)}
              className="mt-3 px-4 py-2 bg-primary text-white rounded-full font-label text-xs font-bold shadow-sm"
            >
              Post Progress
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <CirclePostCard
              key={post.id}
              post={post}
              currentUserId={currentUserName}
              onReactionToggle={() => loadCirclesData()}
            />
          ))
        )}
      </div>

      {/* Modals & Sheets */}
      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadCirclesData()}
      />

      <JoinCircleModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={() => loadCirclesData()}
      />

      <PostComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onSubmit={handleCreatePost}
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
        circles={circles}
        onSelectCircle={handleSelectCircle}
        onOpenCreate={() => { setShowSettingsSheet(false); setShowCreateModal(true); }}
        onOpenJoin={() => { setShowSettingsSheet(false); setShowJoinModal(true); }}
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
