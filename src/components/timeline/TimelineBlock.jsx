import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getBlockStyle } from './Timeline';
import { Check } from 'lucide-react';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const TimelineBlock = ({
  startTime,
  durationMins,
  title,
  themeColor = "primary", // primary, secondary, tertiary, default
  completed = false,
  onToggleComplete,
  children
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const style = getBlockStyle(startTime, durationMins);
  
  // Theme variants reflecting the Stitch "No-Line" strategy (using background shifts + tonal elevation)
  const variants = {
    primary: "bg-surface-container-lowest text-primary shadow-glass ring-1 ring-primary-container/10",
    secondary: "bg-secondary-container/20 text-secondary ring-1 ring-secondary-container/30",
    tertiary: "bg-tertiary-container/10 text-tertiary ring-1 ring-tertiary-container/20",
    default: "bg-surface-container text-on-surface"
  };

  const completedVariant = "bg-surface-container-highest text-outline-variant opacity-60";

  return (
    <div 
      className={cn(
        "absolute left-2 right-2 rounded-[1rem] p-3 transition-all duration-300 backdrop-blur-sm cursor-pointer",
        completed ? completedVariant : variants[themeColor],
        isPressing ? "scale-[0.98]" : "hover:shadow-md"
      )}
      style={style}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onMouseLeave={() => setIsPressing(false)}
    >
      <div className="flex justify-between items-start h-full">
        <div className="flex flex-col overflow-hidden h-full">
          <span className="text-sm font-display font-semibold truncate mb-1">
            {title}
          </span>
          <span className="text-xs font-sans opacity-70">
            {startTime} • {durationMins}m
          </span>
          <div className="mt-2 text-xs flex-1 overflow-hidden">
            {children}
          </div>
        </div>

        {onToggleComplete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              completed 
                ? "bg-secondary border-secondary text-white" 
                : "border-outline-variant text-transparent hover:border-primary-container"
            )}
          >
            <Check size={14} strokeWidth={completed ? 3 : 2} />
          </button>
        )}
      </div>
    </div>
  );
};
