import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import ImageCropperModal from '../ui/ImageCropperModal';
import { compressImage } from '../../lib/imageUtils';
import { uploadCirclePhoto, createCirclePost } from '../../lib/supabase';

const SQUAD_CATEGORIES = [
  { id: 'Financial', label: 'Financial', emoji: '💰', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { id: 'Health', label: 'Health', emoji: '🏃', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { id: 'Task Win', label: 'Task Win', emoji: '🏆', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
];

export default function PostComposer({ isOpen, onClose, circleId, circleName = 'Squad', onPostCreated }) {
  const [postMode, setPostMode] = useState('photo'); // 'photo' | 'advice'
  const [category, setCategory] = useState('Financial');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cropper state
  const [rawImageFile, setRawImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRawImageFile(file);
    setShowCropper(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    setRawImageFile(null);
    try {
      const compressed = await compressImage(croppedBlob, { maxWidth: 900, maxHeight: 900, quality: 0.8 });
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      setError('Could not process cropped photo. Please try another image.');
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile && !caption.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let photoUrl = null;
      if (selectedFile) {
        photoUrl = await uploadCirclePhoto(selectedFile);
      }
      
      let finalType = 'photo';
      let formattedCaption = caption.trim();

      if (postMode === 'advice') {
        if (category === 'Task Win') {
          finalType = 'task_completion';
          formattedCaption = `[Completed:${category}] ${formattedCaption}`;
        } else {
          finalType = 'squad_advice';
          formattedCaption = `[Advice:${category}] ${formattedCaption}`;
        }
      } else if (!selectedFile && postMode === 'photo') {
        finalType = 'text';
      }

      await createCirclePost({
        circleId,
        photoUrl,
        caption: formattedCaption,
        postType: finalType
      });

      handleClearImage();
      setCaption('');
      if (onPostCreated) onPostCreated();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to post. Check storage bucket config.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
        <div className="w-full sm:max-w-lg bg-surface-container-lowest rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 pb-10 sm:pb-6 shadow-2xl border border-outline-variant/25 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
          {/* Sheet Handle for mobile */}
          <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto sm:hidden -mt-1 mb-1"></div>

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0"></span>
              <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface truncate">
                Share to {circleName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Mode Switcher: Photo vs Advice / Win */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container-low rounded-2xl">
            <button
              type="button"
              onClick={() => setPostMode('photo')}
              className={`py-2 px-3 rounded-xl font-headline text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                postMode === 'photo'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="photo_camera" size={16} />
              <span>Camera Proof</span>
            </button>
            <button
              type="button"
              onClick={() => setPostMode('advice')}
              className={`py-2 px-3 rounded-xl font-headline text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                postMode === 'advice'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>💡</span>
              <span>Advice or Win</span>
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs flex items-center justify-between"
              >
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Advice / Win Category Selection: Financial, Health, Task Win */}
            {postMode === 'advice' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline">Select Focus</span>
                <div className="grid grid-cols-3 gap-2">
                  {SQUAD_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          isSelected
                            ? `${cat.color} ring-2 ring-primary/30 shadow-xs scale-[1.02]`
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/15 hover:border-outline-variant/35'
                        }`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Photo Preview or Photo Upload Trigger */}
            {postMode === 'photo' && (
              <div>
                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-outline-variant/20 bg-black/5">
                    <img
                      src={previewUrl}
                      alt="Crop preview"
                      className="w-full max-h-60 object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs hover:bg-black/80 transition-colors flex items-center gap-1"
                        title="Retake live photo"
                      >
                        <Icon name="photo_camera" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs hover:bg-black/80 transition-colors"
                        title="Remove photo"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl hover:border-primary/60 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center group active:scale-[0.99]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                      <Icon name="photo_camera" size={28} />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                        <p className="font-headline font-bold text-xs sm:text-sm text-on-surface">
                          Snap Live Camera Proof
                        </p>
                      </div>
                      <p className="text-[11px] text-outline mt-1 max-w-xs">
                        Camera only — snap live proof in the moment. Gallery uploads disabled.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase border border-primary/20 flex items-center gap-1">
                      <Icon name="camera" size={13} />
                      <span>Open Camera</span>
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Caption Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant">
                {postMode === 'advice' ? 'Your Tip or Milestone' : 'Caption (Optional)'}
              </label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={
                  postMode === 'advice'
                    ? category === 'Task Win'
                      ? 'What major task or habit did you conquer today?'
                      : `Share practical advice on ${category.toLowerCase()} with your squad...`
                    : 'Describe what you achieved or share your streak proof...'
                }
                className="w-full p-3 rounded-xl bg-surface-container-low text-xs sm:text-sm text-on-surface placeholder:text-outline border border-outline-variant/15 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest resize-none"
                maxLength={300}
              />
              <span className="text-[10px] text-right text-outline">
                {caption.length}/300
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!selectedFile && !caption.trim())}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-headline font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Icon name="sync" size={16} className="animate-spin" />
                  <span>Publishing to Squad...</span>
                </>
              ) : (
                <>
                  <Icon name="send" size={16} />
                  <span>Post to {circleName}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        imageFile={rawImageFile}
        onClose={() => {
          setShowCropper(false);
          setRawImageFile(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={false}
        title="Crop Photo for Squad"
      />
    </>
  );
}
