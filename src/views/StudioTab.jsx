import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { db, getTodayStr } from '../db/database';
import { 
  fetchCloudSchedule, 
  addCloudScheduleItem, 
  updateCloudScheduleItem,
  deleteCloudScheduleItem,
  fetchCloudMasterRoutines,
  saveCloudMasterRoutines
} from '../lib/supabase';
import { cn } from '../lib/utils';

export default function StudioTab() {
  const navigate = useNavigate();
  const today = getTodayStr();

  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState([]);
  const [habitTemplates, setHabitTemplates] = useState([]);
  const [unfinishedTasks, setUnfinishedTasks] = useState([]);
  const [daySchedule, setDaySchedule] = useState({ routines: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Habit Blueprint form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('07:00 AM');
  const [newDuration, setNewDuration] = useState(15);
  const [newCategory, setNewCategory] = useState('Health');
  const [newRecurrence, setNewRecurrence] = useState('Daily');

  // New Planned Task form state
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskScheduledTime, setTaskScheduledTime] = useState('09:00 AM');
  const [taskPriority, setTaskPriority] = useState('High');
  const [taskCategory, setTaskCategory] = useState('Work');
  const [taskNotes, setTaskNotes] = useState('');

  // Sync taskDueDate with selectedDate
  useEffect(() => {
    setTaskDueDate(selectedDate);
  }, [selectedDate]);

  // Generate 7-day strip centered around current date
  useEffect(() => {
    const curr = new Date(today);
    const day = curr.getDay(); // 0 is Sun
    const mondayDiff = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + mondayDiff);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayShorts = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        name: dayNames[i],
        short: dayShorts[i],
        dayNum: d.getDate(),
        dateStr,
        isToday: dateStr === today
      });
    }
    setWeekDays(days);
  }, [today]);

  // Load Studio Data
  const loadStudioData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Habit Templates (Dexie + Cloud Master Routines)
      const dexieTemplates = await db.habitTemplates.toArray();
      const cloudTemplates = await fetchCloudMasterRoutines();
      
      const mergedMap = new Map();
      (cloudTemplates || []).forEach(t => {
        mergedMap.set(t.title, {
          id: t.id || t.title,
          title: t.title,
          startTime: t.start || '08:00',
          duration: t.duration || 15,
          category: t.category || 'Health',
          days: t.days || ['Everyday'],
          active: true
        });
      });

      (dexieTemplates || []).forEach(t => {
        mergedMap.set(t.title, {
          id: t.id,
          title: t.title,
          startTime: t.startTime || '08:00',
          duration: t.duration || 15,
          category: t.type || t.category || 'Health',
          days: t.days || ['Everyday'],
          active: t.active !== 0
        });
      });

      setHabitTemplates(Array.from(mergedMap.values()));

      // 2. Fetch Unfinished Tasks from yesterday / past days
      const pastTasks = await db.tasks
        .filter(t => !t.completed && t.date && t.date < today)
        .toArray();
      setUnfinishedTasks(pastTasks || []);

      // 3. Load Schedule for selected date
      const sched = await fetchCloudSchedule(selectedDate);
      setDaySchedule(sched || { routines: [], tasks: [] });

    } catch (err) {
      console.error('Error loading studio data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, today]);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // Carry Forward All Unfinished Tasks
  const handleCarryForwardTasks = async () => {
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
          duration: t.duration || 20,
          priority: t.priority || 'High',
          category: t.category || 'Inbox',
          notes: t.notes || 'Carried forward from yesterday',
          completed: false
        });

        if (t.id) {
          await db.tasks.update(t.id, { completed: true, notes: `Carried over to ${today}` });
        }
      }

      setActionSuccess(`Carried ${unfinishedTasks.length} task${unfinishedTasks.length > 1 ? 's' : ''} to Today!`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadStudioData();
    } catch (err) {
      console.error('Error carrying forward tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save New Habit Blueprint
  const handleSaveHabitBlueprint = async () => {
    if (!newTitle.trim()) return;

    try {
      const days = newRecurrence === 'Daily' ? ['Everyday'] : newRecurrence === 'Weekdays' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['Custom'];
      
      // Add to Dexie
      const newId = await db.habitTemplates.add({
        title: newTitle.trim(),
        startTime: newTime,
        duration: Number(newDuration) || 15,
        type: newCategory,
        category: newCategory,
        days,
        active: 1
      });

      // Sync to cloud master routines
      const currentCloud = await fetchCloudMasterRoutines();
      const updatedCloud = [
        ...currentCloud,
        {
          id: String(newId),
          title: newTitle.trim(),
          start: newTime,
          duration: Number(newDuration) || 15,
          category: newCategory,
          notes: 'Added from Studio',
          days
        }
      ];
      await saveCloudMasterRoutines(updatedCloud);

      // Also create routine for today's schedule immediately
      await addCloudScheduleItem({
        itemType: 'routine',
        title: newTitle.trim(),
        date: today,
        dueDate: today,
        start: newTime,
        duration: Number(newDuration) || 15,
        category: newCategory,
        priority: 'High',
        completed: false
      });

      setNewTitle('');
      setShowAddForm(false);
      setActionSuccess('Habit blueprint saved and added to today!');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadStudioData();
    } catch (err) {
      console.error('Error saving habit blueprint:', err);
    }
  };

  // Delete Habit Blueprint
  const handleDeleteHabit = async (habit) => {
    try {
      if (habit.id && typeof habit.id === 'number') {
        await db.habitTemplates.delete(habit.id);
      }
      const currentCloud = await fetchCloudMasterRoutines();
      const updated = currentCloud.filter(c => c.title !== habit.title);
      await saveCloudMasterRoutines(updated);

      setHabitTemplates(prev => prev.filter(h => h.title !== habit.title));
      setActionSuccess(`Removed "${habit.title}" from blueprints`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  // Add Planned Task
  const handleSavePlannedTask = async () => {
    if (!taskTitle.trim()) return;

    try {
      await addCloudScheduleItem({
        itemType: 'task',
        title: taskTitle.trim(),
        date: selectedDate,
        dueDate: taskDueDate || selectedDate,
        scheduledTime: taskScheduledTime || '09:00 AM',
        priority: taskPriority,
        category: taskCategory,
        notes: taskNotes || '',
        duration: 25,
        completed: false
      });

      setTaskTitle('');
      setTaskNotes('');
      setShowAddTaskForm(false);
      setActionSuccess(`Added task for ${selectedDate}!`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadStudioData();
    } catch (err) {
      console.error('Error adding task in studio:', err);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task) => {
    try {
      await updateCloudScheduleItem(task.id, { ...task, completed: !task.completed });
      await loadStudioData();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  // Delete Planned Task
  const handleDeleteTask = async (taskId) => {
    try {
      await deleteCloudScheduleItem(taskId);
      setActionSuccess('Task removed');
      setTimeout(() => setActionSuccess(null), 2500);
      await loadStudioData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const categoryColorMap = {
    Health: { bg: 'bg-secondary-container/40', text: 'text-secondary', icon: 'ac_unit' },
    'Deep Work': { bg: 'bg-primary-fixed/40', text: 'text-primary', icon: 'self_improvement' },
    Personal: { bg: 'bg-tertiary-fixed/40', text: 'text-tertiary', icon: 'directions_run' },
    Finance: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', icon: 'payments' },
    Nutrition: { bg: 'bg-secondary-container/50', text: 'text-secondary', icon: 'restaurant' }
  };

  return (
    <div className="w-full min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-28">
      <main className="flex flex-col relative w-full max-w-4xl mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="flex flex-col w-full pb-8">

          {/* Top Navigation & Back Breadcrumb */}
          <div className="flex items-center justify-between py-3 mb-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary-container font-semibold text-xs sm:text-sm transition-colors group cursor-pointer"
            >
              <Icon name="arrow_back" size={20} className="transition-transform group-hover:-translate-x-1" />
              <span>Back to Today</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Studio Mode</span>
            </div>
          </div>

          {/* Success Banner */}
          {actionSuccess && (
            <div className="mb-3 px-4 py-2.5 rounded-2xl bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
              <Icon name="check_circle" size={18} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Screen Identity Banner with 7-Day Precision Horizon */}
          <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-card border border-outline-variant/25 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon name="architecture" size={22} />
                </div>
                <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                  Habit &amp; Task Studio
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Architect cadence, sequence rituals, and calibrate rollover momentum.
              </p>
            </div>

            {/* 7-Day Precision Horizon Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {weekDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[42px] py-1.5 px-2 rounded-xl transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary-container text-on-primary-container shadow-xs scale-105 font-bold"
                        : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/15"
                    )}
                  >
                    <span className={cn("text-[10px] font-semibold", isSelected ? "text-on-primary-container/80" : "text-on-surface-variant")}>
                      {day.short}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold">
                      {day.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unfinished Tasks & Carry-Forward Card */}
          <section className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-card border border-outline-variant/25 mb-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
                  <Icon name="history" size={18} />
                </div>
                <div>
                  <h3 className="font-headline text-sm sm:text-base font-bold text-on-surface">
                    Yesterday's Unfinished Tasks
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {unfinishedTasks.length > 0
                      ? `${unfinishedTasks.length} unresolved action${unfinishedTasks.length > 1 ? 's' : ''} eligible for rollover momentum`
                      : 'Zero backlog! All previous tasks resolved.'}
                  </p>
                </div>
              </div>

              {unfinishedTasks.length > 0 && (
                <button
                  onClick={handleCarryForwardTasks}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-fixed hover:bg-primary text-on-primary-fixed hover:text-on-primary font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <Icon name="forward" size={16} />
                  <span>Carry Forward to Today</span>
                </button>
              )}
            </div>

            {/* Task Preview Items */}
            {unfinishedTasks.length === 0 ? (
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-center text-xs text-secondary font-medium flex items-center justify-center gap-2">
                <Icon name="task_alt" size={18} />
                <span>No lingering overdue tasks from past days. Clean slate!</span>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                {unfinishedTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/15"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="radio_button_unchecked" size={18} className="text-outline shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-on-surface truncate">
                          {task.title}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant">
                          {task.date} · {task.scheduledTime || 'Overdue'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase shrink-0">
                      {task.category || 'Inbox'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Habit Blueprints Section */}
          <section className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Recurring Daily Habits
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-mono text-xs font-bold">
                  {habitTemplates.length} active
                </span>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary-container font-bold text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Icon name={showAddForm ? 'close' : 'add'} size={18} />
                <span>{showAddForm ? 'Cancel' : 'New Habit'}</span>
              </button>
            </div>

            {/* Quick Blueprint Add Form (Expandable) */}
            {showAddForm && (
              <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-card border border-outline-variant/25 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-headline text-sm sm:text-base font-bold text-on-surface">
                    Draft Habit Blueprint
                  </span>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">
                      Habit / Task Title
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Evening Reflection & Read"
                      className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">
                      Target Time &amp; Duration
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        placeholder="07:00 AM"
                        className="w-1/2 h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-mono text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                      />
                      <input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        placeholder="15 mins"
                        className="w-1/2 h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-mono text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Picker */}
                <div className="flex flex-col gap-1.5 mb-3">
                  <label className="text-xs font-semibold text-on-surface-variant">Category Tag</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Health', 'Deep Work', 'Personal', 'Finance', 'Nutrition'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                          newCategory === cat
                            ? "bg-primary text-white font-bold shadow-xs"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurrence Cadence */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-semibold text-on-surface-variant">Recurrence Cadence</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/15">
                    {['Daily', 'Weekdays', 'Custom'].map((cadence) => (
                      <button
                        key={cadence}
                        type="button"
                        onClick={() => setNewRecurrence(cadence)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                          newRecurrence === cadence
                            ? "bg-surface-container-lowest text-on-surface shadow-xs font-bold"
                            : "text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        {cadence}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-low text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHabitBlueprint}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary-container text-xs font-bold active:scale-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    Save to Blueprint
                  </button>
                </div>
              </div>
            )}

            {/* Habit Blueprint Cards List */}
            <div className="space-y-2">
              {habitTemplates.length === 0 ? (
                <div className="p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/20 text-center space-y-2">
                  <span className="text-3xl">🎯</span>
                  <p className="font-headline font-bold text-sm text-on-surface">No Habit Blueprints Created</p>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    Click "New Habit" above to create non-negotiable rituals that will auto-schedule into your daily agenda.
                  </p>
                </div>
              ) : (
                habitTemplates.map((habit) => {
                  const catStyle = categoryColorMap[habit.category] || categoryColorMap['Health'];

                  return (
                    <div
                      key={habit.id || habit.title}
                      className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/20 flex items-center justify-between gap-3 hover:border-outline-variant/40 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
                          drag_indicator
                        </span>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", catStyle.bg, catStyle.text)}>
                          <Icon name={catStyle.icon} size={20} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-headline text-xs sm:text-sm font-bold text-on-surface truncate">
                              {habit.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold shrink-0">
                              {Array.isArray(habit.days) ? habit.days.join(', ') : 'Every day'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Icon name="schedule" size={14} className="text-outline" />
                            <span className="font-mono text-[11px] text-on-surface-variant">
                              {habit.duration || 15}m · {habit.startTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDeleteHabit(habit)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                          title="Delete blueprint"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Planned Tasks for Selected Date Section */}
          <section className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Planned Tasks
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-mono text-xs font-bold">
                  {selectedDate === today ? 'Today' : selectedDate} · {daySchedule.tasks.length}
                </span>
              </div>

              <button
                onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white font-bold text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Icon name={showAddTaskForm ? 'close' : 'add'} size={18} />
                <span>{showAddTaskForm ? 'Cancel' : 'Add Task'}</span>
              </button>
            </div>

            {/* Expandable Add Task Form */}
            {showAddTaskForm && (
              <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-card border border-outline-variant/25 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-headline text-sm sm:text-base font-bold text-on-surface">
                    Plan Task for {selectedDate}
                  </span>
                  <button
                    onClick={() => setShowAddTaskForm(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Complete quarterly financial review"
                      className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface-variant">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface-variant">
                        Scheduled Time
                      </label>
                      <input
                        type="text"
                        value={taskScheduledTime}
                        onChange={(e) => setTaskScheduledTime(e.target.value)}
                        placeholder="09:00 AM"
                        className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/15"
                      />
                    </div>
                  </div>

                  {/* Priority and Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant">Priority</label>
                      <div className="flex gap-2">
                        {['High', 'Medium', 'Low'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTaskPriority(p)}
                            className={cn(
                              "flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                              taskPriority === p
                                ? p === 'High' ? 'bg-error text-white font-bold' : p === 'Medium' ? 'bg-tertiary-container text-white font-bold' : 'bg-secondary text-white font-bold'
                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['Work', 'Personal', 'Finance', 'Health', 'Deep Work', 'Inbox'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTaskCategory(c)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer",
                              taskCategory === c
                                ? "bg-primary text-white font-bold shadow-xs"
                                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                            )}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">Notes / Context</label>
                    <input
                      type="text"
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full h-10 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant text-xs focus:outline-none border border-outline-variant/15"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm(false)}
                    className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-low text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlannedTask}
                    disabled={!taskTitle.trim()}
                    className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold active:scale-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    Add to Plan
                  </button>
                </div>
              </div>
            )}

            {/* List of Tasks for Selected Date */}
            <div className="space-y-2">
              {daySchedule.tasks.length === 0 ? (
                <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 text-center space-y-1">
                  <p className="font-headline font-bold text-xs text-on-surface-variant">
                    No tasks scheduled for {selectedDate}
                  </p>
                  <p className="text-[11px] text-outline">
                    Click "Add Task" above to plan a task for this date.
                  </p>
                </div>
              ) : (
                daySchedule.tasks.map((task) => {
                  const isDone = task.completed;
                  const priority = (task.priority || 'Medium').toLowerCase();
                  const dotColor = priority === 'high' ? 'bg-error' : priority === 'medium' || priority === 'med' ? 'bg-tertiary-container' : 'bg-secondary';

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl shadow-xs border transition-all group",
                        isDone ? "border-secondary/20 bg-secondary/5" : "border-outline-variant/20 hover:border-outline-variant/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
                            isDone ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-transparent group-hover:text-outline-variant"
                          )}
                        >
                          <Icon name="check" size={16} className={isDone ? "font-bold" : "opacity-0 group-hover:opacity-70"} />
                        </button>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn(
                            "text-xs sm:text-sm font-semibold truncate",
                            isDone ? "text-on-surface-variant line-through" : "text-on-surface"
                          )}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-[11px] text-on-surface-variant flex items-center gap-1">
                              <Icon name="schedule" size={12} />
                              {task.scheduledTime || task.time || 'Today'}
                            </span>
                            {task.dueDate && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span className="font-mono text-[10px] text-outline">
                                  Due: {task.dueDate}
                                </span>
                              </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                            <span className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                              {task.category || 'Work'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} title={`${task.priority || 'Medium'} Priority`} />
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Cadence Calibrated Banner */}
          <section className="bg-gradient-to-br from-primary-fixed/30 via-surface-container-lowest to-surface-container-low rounded-3xl p-4 sm:p-5 shadow-xs border border-outline-variant/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-xs">
              <Icon name="auto_awesome" size={24} />
            </div>
            <div className="flex flex-col">
              <h4 className="font-headline text-sm sm:text-base font-bold text-on-surface">
                Cadence Calibrated
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Your recurring stack covers morning energy, midday focus, and twilight stamina. Consistent ritual execution keeps momentum compounding.
              </p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
