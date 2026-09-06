import { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import DatePickerModal from '../components/ui/DatePickerModal';
import { cn } from '../lib/utils';
import { db, getTodayStr, getWeekDates, seedTodayData } from '../db/database';
import { 
  fetchCloudSchedule, 
  addCloudScheduleItem, 
  updateCloudScheduleItem, 
  deleteCloudScheduleItem 
} from '../lib/supabase';

export default function ScheduleTab() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const dateInputRef = useRef(null);
  const [routines, setRoutines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null); // { id, itemType, title, start, duration, type, notes }
  const [expandedNotesId, setExpandedNotesId] = useState(null);

  // Form State for Add / Edit
  const [eventType, setEventType] = useState('routine'); // 'routine' | 'task'
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(getTodayStr());
  const [dueDate, setDueDate] = useState(getTodayStr());
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('Work');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('Medium');

  const todayStr = getTodayStr();
  const weekDates = getWeekDates(selectedDate);

  const loadSchedule = async () => {
    setLoading(true);
    await seedTodayData();
    const data = await fetchCloudSchedule(selectedDate);
    setRoutines(data.routines || []);
    setTasks(data.tasks || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const toggleRoutine = async (id, currentCompleted) => {
    const target = routines.find(r => r.id === id);
    if (target) {
      await updateCloudScheduleItem(id, { ...target, completed: !currentCompleted });
      await loadSchedule();
    }
  };

  const toggleTask = async (id, currentCompleted) => {
    const target = tasks.find(t => t.id === id);
    if (target) {
      await updateCloudScheduleItem(id, { ...target, completed: !currentCompleted });
      await loadSchedule();
    }
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setEventType(item.itemType);
    setTitle(item.title);
    setEventDate(item.date || selectedDate);
    setDueDate(item.dueDate || item.date || selectedDate);
    setScheduledTime(item.time || '08:00');
    setDuration(String(item.duration || 30));
    setCategory(item.type || 'Work');
    setNotes(item.notes || '');
    setPriority(item.priority || 'Medium');
  };

  const handleDeleteItem = async (item) => {
    await deleteCloudScheduleItem(item.id);
    await loadSchedule();
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetDate = eventDate || selectedDate;

    if (editItem) {
      // Edit existing event
      await updateCloudScheduleItem(editItem.id, {
        itemType: editItem.itemType,
        date: targetDate,
        dueDate: dueDate || targetDate,
        title: title.trim(),
        scheduledTime,
        start: scheduledTime,
        duration: Number(duration),
        category,
        type: category,
        priority,
        notes: notes.trim(),
        completed: Boolean(editItem.completed),
      });
      setEditItem(null);
    } else {
      // Add new event
      await addCloudScheduleItem({
        itemType: eventType,
        date: targetDate,
        dueDate: dueDate || targetDate,
        title: title.trim(),
        scheduledTime,
        start: scheduledTime,
        duration: Number(duration),
        category,
        type: category,
        priority,
        notes: notes.trim(),
        completed: false,
      });
      setShowAddModal(false);
    }

    await syncWithSupabase();

    // Switch view to target date if different
    if (targetDate !== selectedDate) {
      setSelectedDate(targetDate);
    }

    setTitle('');
    setNotes('');
    loadSchedule();
  };

  // Combine routines & tasks into time-sorted agenda
  const scheduleItems = [
    ...routines.map(r => ({
      id: r.id,
      itemType: 'routine',
      title: r.title,
      time: r.start || '08:00',
      duration: r.duration || 15,
      completed: r.completed,
      type: r.type || 'Routine',
      notes: r.notes || '',
      color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      icon: 'wb_sunny',
    })),
    ...tasks.map(t => ({
      id: t.id,
      itemType: 'task',
      title: t.title,
      time: t.scheduledTime || '10:00',
      duration: t.duration || 30,
      completed: t.completed,
      type: t.priority ? `${t.priority} Priority` : 'Task',
      priority: t.priority,
      notes: t.notes || '',
      color: t.priority === 'High' ? 'bg-error/15 border-error/30 text-error' : 'bg-primary/15 border-primary/30 text-primary',
      icon: 'check_circle',
    })),
  ];

  scheduleItems.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  const completedCount = scheduleItems.filter(i => i.completed).length;
  const totalCount = scheduleItems.length;
  const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Calendar Header Bar */}
      <div className="pt-4 px-4 sm:px-6 pb-3 bg-surface-container-low border-b border-outline-variant/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Icon name="calendar_month" size={20} />
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-on-surface">Daily Schedule & Agenda</h2>
              <p className="text-xs text-outline">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-high text-xs font-bold text-outline hover:text-primary hover:bg-surface-container cursor-pointer transition-all border border-outline-variant/20 shadow-sm"
            >
              <Icon name="event" size={16} className="text-primary" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
            >
              Today
            </button>
          </div>
        </div>

        {/* 7-Day Date Selector Strip */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {weekDates.map(date => {
            const d = new Date(date + 'T00:00:00');
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.getDate();
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'flex flex-col items-center py-2 rounded-xl transition-all',
                  isSelected
                    ? 'bg-primary text-white font-bold shadow-md scale-105'
                    : isToday
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'bg-surface-container/50 text-outline hover:bg-surface-container'
                )}
              >
                <span className="text-[10px] uppercase font-semibold">{dayName}</span>
                <span className="text-sm font-headline font-extrabold mt-0.5">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Completion Bar */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-headline font-bold text-sm">
              {progressPct}%
            </div>
            <div>
              <p className="font-headline font-bold text-xs text-on-surface">Schedule Adherence</p>
              <p className="text-[11px] text-outline mt-0.5">{completedCount} of {totalCount} events completed</p>
            </div>
          </div>
          <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Hourly Schedule Timeline Agenda */}
      <div className="px-4 sm:px-6 pt-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-outline animate-pulse text-sm">Loading schedule...</div>
        ) : scheduleItems.length === 0 ? (
          <div className="py-12 text-center text-outline space-y-2">
            <Icon name="event_available" size={36} className="mx-auto opacity-40" />
            <p className="text-sm font-semibold">No items scheduled for this date.</p>
            <p className="text-xs">Tap the "+" button to add a task or routine.</p>
          </div>
        ) : (
          scheduleItems.map(item => {
            const isExpanded = expandedNotesId === `${item.itemType}-${item.id}`;

            return (
              <div
                key={`${item.itemType}-${item.id}`}
                className={cn(
                  'p-4 rounded-2xl border transition-all shadow-sm space-y-2',
                  item.completed
                    ? 'bg-surface-container/30 border-outline-variant/10 opacity-60'
                    : 'bg-surface-container-lowest border-outline-variant/25 hover:border-primary/40'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* 1-Tap Checkbox */}
                    <button
                      onClick={() => item.itemType === 'routine' ? toggleRoutine(item.id, item.completed) : toggleTask(item.id, item.completed)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                        item.completed
                          ? 'bg-primary border-primary text-white'
                          : 'border-outline hover:border-primary'
                      )}
                    >
                      {item.completed && <Icon name="check" size={14} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={cn('font-bold text-sm text-on-surface truncate', item.completed && 'line-through text-outline')}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-outline flex items-center gap-1">
                          <Icon name="schedule" size={12} /> {item.time} ({item.duration}m)
                        </span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', item.color)}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Notes Expand */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.notes && (
                      <button
                        onClick={() => setExpandedNotesId(isExpanded ? null : `${item.itemType}-${item.id}`)}
                        className="p-1.5 text-outline hover:text-primary transition-colors"
                        title="View Key Notes & Focus"
                      >
                        <Icon name={isExpanded ? "expand_less" : "info"} size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-outline hover:text-primary transition-colors"
                      title="Edit / Reschedule Event"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 text-outline hover:text-error transition-colors"
                      title="Delete Event"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>

                {/* Expandable Key Focus & Notes */}
                {isExpanded && item.notes && (
                  <div className="pt-2 border-t border-outline-variant/15 text-xs text-outline leading-relaxed whitespace-pre-wrap bg-surface-container/30 p-3 rounded-xl">
                    <p className="font-bold text-primary text-[11px] mb-1">Key Focus & Specific Notes:</p>
                    {item.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FAB Add Event Button */}
      <button
        onClick={() => {
          setEditItem(null);
          setTitle('');
          setNotes('');
          setShowAddModal(true);
        }}
        className="fixed bottom-[95px] right-6 w-14 h-14 rounded-full primary-gradient text-white shadow-gradient flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        aria-label="Add Schedule Event"
      >
        <Icon name="add" size={28} filled className="text-white" />
      </button>

      {/* Add / Edit Event Sheet */}
      <BottomSheet isOpen={showAddModal || !!editItem} onClose={() => { setShowAddModal(false); setEditItem(null); }} title={editItem ? 'Edit / Reschedule Event' : 'Add Event to Schedule'}>
        <form onSubmit={handleSaveEvent} className="space-y-4 pb-6">
          {!editItem && (
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Event Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEventType('routine')}
                  className={cn('py-2.5 rounded-xl font-bold text-xs transition-all', eventType === 'routine' ? 'bg-emerald-500 text-white' : 'bg-surface-container text-outline')}
                >
                  Habit Routine
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('task')}
                  className={cn('py-2.5 rounded-xl font-bold text-xs transition-all', eventType === 'task' ? 'bg-primary text-white' : 'bg-surface-container text-outline')}
                >
                  Scheduled Task
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Title</label>
            <input
              type="text"
              className="input-pill w-full text-sm font-semibold"
              placeholder="e.g. Work Block 1 (Deep Work)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Scheduled Date</label>
              <input
                type="date"
                className="input-pill w-full text-sm font-bold text-on-surface"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Due Date</label>
              <input
                type="date"
                className="input-pill w-full text-sm font-bold text-on-surface"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Scheduled Time</label>
              <input
                type="time"
                className="input-pill w-full text-sm font-bold text-primary"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (mins)</label>
              <input
                type="number"
                min="5"
                step="5"
                className="input-pill w-full text-sm"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Category</label>
            <input
              type="text"
              className="input-pill w-full text-sm"
              placeholder="e.g. Fitness & Spine, Work, Nutrition, Hygiene"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Key Focus & Specific Notes</label>
            <textarea
              className="input-pill w-full text-sm rounded-2xl h-24 py-3 resize-none font-sans"
              placeholder="Add specific instructions, posture rules, diet notes, or exercise steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full py-3.5 mt-2 rounded-xl font-bold flex items-center justify-center gap-2">
            <span>{editItem ? 'Save Rescheduled Event' : 'Add to Schedule'}</span>
          </button>
        </form>
      </BottomSheet>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(d)}
      />
    </div>
  );
}
