import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import { createCirclePost, fetchMyCircles } from '../../lib/supabase';

export default function TaskShareModal({ isOpen, onClose, taskTitle, onPosted }) {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);

  if (!isOpen || !taskTitle) return null;

  const handleShare = async () => {
    setLoading(true);
    try {
      const myCircles = await fetchMyCircles();
      if (myCircles.length > 0) {
        const circleId = myCircles[0].id;
        const postCaption = caption.trim()
          ? `🏆 Completed: ${taskTitle} — "${caption.trim()}"`
          : `🏆 Completed: ${taskTitle}`;
        
        await createCirclePost({
          circleId,
          caption: postCaption,
          postType: 'task_completion',
          taskTag: taskTitle
        });
        setPostedSuccess(true);
        setTimeout(() => {
          setPostedSuccess(false);
          if (onPosted) onPosted();
          onClose();
        }, 1200);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to post task accomplishment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden"
        >
          {postedSuccess ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 space-y-2"
            >
              <span className="text-5xl block animate-bounce">🎉</span>
              <h3 className="text-lg font-headline font-extrabold text-on-surface">Posted to Gang!</h3>
              <p className="text-xs text-on-surface-variant">Your squad can now celebrate your win!</p>
            </motion.div>
          ) : (
            <>
              {/* Trophy Icon */}
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Icon name="emoji_events" className="text-3xl" />
              </div>

              <h3 className="text-base font-headline font-extrabold text-on-surface mb-1">
                Achievement Unlocked! 🎉
              </h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Do you want to post <strong className="text-primary font-bold">"{taskTitle}"</strong> to your Gang feed for daily accountability?
              </p>

              <input
                type="text"
                placeholder="Add a quick note or workout photo caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary mb-4"
                maxLength={120}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl border border-outline-variant/40 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Skip
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleShare}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-primary text-on-primary text-xs font-headline font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Icon name="sync" className="animate-spin text-sm" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="send" className="text-sm" />
                      <span>Post to Gang</span>
                    </>
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
