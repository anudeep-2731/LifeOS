import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';

export default function DatePickerModal({ isOpen, onClose, selectedDate, onSelectDate }) {
  const [currentYear, setCurrentYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return d.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return d.getMonth(); // 0 - 11
  });

  useEffect(() => {
    if (isOpen && selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const days = [];
  // Pad previous month days
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  // Month days
  for (let d = 1; d <= daysInMonthCount; d++) {
    days.push(d);
  }

  const handleDaySelect = (day) => {
    if (!day) return;
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleSelectQuick = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const formatted = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Select Date">
      <div className="space-y-4 pt-1 pb-4">

        {/* Quick Date Selection Chips */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handleSelectQuick(0)}
            className="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all border border-primary/20"
          >
            Today
          </button>
          <button
            onClick={() => handleSelectQuick(1)}
            className="px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-all border border-outline-variant/20"
          >
            Tomorrow
          </button>
          <button
            onClick={() => handleSelectQuick(7)}
            className="px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-all border border-outline-variant/20"
          >
            In 1 Week
          </button>
        </div>

        {/* Month Header Navigation */}
        <div className="flex items-center justify-between bg-surface-container-low rounded-2xl p-3 border border-outline-variant/20">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-all"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <h3 className="font-headline font-bold text-base text-on-surface">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-all"
            aria-label="Next month"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        {/* Day Header Row */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-outline py-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                onClick={() => handleDaySelect(day)}
                className={`h-10 rounded-2xl font-bold text-sm flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'primary-gradient text-white shadow-sm scale-105'
                    : isToday
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <span>{day}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
