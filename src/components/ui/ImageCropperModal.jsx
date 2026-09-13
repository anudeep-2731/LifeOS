import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';

export default function ImageCropperModal({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  circularCrop = false,
  title = 'Crop Image'
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Load image preview URL from file
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Touch & Mouse event handlers for panning
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Perform canvas crop
  const handleApplyCrop = useCallback(async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const cropSize = 500; // Output square dimension
      const outputWidth = cropSize;
      const outputHeight = Math.round(cropSize / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      // Crop viewport dimension on screen
      const viewportRect = containerRef.current.getBoundingClientRect();
      const viewportSize = Math.min(viewportRect.width, viewportRect.height) * 0.85;

      // Scale between screen crop frame and output canvas
      const screenToCanvas = outputWidth / viewportSize;

      ctx.save();
      // Move to center of canvas
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      // Current displayed image natural dimensions vs viewport
      const displayedWidth = img.width;
      const displayedHeight = img.height;
      const scaleFactor = Math.max(viewportSize / displayedWidth, viewportSize / displayedHeight);

      const drawW = displayedWidth * scaleFactor * screenToCanvas;
      const drawH = displayedHeight * scaleFactor * screenToCanvas;

      ctx.drawImage(
        img,
        position.x * screenToCanvas - drawW / 2,
        position.y * screenToCanvas - drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onCropComplete(blob);
          } else {
            console.error('Crop failed to generate blob');
          }
        },
        'image/jpeg',
        0.85
      );
    } catch (err) {
      console.error('Failed to crop image:', err);
      setIsProcessing(false);
    }
  }, [aspectRatio, scale, rotation, position, onCropComplete]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn select-none">
      <div className="w-full max-w-sm sm:max-w-md bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/10 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✂️</span>
            <h3 className="font-headline font-bold text-sm sm:text-base text-on-surface">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Cropping Viewport Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full aspect-square bg-black/90 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
        >
          {/* Base Image */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To crop"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            className="pointer-events-none select-none origin-center"
          />

          {/* Mask Frame (Target Area) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-[82%] aspect-square border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
                circularCrop ? 'rounded-full' : 'rounded-2xl'
              }`}
            >
              {/* Subtle grid lines */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-25">
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex flex-col gap-2.5 px-1">
          <div className="flex items-center gap-3">
            <Icon name="zoom_out" size={16} className="text-outline shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer"
            />
            <Icon name="zoom_in" size={16} className="text-primary shrink-0" />

            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors shrink-0 ml-1"
              title="Rotate 90°"
            >
              <Icon name="rotate_right" size={18} />
            </button>
          </div>
          <span className="text-[10px] text-center text-outline">
            Drag to reposition • Pinch or slide to zoom
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white font-headline font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <Icon name="sync" size={16} className="animate-spin" />
                <span>Cropping...</span>
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                <span>Apply Crop</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
