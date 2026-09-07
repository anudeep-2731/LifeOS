import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Icon from '../ui/Icon';
import { toggleReaction, updateCirclePost, deleteCirclePost } from '../../lib/supabase';

const EMOJIS = ['👏', '🔥', '💪', '🎯'];

function EmojiBurst({ emoji, onDone }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 1, y: 0 }}
      animate={{ scale: 2, opacity: 0, y: -60 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      className="fixed pointer-events-none z-50 text-2xl select-none"
    >
      {emoji}
    </motion.div>
  );
}

export default function CirclePostCard({ post, currentUserId, onPostUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [burst, setBurst] = useState(null); // { emoji, x, y }
  const [localReactions, setLocalReactions] = useState(post.circle_reactions || []);

  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const isOwner = post.user_id === currentUserId;
  const isAdvice = post.post_type === 'squad_advice' || post.advice_category;
  const isTaskCompletion = post.post_type === 'task_completion' || post.task_tag;

  const groupedReactions = EMOJIS.map((emoji) => {
    const matching = localReactions.filter((r) => r.emoji === emoji);
    const hasReacted = matching.some((r) => r.user_id === currentUserId);
    return { emoji, count: matching.length, hasReacted };
  });

  const handleEmojiClick = async (emoji, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBurst({ emoji, x: rect.left + rect.width / 2, y: rect.top });

    // Optimistic update
    const alreadyReacted = localReactions.some(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );
    if (alreadyReacted) {
      setLocalReactions(prev =>
        prev.filter(r => !(r.emoji === emoji && r.user_id === currentUserId))
      );
    } else {
      setLocalReactions(prev => [
        ...prev,
        { emoji, user_id: currentUserId, post_id: post.id, user_name: '' }
      ]);
    }

    try {
      await toggleReaction({ postId: post.id, emoji });
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await updateCirclePost({ postId: post.id, caption });
      setIsEditing(false);
      setShowMenu(false);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await deleteCirclePost(post);
      setShowDeleteModal(false);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete post.');
    } finally {
      setLoading(false);
    }
  };

  const formattedTime = new Date(post.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* Emoji burst animation */}
      <AnimatePresence>
        {burst && (
          <div
            style={{ position: 'fixed', left: burst.x, top: burst.y, pointerEvents: 'none', zIndex: 9999 }}
          >
            <EmojiBurst emoji={burst.emoji} onDone={() => setBurst(null)} />
          </div>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`relative rounded-3xl overflow-hidden shadow-card border mb-4 ${
          isAdvice
            ? 'bg-gradient-to-br from-primary/5 via-surface-container-lowest to-indigo-50/50 border-primary/30 ring-1 ring-primary/10'
            : 'bg-surface-container-lowest border-outline-variant/20'
        }`}
      >
        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 bg-error/10 border-b border-error/20 text-error text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold">✕</button>
          </div>
        )}

        {/* ── SQUAD WISDOM / ADVICE CARD SPECIFIC HEADER ── */}
        {isAdvice && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b border-primary/10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary text-on-primary shadow-xs">
              💡 {post.advice_category || 'Squad Wisdom'}
            </span>
            <span className="text-[10px] text-primary font-bold">Well-being Tip</span>
          </div>
        )}

        {/* ── PHOTO HERO (full-bleed Instagram post style) ── */}
        {post.photo_url ? (
          <div className="relative w-full aspect-[4/5] bg-surface-container-high overflow-hidden">
            <img
              src={post.photo_url}
              alt={post.caption || 'Circle snap'}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Top gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

            {/* Author chip — top-left */}
            <div className="absolute top-3 left-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full ring-2 ring-white/80 bg-primary/80 text-white font-headline font-extrabold text-xs flex items-center justify-center backdrop-blur-sm shadow-md">
                {post.user_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-white text-xs font-headline font-bold drop-shadow-md">{post.user_name}</p>
                <p className="text-white/80 text-[10px] drop-shadow-sm font-medium">{formattedTime}</p>
              </div>
            </div>

            {/* Owner menu — top-right */}
            {isOwner && (
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setShowMenu(prev => !prev)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors shadow-md"
                >
                  <Icon name="more_vert" className="text-base" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-10 z-30 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-2xl py-1.5 w-36"
                    >
                      <button
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2 font-medium"
                      >
                        <Icon name="edit" className="text-sm text-primary" />
                        <span>Edit Caption</span>
                      </button>
                      <button
                        onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs text-error hover:bg-error/10 flex items-center gap-2 font-medium"
                      >
                        <Icon name="delete" className="text-sm" />
                        <span>Delete Post</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Caption overlaid at bottom of photo */}
            {!isEditing && post.caption && (
              <div className="absolute bottom-14 left-0 right-0 px-4">
                {isTaskCompletion && (
                  <span className="inline-block mb-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-md">
                    🏆 Task Accomplished
                  </span>
                )}
                <p className="text-white text-sm font-medium drop-shadow-md leading-snug line-clamp-3">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Reactions row — floating at bottom of photo */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {groupedReactions.map(({ emoji, count, hasReacted }) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.12 }}
                    onClick={(e) => handleEmojiClick(emoji, e)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all ${
                      hasReacted
                        ? 'bg-surface-container-lowest text-on-surface shadow-lg ring-1 ring-black/10'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[10px]">{count}</span>}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* TEXT / WISDOM POST CARD */
          <div className="relative p-5 flex flex-col justify-between">
            {/* Author row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-headline font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {post.user_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-on-surface text-xs font-headline font-bold">{post.user_name}</p>
                  <p className="text-on-surface-variant text-[10px]">{formattedTime}</p>
                </div>
              </div>
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(prev => !prev)}
                    className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center transition-colors"
                  >
                    <Icon name="more_vert" className="text-base" />
                  </button>
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -6 }}
                        className="absolute right-0 top-9 z-30 bg-surface-container-lowest backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-2xl py-1.5 w-36"
                      >
                        <button
                          onClick={() => { setIsEditing(true); setShowMenu(false); }}
                          className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2 font-medium"
                        >
                          <Icon name="edit" className="text-sm text-primary" />
                          <span>Edit Caption</span>
                        </button>
                        <button
                          onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                          className="w-full px-3 py-2 text-left text-xs text-error hover:bg-error/10 flex items-center gap-2 font-medium"
                        >
                          <Icon name="delete" className="text-sm" />
                          <span>Delete Post</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Post Content */}
            {post.caption && (
              <div className="mb-4">
                {isTaskCompletion && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-bold mb-2 border border-amber-500/20">
                    <span>🏆</span>
                    <span>Task Completed</span>
                  </div>
                )}
                <p className={`leading-relaxed ${
                  isAdvice
                    ? 'text-on-surface text-sm font-headline font-bold italic border-l-3 border-primary pl-3 py-0.5'
                    : 'text-on-surface text-sm font-medium'
                }`}>
                  {post.caption}
                </p>
              </div>
            )}

            {/* Reactions row */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-outline-variant/15">
              <div className="flex items-center gap-1.5">
                {groupedReactions.map(({ emoji, count, hasReacted }) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.12 }}
                    onClick={(e) => handleEmojiClick(emoji, e)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      hasReacted
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[10px]">{count}</span>}
                  </motion.button>
                ))}
              </div>

              {isAdvice && (
                <button
                  type="button"
                  onClick={(e) => handleEmojiClick('💪', e)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary/20 transition-all"
                >
                  <span>📌 Useful</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Inline caption edit mode */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-surface-container-low border-t border-outline-variant/20"
          >
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary resize-none mb-2"
              maxLength={250}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setCaption(post.caption || ''); setIsEditing(false); }}
                className="px-3.5 py-1.5 rounded-xl border border-outline-variant/40 text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-[10px] font-bold shadow-sm hover:brightness-110 flex items-center gap-1"
              >
                {loading
                  ? <Icon name="sync" className="animate-spin text-xs" />
                  : <Icon name="check" className="text-xs" />}
                <span>Save</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <motion.div
                initial={{ rotate: -20, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto mb-3"
              >
                <Icon name="delete_forever" className="text-2xl" />
              </motion.div>

              <h3 className="text-base font-headline font-bold text-on-surface mb-1">Delete Post?</h3>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                This will permanently delete your post{post.photo_url ? ' and its photo from storage' : ''}.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-error text-on-error text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Icon name="sync" className="animate-spin text-sm" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="delete" className="text-sm" />
                      <span>Delete</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
