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

export default function CirclePostCard({ post, currentUserId, onPostUpdated, circleName = 'Squad' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [burst, setBurst] = useState(null); // { emoji, x, y }
  const [localReactions, setLocalReactions] = useState(post.circle_reactions || []);
  const [isLiked, setIsLiked] = useState(false);

  // Local comments state
  const [comments, setComments] = useState(post.comments || [
    { id: 1, user: 'elena_v', text: 'Crushing the squad weekly goals! 🔥' }
  ]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const isOwner = post.user_id === currentUserId;

  // Extract category or tags if formatted with [Advice:Category] or [Completed:Tag]
  let displayCaption = post.caption || '';
  let categoryTag = null;

  if (displayCaption.startsWith('[Advice:')) {
    const endIdx = displayCaption.indexOf(']');
    if (endIdx > -1) {
      categoryTag = displayCaption.substring(8, endIdx);
      displayCaption = displayCaption.substring(endIdx + 1).trim();
    }
  } else if (displayCaption.startsWith('[Completed:')) {
    const endIdx = displayCaption.indexOf(']');
    if (endIdx > -1) {
      categoryTag = displayCaption.substring(11, endIdx);
      displayCaption = displayCaption.substring(endIdx + 1).trim();
    }
  }

  const isAdvice = post.post_type === 'squad_advice' || post.advice_category || displayCaption.startsWith('[Advice:');
  const isTaskCompletion = post.post_type === 'task_completion' || displayCaption.startsWith('[Completed:');

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

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [
      ...prev,
      { id: Date.now(), user: 'You', text: newComment.trim() }
    ]);
    setNewComment('');
  };

  const formattedTime = new Date(post.created_at || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const userNameDisplay = post.user_name || 'Member';
  const handleName = userNameDisplay.toLowerCase().replace(/\s+/g, '_');

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
        className="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden flex flex-col border border-outline-variant/20 mb-4"
      >
        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 bg-error/10 border-b border-error/20 text-error text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold">✕</button>
          </div>
        )}

        {/* ── STITCH NEAT INSTAGRAM POST HEADER ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-full p-[2px] flex items-center justify-center flex-shrink-0 ${
              isAdvice
                ? 'bg-gradient-to-tr from-emerald-400 to-teal-600'
                : isTaskCompletion
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500'
                : 'bg-gradient-to-tr from-primary via-purple-500 to-rose-500'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-lowest border-2 border-white flex items-center justify-center text-primary font-headline font-bold text-xs">
                {post.user_avatar ? (
                  <img src={post.user_avatar} alt={userNameDisplay} className="w-full h-full object-cover" />
                ) : (
                  userNameDisplay.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-sm font-bold text-on-surface tracking-tight">
                  {handleName}
                </span>
                <Icon name="verified" size={15} className="text-primary" filled />
                <span className="text-[11px] text-on-surface-variant">• {formattedTime}</span>
              </div>
              <span className="font-body text-[11px] text-on-surface-variant flex items-center gap-1">
                {isAdvice ? (
                  <>💡 {categoryTag || 'Squad Wisdom'}</>
                ) : isTaskCompletion ? (
                  <>🏆 {categoryTag || 'Task Accomplishment'}</>
                ) : (
                  <>{circleName} · Verified 🏃</>
                )}
              </span>
            </div>
          </div>

          {/* Owner options menu button */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(prev => !prev)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <Icon name="more_horiz" size={20} />
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

        {/* ── CARD BODY (PHOTO / WISDOM GRAPHIC / TASK CARD) ── */}

        {/* PHOTO POST CARD */}
        {post.photo_url ? (
          <div className="relative w-full aspect-[16/9] overflow-hidden bg-surface-container">
            <img
              src={post.photo_url}
              alt={displayCaption || 'Circle snap'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Top-left completion badge overlay */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-label text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
              <Icon name="check_circle" size={14} className="text-emerald-400" filled />
              <span>{categoryTag ? `Completed: ${categoryTag}` : 'Completed: Daily Routine'}</span>
            </div>
            {/* Top-right streak/data badge overlay */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-data text-[11px] flex items-center gap-1">
              <Icon name="speed" size={13} />
              <span>🔥 Streaks Active</span>
            </div>
          </div>
        ) : isAdvice ? (
          /* WISDOM / ADVICE POST GRAPHIC CARD */
          <div className="px-4 py-6 bg-gradient-to-br from-surface-container-low to-surface-container-high/60 mx-3 my-2 rounded-2xl flex flex-col justify-center border border-outline-variant/30 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-tertiary-fixed/40 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label text-[11px] font-semibold">
                💡 {categoryTag || 'Squad Advice'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label text-[11px] font-semibold">
                🧠 Well-being Tip
              </span>
            </div>
            <p className="font-headline text-base leading-relaxed font-semibold text-on-surface italic pl-2 border-l-3 border-primary">
              “{displayCaption}”
            </p>
          </div>
        ) : isTaskCompletion ? (
          /* TASK COMPLETION CARD */
          <div className="p-4 bg-amber-500/5 mx-3 my-2 rounded-2xl border border-amber-500/20 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-label text-[11px] font-extrabold shadow-xs flex items-center gap-1">
                <span>🏆</span>
                <span>{categoryTag || 'Task Accomplished'}</span>
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">Verified by LifeOS</span>
            </div>
            <p className="font-body text-sm font-medium text-on-surface leading-relaxed">
              {displayCaption}
            </p>
          </div>
        ) : (
          /* REGULAR TEXT UPDATE CARD */
          <div className="px-4 py-3">
            <p className="font-body text-sm text-on-surface leading-relaxed">
              {displayCaption}
            </p>
          </div>
        )}

        {/* ── STITCH INSTAGRAM ACTION BAR ── */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-4 text-on-surface">
            <button
              onClick={() => setIsLiked(prev => !prev)}
              className={`flex items-center gap-1 transition-transform active:scale-90 ${isLiked ? 'text-rose-500' : 'hover:text-rose-500'}`}
            >
              <Icon name="favorite" size={24} filled={isLiked} />
            </button>
            <button
              onClick={() => setShowComments(prev => !prev)}
              className="flex items-center gap-1 hover:text-primary transition-colors active:scale-90 text-on-surface"
            >
              <Icon name="chat_bubble" size={24} />
            </button>
          </div>
          <button className="text-on-surface hover:text-primary transition-colors active:scale-90">
            <Icon name="bookmark" size={24} />
          </button>
        </div>

        {/* ── POST BODY & ENGAGEMENT CONTENT ── */}
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {/* Likes line */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="font-label text-xs text-on-surface font-semibold">
              <span className="font-bold">{isLiked ? '1 like' : 'Liked by squad members'}</span>
            </span>
          </div>

          {/* Caption text line (if photo post) */}
          {post.photo_url && displayCaption && (
            <p className="font-body text-xs text-on-surface leading-snug">
              <span className="font-bold font-headline mr-1.5 text-on-surface">{handleName}</span>
              {displayCaption}
            </p>
          )}

          {/* Accountability Emoji Reaction Chips (Squad Boosters) */}
          <div className="flex items-center gap-1.5 py-1">
            {groupedReactions.map(({ emoji, count, hasReacted }) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.08 }}
                onClick={(e) => handleEmojiClick(emoji, e)}
                className={`px-3 py-1 rounded-full font-data text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  hasReacted
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{emoji}</span>
                <span className="font-semibold text-[11px]">{count}</span>
              </motion.button>
            ))}
          </div>

          {/* Comments Section Toggle */}
          {comments.length > 0 && (
            <button
              onClick={() => setShowComments(prev => !prev)}
              className="text-left font-body text-xs text-on-surface-variant hover:text-on-surface transition-colors pt-0.5 font-medium"
            >
              {showComments ? 'Hide comments' : `View all ${comments.length} comment${comments.length > 1 ? 's' : ''}`}
            </button>
          )}

          {showComments && (
            <div className="flex flex-col gap-1.5 pt-1">
              {comments.map((c) => (
                <div key={c.id} className="font-body text-xs text-on-surface leading-tight bg-surface-container-low/50 p-2 rounded-xl">
                  <span className="font-bold mr-1.5 text-primary">{c.user}</span>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add a comment input bar */}
          <form onSubmit={handleAddComment} className="flex items-center justify-between pt-2 border-t border-outline-variant/15 text-xs">
            <input
              type="text"
              placeholder={`Add a comment for ${userNameDisplay}...`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none pr-2"
            />
            <button type="submit" disabled={!newComment.trim()} className="text-primary font-bold text-xs disabled:opacity-40">
              Post
            </button>
          </form>
        </div>

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
