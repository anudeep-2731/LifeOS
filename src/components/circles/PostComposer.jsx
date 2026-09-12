import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import { compressImage } from '../../lib/imageUtils';
import { uploadCirclePhoto, createCirclePost } from '../../lib/supabase';

const ADVICE_CATEGORIES = ['Financial', 'Health & Spine', 'Habit Hack', 'Career & Focus'];

export default function PostComposer({ circleId, onPostCreated }) {
  const [postMode, setPostMode] = useState('snap'); // 'snap' | 'advice'
  const [adviceCategory, setAdviceCategory] = useState('Financial');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compressing, setCompressing] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      setError('Could not process image. Try another photo.');
    } finally {
      setCompressing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !caption.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let photoUrl = null;
      if (selectedFile) photoUrl = await uploadCirclePhoto(selectedFile);
      
      await createCirclePost({
        circleId,
        photoUrl,
        caption,
        postType: postMode === 'advice' ? 'squad_advice' : (selectedFile ? 'photo' : 'text'),
        adviceCategory: postMode === 'advice' ? adviceCategory : null
      });

      handleClearImage();
      setCaption('');
      if (onPostCreated) onPostCreated();
    } catch (err) {
      setError(err.message || 'Failed to post. Check storage bucket config.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl overflow-hidden shadow-card border border-outline-variant/20 bg-surface-container-lowest mb-4">
      {/* Mode Switcher Bar */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 border-b border-outline-variant/15">
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setPostMode('snap')}
            className={`px-3 py-1 rounded-xl text-xs font-headline font-bold transition-all ${
              postMode === 'snap'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            📸 Photo / Snap
          </button>
          <button
            type="button"
            onClick={() => setPostMode('advice')}
            className={`px-3 py-1 rounded-xl text-xs font-headline font-bold transition-all ${
              postMode === 'advice'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            💡 Squad Advice
          </button>
        </div>

        {postMode === 'advice' && (
          <span className="text-[10px] text-primary font-bold hidden sm:inline">Well-being Tip</span>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2.5 bg-error/10 border-b border-error/20 text-error text-xs flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        {/* Dynamic Category Tag Selector for Advice */}
        {postMode === 'advice' && (
          <div className="p-3 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[11px] font-bold text-on-surface-variant flex-shrink-0">Tag:</span>
              {ADVICE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAdviceCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                    adviceCategory === cat
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:border-primary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo preview */}
        {postMode === 'snap' && (
          <AnimatePresence>
            {previewUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative overflow-hidden"
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-md"
                >
                  <Icon name="close" className="text-sm" />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1.5">
                  <span>📸</span>
                  <span>Ready to Share</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Dynamic Input Row */}
        <div className="flex items-center gap-2 p-3">
          <input
            type="text"
            placeholder={
              postMode === 'advice'
                ? `Share a helpful ${adviceCategory} tip or advice...`
                : (previewUrl ? "Add a caption..." : "Share a workout snap or daily win 🏆")
            }
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-2xl text-on-surface text-xs placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            maxLength={280}
          />

          {postMode === 'snap' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors flex-shrink-0"
              >
                {compressing
                  ? <Icon name="sync" className="animate-spin text-base text-primary" />
                  : <Icon name="photo_camera" className="text-base text-primary" />
                }
              </motion.button>
            </>
          )}

          {/* Post button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.88 }}
            disabled={loading || (!selectedFile && !caption.trim())}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary text-on-primary disabled:opacity-30 flex items-center justify-center shadow-md hover:brightness-110 transition-all flex-shrink-0"
          >
            {loading
              ? <Icon name="sync" className="animate-spin text-base" />
              : <Icon name="send" className="text-base" />
            }
          </motion.button>
        </div>
      </form>
    </div>
  );
}
