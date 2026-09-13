import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import { db, getTodayStr } from '../../db/database';
import { 
  fetchCloudSchedule, 
  addCloudScheduleItem, 
  deleteCloudScheduleItem,
  updateCloudScheduleItem 
} from '../../lib/supabase';

export default function HabitTaskStudioSheet({ isOpen, onClose, onDataChanged }) {
  const today = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState([]);
  const [habitTemplates, setHabitTemplates] = useState([]);
  const [unfinishedTasks, setUnfinishedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Habit form state
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('⚡');
  const [newHabitTime, setNewHabitTime] = useState('07:00');
  const [newHabitDuration, setNewHabitDuration] = useState(15);
  const [showAddHabit, setShowAddHabit] = useState(false);

  // Generate the 7-day strip (Monday to Sunday around current week)
  useEffect(() => {
    const curr = new Date(today);
    const day = curr.getDay(); // 0 is Sunday
    const mondayDiff = day === 0 ? -6 : 1 - day; // adjust when day is sunday
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + mondayDiff);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        name: dayNames[i],
        dayNum: d.getDate(),
        dateStr
      });
    }
    setWeekDays(days);
  }, [today]);

  const loadStudioData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Habit Templates from Dexie
      const templates = await db.habitTemplates.toArray();
      setHabitTemplates(templates || []);

      // 2. Fetch unfinished tasks from yesterday / past days
      const sched = await fetchCloudSchedule(selectedDate);
      const pastSched = await db.tasks
        .filter(t => !t.completed && t.date && t.date < today)
        .toArray();
      setUnfinishedTasks(pastSched || []);
    } catch (err) {
      console.error('Failed to load studio data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, today]);

  useEffect(() => {
    if (isOpen) {
      loadStudioData();
    }
  }, [isOpen, loadStudioData]);

  // Carry forward all unfinished tasks to today
  const handleCarryForwardAll = async () => {
    if (unfinishedTasks.length === 0) return;
    setLoading(true);
    try {
      for (const t of unfinishedTasks) {
        await addCloudScheduleItem({
          itemType: 'task',
          date: today,
          dueDate: today,
          title: t.title,
          scheduledTime: t.scheduledTime || '09:00',
          duration: t.duration || 30,
          priority: t.priority || 'High',
          category: t.category || 'Work',
          notes: t.notes || 'Carried forward',
          completed: false
        });
        // Mark previous task record as carried / updated
        if (t.id) {
          await db.tasks.update(t.id, { completed: true, notes: 'Carried over to ' + today });
        }
      }
      setActionSuccess('Carried forward all unresolved tasks to today!');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadStudioData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Carry forward error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new habit blueprint
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      const fullTitle = `${newHabitEmoji} ${newHabitTitle.trim()}`;
      await db.habitTemplates.add({
        title: fullTitle,
        startTime: newHabitTime,
        duration: Number(newHabitDuration) || 15,
        type: 'Habit',
        active: 1
      });

      // Also create today's instance so it appears right away
      await addCloudScheduleItem({
        itemType: 'routine',
        date: today,
        title: fullTitle,
        start: newHabitTime,
        duration: Number(newHabitDuration) || 15,
        type: 'Habit',
        completed: false
      });

      setNewHabitTitle('');
      setShowAddHabit(false);
      setActionSuccess('Added habit to your daily blueprint!');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadStudioData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error adding habit:', err);
    }
  };

  // Delete habit blueprint
  const handleDeleteHabit = async (templateId) => {
    try {
      await db.habitTemplates.delete(templateId);
      await loadStudioData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-2xl bg-surface rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15 bg-surface-container-lowest">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-primary hover:text-primary-container transition-colors font-headline text-sm font-bold group"
            >
              <Icon name="arrow_back" size={20} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Today</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label text-[11px] font-bold uppercase tracking-wider">Studio Mode</span>
            </div>
          </div>

          {/* Toast Alert */}
          {actionSuccess && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 py-2.5 bg-secondary-container text-on-secondary-container font-label text-xs font-bold flex items-center justify-between"
            >
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess(null)}>✕</button>
            </motion.div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Screen Identity & Horizon 7-Day Strip */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <Icon name="architecture" size={22} className="text-primary" />
                  <h2 className="font-headline text-lg font-bold text-on-surface">Habit & Task Studio</h2>
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-0.5">Architect your daily cadence and calibrate rollover momentum.</p>
              </div>

              {/* 7-Day Precision Horizon Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {weekDays.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  const isCurrentDay = today === d.dateStr;

                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`flex flex-col items-center justify-center w-9 py-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary shadow-sm scale-105 font-bold'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="font-label text-[10px] uppercase font-medium">{d.name.charAt(0)}</span>
                      <span className="font-data text-xs font-semibold">{d.dayNum}</span>
                      {isCurrentDay && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-primary mt-0.5"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unfinished Tasks & Carry-Forward Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/20 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
                    <Icon name="history" size={18} />
                  </div>
                  <div>
                    <h3 className="font-headline text-sm font-bold text-on-surface">Yesterday's Unfinished Tasks</h3>
                    <p className="font-body text-[11px] text-on-surface-variant">
                      {unfinishedTasks.length} unresolved action{unfinishedTasks.length === 1 ? '' : 's'} eligible for rollover
                    </p>
                  </div>
                </div>

                {unfinishedTasks.length > 0 && (
                  <button
                    onClick={handleCarryForwardAll}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label text-xs font-bold active:scale-95 shadow-xs hover:bg-primary/90 transition-all"
                  >
                    <Icon name="forward" size={16} />
                    <span>Carry Forward to Today</span>
                  </button>
                )}
              </div>

              {unfinishedTasks.length === 0 ? (
                <div className="text-center py-4 bg-surface-container-low/40 rounded-xl text-xs text-on-surface-variant font-medium">
                  🎉 No unfinished tasks from previous days. You're completely caught up!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {unfinishedTasks.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon name="radio_button_unchecked" size={18} className="text-outline shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-body text-xs font-medium text-on-surface truncate">{t.title}</span>
                          <span className="font-data text-[10px] text-on-surface-variant">{t.date} · {t.scheduledTime || '09:00'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label text-[10px] uppercase font-bold shrink-0">
                        {t.priority || 'Medium'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Habit Blueprints Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="font-headline text-sm font-bold text-on-surface">Recurring Daily Habits</h3>
                  <p className="font-body text-[11px] text-on-surface-variant">Blueprints that automatically roll over every morning</p>
                </div>
                <button
                  onClick={() => setShowAddHabit(prev => !prev)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-primary font-label text-xs font-bold transition-all active:scale-95 border border-outline-variant/30"
                >
                  <Icon name={showAddHabit ? "close" : "add"} size={16} />
                  <span>{showAddHabit ? "Cancel" : "New Habit"}</span>
                </button>
              </div>

              {/* Inline Add Habit Form */}
              <AnimatePresence>
                {showAddHabit && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddHabit}
                    className="p-4 bg-surface-container-lowest rounded-2xl border border-primary/30 shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={newHabitEmoji}
                        onChange={(e) => setNewHabitEmoji(e.target.value)}
                        className="bg-surface-container-low px-2.5 py-2 rounded-xl text-lg border border-outline-variant/30 focus:outline-none"
                      >
                        <option value="⚡">⚡</option>
                        <option value="💧">💧</option>
                        <option value="🧘">🧘</option>
                        <option value="❄️">❄️</option>
                        <option value="🏃">🏃</option>
                        <option value="📖">📖</option>
                        <option value="💪">💪</option>
                        <option value="🥗">🥗</option>
                        <option value="☀️">☀️</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Habit title (e.g. 10m Morning Sunlight)"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        className="flex-1 bg-surface-container-low px-3.5 py-2 rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase">Target Time</label>
                        <input
                          type="time"
                          value={newHabitTime}
                          onChange={(e) => setNewHabitTime(e.target.value)}
                          className="w-full bg-surface-container-low px-3 py-1.5 rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase">Duration (mins)</label>
                        <input
                          type="number"
                          value={newHabitDuration}
                          onChange={(e) => setNewHabitDuration(e.target.value)}
                          className="w-full bg-surface-container-low px-3 py-1.5 rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-primary text-on-primary rounded-xl font-label text-xs font-bold shadow-xs hover:bg-primary/90 transition-all"
                    >
                      Save to Daily Blueprint
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Habit Blueprint List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {habitTemplates.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-xs text-on-surface-variant italic">
                    No habit templates saved yet. Click "New Habit" above to create one!
                  </div>
                ) : (
                  habitTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs hover:border-outline-variant/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-base shrink-0">
                          {t.title?.split(' ')?.[0] || '⚡'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body text-xs font-bold text-on-surface truncate">
                            {t.title?.replace(/^[^\s]+\s*/, '') || t.title}
                          </span>
                          <span className="font-label text-[10px] text-on-surface-variant">
                            {t.startTime || '07:00'} · {t.duration || 15} mins · Daily
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteHabit(t.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors"
                        title="Delete habit blueprint"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
