import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import Icon from './Icon';

export default function BottomSheet({ isOpen, onClose, title, children, zIndex = 100 }) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={cn(
        'relative bg-surface-container-lowest rounded-t-[2rem] w-full max-h-[85vh] overflow-y-auto',
        'shadow-[0_-8px_40px_rgba(0,93,167,0.12)]',
        'animate-[slideUp_0.25s_ease-out]'
      )}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4">
          <h2 className="text-lg font-headline font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-10">
          {children}
        </div>
      </div>

    </div>
  );
}
