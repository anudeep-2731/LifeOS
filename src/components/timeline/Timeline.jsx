import React, { useEffect, useState } from 'react';

// Convert time "07:00" to absolute minutes from passing 00:00.
// eslint-disable-next-line react-refresh/only-export-components
export const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Given a container and start/end boundaries, position correctly.
// eslint-disable-next-line react-refresh/only-export-components
export const getBlockStyle = (startTime, durationMins, timelineStart = "06:00", pixelsPerMinute = 2) => {
  const startMins = timeToMins(startTime);
  const baseMins = timeToMins(timelineStart);
  
  const top = (startMins - baseMins) * pixelsPerMinute;
  const height = durationMins * pixelsPerMinute;
  
  return { top: `${top}px`, height: `${height}px` };
};

export const Timeline = ({ children, startHour = 6, endHour = 23, pixelsPerMinute = 2 }) => {
  const [currentTimeMins, setCurrentTimeMins] = useState(timeToMins(new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMins(timeToMins(new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const totalMins = (endHour - startHour) * 60;
  const containerHeight = totalMins * pixelsPerMinute;
  
  const hours = [];
  for(let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const currentLineTop = (currentTimeMins - (startHour * 60)) * pixelsPerMinute;
  const isCurrentLineVisible = currentLineTop > 0 && currentLineTop < containerHeight;

  return (
    <div className="relative w-full pl-16 pr-4" style={{ height: `${containerHeight}px` }}>
      {/* Time axis text */}
      <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-outline-variant/20">
        {hours.map((hour, i) => (
          <div 
            key={hour} 
            className="absolute left-0 w-full text-right pr-2 text-xs font-semibold text-outline-variant -translate-y-1/2"
            style={{ top: `${i * 60 * pixelsPerMinute}px` }}
          >
            {hour}:00
          </div>
        ))}
      </div>
      
      {/* Current Time Indicator Line */}
      {isCurrentLineVisible && (
        <div 
          className="absolute left-12 right-0 border-t-2 border-primary-container z-20 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(41,118,199,0.5)]"
          style={{ top: `${currentLineTop}px` }}
        >
          <div className="absolute -left-1 -top-[5px] w-2 h-2 bg-primary-container rounded-full ring-4 ring-primary-container/30"></div>
        </div>
      )}

      {/* Children Blocks */}
      <div className="relative w-full h-full">
        {children}
      </div>
    </div>
  );
};
