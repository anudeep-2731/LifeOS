import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon';
import QuickLoggerBar from '../components/ui/QuickLoggerBar';
import CompletionCelebration, { triggerHapticCelebration } from '../components/ui/CompletionCelebration';
import { db, getTodayStr, getMonthStr, seedTodayData, computeStreak } from '../db/database';
import { 
  fetchCloudExpenses, 
  fetchCloudSchedule, 
  addCloudScheduleItem,
  updateCloudScheduleItem,
  fetchCloudSetting,
  fetchUserProfileName,
  publishDailySnapshot,
  autoPopulateDailyRoutines
} from '../lib/supabase';
import { cn } from '../lib/utils';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const getHabitEmoji = (title = '', category = '') => {
  const text = `${title} ${category}`.toLowerCase();
  if (text.includes('water') || text.includes('hydrat')) return '💧';
  if (text.includes('meditat') || text.includes('mindful') || text.includes('breath') || text.includes('yoga')) return '🧘';
  if (text.includes('shower') || text.includes('bath') || text.includes('cold') || text.includes('hygiene')) return '❄️';
  if (text.includes('run') || text.includes('walk') || text.includes('jog') || text.includes('workout') || text.includes('gym') || text.includes('exercise')) return '🏃';
  if (text.includes('read') || text.includes('book') || text.includes('page') || text.includes('study')) return '📖';
  if (text.includes('sleep') || text.includes('bed') || text.includes('rest')) return '😴';
  if (text.includes('journal') || text.includes('write') || text.includes('diary')) return '✍️';
  if (text.includes('breakfast') || text.includes('nutrition') || text.includes('meal') || text.includes('eat')) return '🥗';
  if (text.includes('deep work') || text.includes('code') || text.includes('focus') || text.includes('work')) return '💻';
  
  // Check if string begins with an emoji
  const emojiMatch = title.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  if (emojiMatch) return emojiMatch[0];
  return '⚡';
};

const priorityScore = (priority = '') => {
  const p = priority.toLowerCase();
  if (p === 'high') return 3;
  if (p === 'med' || p === 'medium') return 2;
  return 1;
};

export default function DashboardTab() {
  const navigate = useNavigate();
  const today = getTodayStr();
  const currentMonth = getMonthStr();

  // State
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [monthSpent, setMonthSpent] = useState(0);
  const [todaySpent, setTodaySpent] = useState(0);

  // Schedule Items
  const [routines, setRoutines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Task Add State
  const [newTaskInput, setNewTaskInput] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('high'); // 'high' | 'med' | 'low'
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskTime, setTaskTime] = useState('Today');
  const [taskCategory, setTaskCategory] = useState('Work');
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Completed Accordion
  const [completedAccordionOpen, setCompletedAccordionOpen] = useState(false);
  const [showCompletedHabits, setShowCompletedHabits] = useState(false);
  const [celebration, setCelebration] = useState(null);

  // Active vs Completed Habits
  const activeRoutines = useMemo(() => routines.filter(r => !r.completed), [routines]);
  const completedRoutines = useMemo(() => routines.filter(r => r.completed), [routines]);

  // Formatted Date
  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  // Financial Overview Calculation
  const { safeToSpendToday, remainingBudget, monthBurnPercent, isOnTrack } = useMemo(() => {
    const dailySafe = Math.max(0, 1000 - todaySpent);
    const rem = Math.max(0, monthlyBudget - monthSpent);
    const burn = monthlyBudget > 0 ? Math.min(100, Math.round((monthSpent / monthlyBudget) * 100)) : 0;
    const onTrack = burn <= 80;
    return { safeToSpendToday: dailySafe, remainingBudget: rem, monthBurnPercent: burn, isOnTrack: onTrack };
  }, [monthlyBudget, monthSpent, todaySpent]);

  // Load All Cockpit Data
  const loadCockpitData = useCallback(async () => {
    setLoading(true);
    try {
      await seedTodayData();
      await autoPopulateDailyRoutines(today);

      const [profileName, budgetVal, streakVal, monthExpenses, schedData] = await Promise.all([
        fetchUserProfileName(),
        fetchCloudSetting('monthlyBudget', 30000),
        computeStreak(),
        fetchCloudExpenses(currentMonth),
        fetchCloudSchedule(today)
      ]);

      setUserName(profileName || 'Anudeep');
      if (budgetVal !== undefined && budgetVal !== null) {
        setMonthlyBudget(budgetVal);
      }
      setStreak(streakVal || 0);

      // Financials
      const mSpent = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const tSpent = monthExpenses
        .filter(e => e.date === today)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      setMonthSpent(mSpent);
      setTodaySpent(tSpent);

      // Schedule Items
      setRoutines(schedData.routines || []);
      setTasks(schedData.tasks || []);

      // Auto-publish circle snapshot
      publishDailySnapshot(today).catch(console.error);
    } catch (err) {
      console.error('Error loading cockpit data:', err);
    } finally {
      setLoading(false);
    }
  }, [today, currentMonth]);

  useEffect(() => {
    loadCockpitData();
  }, [loadCockpitData]);

  // Momentum Stats
  const { totalItemsCount, completedCount, progressPercent, nextUpItem } = useMemo(() => {
    const all = [...routines, ...tasks];
    const total = all.length;
    const completed = all.filter(i => i.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find next uncompleted item
    const uncompleted = all
      .filter(i => !i.completed)
      .sort((a, b) => {
        const timeA = a.start || a.scheduledTime || a.time || '23:59';
        const timeB = b.start || b.scheduledTime || b.time || '23:59';
        return timeA.localeCompare(timeB);
      });

    return {
      totalItemsCount: total,
      completedCount: completed,
      progressPercent: percent,
      nextUpItem: uncompleted.length > 0 ? uncompleted[0] : null
    };
  }, [routines, tasks]);

  // Split Tasks: Active (Priority-Sorted) vs Completed
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const scoreDiff = priorityScore(b.priority) - priorityScore(a.priority);
        if (scoreDiff !== 0) return scoreDiff;
        const timeA = a.scheduledTime || a.time || '12:00';
        const timeB = b.scheduledTime || b.time || '12:00';
        return timeA.localeCompare(timeB);
      });

    const completed = tasks.filter(t => t.completed);
    return { activeTasks: active, completedTasks: completed };
  }, [tasks]);

  // Habit completion count
  const habitsCompletedCount = useMemo(() => {
    return routines.filter(r => r.completed).length;
  }, [routines]);

  // Toggle Habit
  const handleToggleHabit = async (habit) => {
    const nextCompleted = !habit.completed;
    if (nextCompleted) {
      triggerHapticCelebration();
      setCelebration({ id: Date.now(), title: habit.title, type: 'habit' });
    }
    // Optimistic UI update
    setRoutines(prev => prev.map(r => r.id === habit.id ? { ...r, completed: nextCompleted } : r));

    try {
      await updateCloudScheduleItem(habit.id, { ...habit, completed: nextCompleted });
      publishDailySnapshot(today).catch(console.error);
    } catch (err) {
      console.error('Error toggling habit:', err);
      // Revert on error
      setRoutines(prev => prev.map(r => r.id === habit.id ? { ...r, completed: !nextCompleted } : r));
    }
  };

  // Toggle Task
  const handleToggleTask = async (task) => {
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      triggerHapticCelebration();
      setCelebration({ id: Date.now(), title: task.title, type: 'task' });
    }
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));

    try {
      await updateCloudScheduleItem(task.id, { ...task, completed: nextCompleted });
      publishDailySnapshot(today).catch(console.error);
    } catch (err) {
      console.error('Error toggling task:', err);
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !nextCompleted } : t));
    }
  };

  // Quick Add Task
  const handleQuickAddTask = async (e) => {
    if (e) e.preventDefault();
    const title = newTaskInput.trim();
    if (!title || isSubmittingTask) return;

    setIsSubmittingTask(true);
    const priorityLabel = selectedPriority === 'high' ? 'High' : selectedPriority === 'med' ? 'Medium' : 'Low';
    
    try {
      const created = await addCloudScheduleItem({
        itemType: 'task',
        title,
        date: today,
        dueDate: taskDueDate || today,
        scheduledTime: taskTime || 'Today',
        duration: 20,
        category: taskCategory || 'Inbox',
        priority: priorityLabel,
        completed: false
      });

      if (created) {
        setTasks(prev => [created, ...prev]);
      } else {
        await loadCockpitData();
      }
      setNewTaskInput('');
      setShowTaskDetails(false);
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-28">
      <main className="flex flex-col relative w-full max-w-4xl mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="flex flex-col w-full gap-5 pb-8">

          {/* Top Hero & Greeting Strip */}
          <section className="flex flex-col gap-3 pt-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-on-surface-variant tracking-wider uppercase">
                  {dateStr}
                </span>
                <h2 className="text-xl sm:text-2xl font-headline font-extrabold text-on-surface tracking-tight mt-0.5">
                  Hey, {userName || 'Anudeep'} 👋
                </h2>
              </div>

              {/* Streak Pill */}
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded-full shadow-xs border border-tertiary-fixed/30">
                  <span className="text-sm leading-none">🔥</span>
                  <span className="font-mono text-xs font-semibold tracking-tight">
                    {streak} {streak === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Monthly & Daily Financial Card */}
            <div 
              onClick={() => navigate('/expenses')}
              className="flex flex-col gap-2.5 p-3.5 sm:p-4 bg-surface-container-low hover:bg-surface-container rounded-2xl cursor-pointer transition-all group border border-outline-variant/20 shadow-xs"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    isOnTrack ? "bg-secondary animate-pulse" : "bg-error animate-pulse"
                  )}></span>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Budget Snapshot
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight",
                    isOnTrack 
                      ? "bg-secondary-container/50 text-on-secondary-container" 
                      : "bg-error-container/60 text-on-error-container"
                  )}>
                    {isOnTrack ? 'On Track ✓' : 'Budget Warning'}
                  </span>
                  <Icon name="arrow_forward" size={14} className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 divide-x divide-outline-variant/20 pt-1 text-center">
                {/* 1. Total Spent This Month */}
                <div className="flex flex-col items-center px-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-bold truncate max-w-full">
                    SPENT
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-on-surface mt-0.5">
                    {formatINR(monthSpent)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant truncate mt-0.5">
                    of {formatINR(monthlyBudget)}
                  </span>
                </div>

                {/* 2. Remaining */}
                <div className="flex flex-col items-center px-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-bold truncate max-w-full">
                    REMAINING
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-secondary mt-0.5">
                    {formatINR(remainingBudget)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant truncate mt-0.5">
                    {Math.max(0, 100 - monthBurnPercent)}% left
                  </span>
                </div>

                {/* 3. Today's Budget */}
                <div className="flex flex-col items-center px-1">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-bold truncate max-w-full">
                    TODAY LIMIT
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-primary mt-0.5">
                    {formatINR(safeToSpendToday)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant truncate mt-0.5">
                    {formatINR(todaySpent)} spent
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Action Logger Bar (Quick Add Expense & Hydration) */}
          <QuickLoggerBar onExpenseLogged={loadCockpitData} />

          {/* Glanceable Momentum Card */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl shadow-card border border-outline-variant/25 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon name="bolt" size={18} />
                </div>
                <span className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Momentum
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-bold text-primary">
                {completedCount} of {totalItemsCount} done ({progressPercent}%)
              </span>
            </div>

            {/* Animated Progress Track */}
            <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Next Up Item Pill */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/15">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold shrink-0 bg-surface-container-high px-1.5 py-0.5 rounded-md">
                  Next Up
                </span>
                {nextUpItem ? (
                  <>
                    <span className="font-mono text-xs text-on-surface-variant shrink-0 bg-surface-container px-2 py-0.5 rounded-md">
                      {nextUpItem.start || nextUpItem.scheduledTime || nextUpItem.time || 'Today'}
                    </span>
                    <span className="text-xs sm:text-sm text-on-surface truncate font-medium">
                      {nextUpItem.title}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-secondary font-medium truncate">
                    All set! Everything on the agenda is completed. 🎉
                  </span>
                )}
              </div>
              <Icon name="arrow_forward" size={16} className="text-on-surface-variant shrink-0" />
            </div>
          </section>

          {/* Section 1: Non-Negotiable Daily Habits */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Daily Habits
                </h3>
                <span className="font-mono text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-medium">
                  {habitsCompletedCount}/{routines.length}
                </span>
              </div>

              <button 
                onClick={() => navigate('/studio')}
                className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors py-1 px-2.5 rounded-xl font-semibold text-xs hover:bg-surface-container-low cursor-pointer"
              >
                <Icon name="tune" size={16} />
                <span>Manage</span>
              </button>
            </div>

            {/* Habit Cards Responsive Grid */}
            {routines.length === 0 ? (
              <div className="p-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/25 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🌱</span>
                <p className="font-headline font-bold text-sm text-on-surface">No Daily Habits Scheduled</p>
                <p className="text-xs text-on-surface-variant max-w-xs">
                  Create daily non-negotiable habits to build momentum and power your day.
                </p>
                <button
                  onClick={() => navigate('/studio')}
                  className="mt-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                >
                  Configure Habits in Studio
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Active Habits Grid */}
                {activeRoutines.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <AnimatePresence>
                      {activeRoutines.map((habit) => {
                        const emoji = getHabitEmoji(habit.title, habit.type || habit.category);

                        return (
                          <motion.div
                            key={habit.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, y: -12 }}
                            transition={{ duration: 0.25 }}
                          >
                            <button
                              onClick={() => handleToggleHabit(habit)}
                              className="w-full text-left p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 hover:border-primary/40 hover:bg-surface-container-low/50 shadow-xs flex flex-col justify-between h-28 transition-all active:scale-[0.98] select-none group cursor-pointer"
                            >
                              <div className="flex items-start justify-between w-full">
                                <span className="text-2xl">{emoji}</span>
                                <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-2xs">
                                  <Icon name="check" size={16} className="opacity-0 group-hover:opacity-60 text-primary" />
                                </div>
                              </div>

                              <div className="min-w-0 w-full">
                                <p className="text-xs sm:text-sm font-semibold truncate text-on-surface">
                                  {habit.title}
                                </p>
                                <span className="text-[11px] font-medium tracking-tight block truncate mt-0.5 text-on-surface-variant">
                                  {habit.start ? `Target: ${habit.start}` : `${habit.duration || 15} mins`}
                                </span>
                              </div>
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center gap-3 animate-fadeIn">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="font-headline font-bold text-xs sm:text-sm text-on-surface">
                        All Habits Conquered Today!
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Fantastic discipline. You have completed all scheduled daily habits.
                      </p>
                    </div>
                  </div>
                )}

                {/* Collapsible Completed Habits Dropdown */}
                {completedRoutines.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCompletedHabits(!showCompletedHabits)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface-variant transition-colors cursor-pointer border border-outline-variant/15"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="task_alt" size={16} className="text-secondary" />
                        <span>Completed Habits ({completedRoutines.length})</span>
                      </div>
                      <Icon name={showCompletedHabits ? "expand_less" : "expand_more"} size={18} />
                    </button>

                    <AnimatePresence>
                      {showCompletedHabits && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-hidden"
                        >
                          {completedRoutines.map((habit) => {
                            const emoji = getHabitEmoji(habit.title, habit.type || habit.category);

                            return (
                              <button
                                key={habit.id}
                                onClick={() => handleToggleHabit(habit)}
                                className="text-left p-3 rounded-2xl bg-secondary/5 border border-secondary/20 shadow-xs flex flex-col justify-between h-24 transition-all active:scale-[0.98] select-none group cursor-pointer"
                                title="Tap to mark incomplete"
                              >
                                <div className="flex items-start justify-between w-full">
                                  <span className="text-xl opacity-75">{emoji}</span>
                                  <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                                    <Icon name="check" size={14} className="text-on-secondary-container font-bold" />
                                  </div>
                                </div>

                                <div className="min-w-0 w-full">
                                  <p className="text-xs font-semibold truncate text-on-surface/70 line-through">
                                    {habit.title}
                                  </p>
                                  <span className="text-[10px] text-secondary font-semibold block truncate mt-0.5">
                                    Completed ✓
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 2: Today's Actionable Tasks */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Action Tasks
                </h3>
                <span className="font-mono text-xs text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full font-bold">
                  {activeTasks.length} Pending
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">
                Priority Sorted
              </span>
            </div>

            {/* Smart Task Quick-Add Field */}
            <form 
              onSubmit={handleQuickAddTask}
              className="bg-surface-container-lowest p-3 rounded-2xl shadow-card border border-outline-variant/25 flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2.5 px-1">
                <Icon name="add_task" size={20} className="text-primary shrink-0" />
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Add a task for today (Press Enter)..."
                  className="w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
              </div>

              {/* Priority Chip Selector & Options & Add Button */}
              <div className="flex items-center justify-between pt-1 px-1 border-t border-outline-variant/15">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPriority('high')}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                      selectedPriority === 'high'
                        ? "bg-error-container/60 text-on-error-container shadow-2xs font-bold"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    High
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriority('med')}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                      selectedPriority === 'med'
                        ? "bg-tertiary-fixed/80 text-on-tertiary-fixed-variant shadow-2xs font-bold"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    Med
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriority('low')}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                      selectedPriority === 'low'
                        ? "bg-secondary-container/60 text-on-secondary-container shadow-2xs font-bold"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    Low
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTaskDetails(!showTaskDetails)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer",
                      showTaskDetails 
                        ? "bg-primary text-white font-bold" 
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}
                    title="Due Date & Category Options"
                  >
                    <Icon name="event" size={14} />
                    <span>Options</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!newTaskInput.trim() || isSubmittingTask}
                  className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 shadow-xs cursor-pointer"
                >
                  {isSubmittingTask ? 'Adding...' : 'Add'}
                </button>
              </div>

              {/* Expandable Task Template Details (Due Date, Time, Category) */}
              {showTaskDetails && (
                <div className="pt-2 px-1 border-t border-outline-variant/15 flex flex-col gap-2.5 bg-surface-container-low/50 p-2.5 rounded-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-mono border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Scheduled Time</label>
                      <input
                        type="text"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        placeholder="02:00 PM"
                        className="w-full h-8 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-mono border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Work', 'Personal', 'Finance', 'Health', 'Deep Work', 'Inbox'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setTaskCategory(cat)}
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer",
                            taskCategory === cat
                              ? "bg-primary text-white font-bold"
                              : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Active Priority Tasks List */}
            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="p-8 text-center text-xs text-outline animate-pulse">
                  Syncing tasks...
                </div>
              ) : activeTasks.length === 0 ? (
                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 py-6">
                  <span className="text-2xl">✨</span>
                  <p className="font-headline font-bold text-xs text-secondary">
                    No Pending Tasks
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    You're completely caught up! Add a new task above or relax.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence>
                    {activeTasks.map((task) => {
                      const priority = (task.priority || 'Medium').toLowerCase();
                      const priorityDotClass = 
                        priority === 'high' ? 'bg-error' :
                        (priority === 'med' || priority === 'medium') ? 'bg-tertiary-container' :
                        'bg-secondary';

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 25, scale: 0.95 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                          className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/20 hover:border-outline-variant/40 hover:bg-surface-container-low/40 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 text-transparent transition-all group-hover:bg-surface-container-high active:scale-95 cursor-pointer"
                              title="Mark complete"
                            >
                              <Icon name="check" size={16} className="text-on-surface-variant opacity-0 group-hover:opacity-70" />
                            </button>

                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs sm:text-sm font-medium text-on-surface truncate">
                                {task.title}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 font-mono text-[11px] text-on-surface-variant">
                                  <Icon name="schedule" size={13} />
                                  {task.scheduledTime || task.time || 'Today'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                                  {task.category || 'Work'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span 
                              className={cn("w-2.5 h-2.5 rounded-full shrink-0", priorityDotClass)} 
                              title={`${task.priority || 'Medium'} Priority`}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Completed Tasks Accordion */}
            {completedTasks.length > 0 && (
              <div className="flex flex-col bg-surface-container-low rounded-2xl overflow-hidden mt-1 border border-outline-variant/20 transition-all">
                <button
                  type="button"
                  onClick={() => setCompletedAccordionOpen(!completedAccordionOpen)}
                  className="flex items-center justify-between p-3.5 text-on-surface-variant hover:text-on-surface transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Completed Today
                    </span>
                    <span className="font-mono text-xs bg-surface-container-highest px-2 py-0.5 rounded-full font-bold">
                      {completedTasks.length}
                    </span>
                  </div>
                  <Icon 
                    name="expand_more" 
                    size={20} 
                    className={cn(
                      "transition-transform duration-300",
                      completedAccordionOpen ? "rotate-180" : "rotate-0"
                    )} 
                  />
                </button>

                {completedAccordionOpen && (
                  <div className="flex flex-col gap-2 px-3 pb-3">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-2 px-3 bg-surface-container-lowest/80 rounded-xl border border-outline-variant/15"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0"
                            title="Click to unmark"
                          >
                            <Icon name="check" size={14} className="font-bold" />
                          </button>
                          <span className="text-xs sm:text-sm text-on-surface-variant line-through truncate">
                            {task.title}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-outline shrink-0 ml-2">
                          {task.scheduledTime || task.time || 'Done'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </main>

      <CompletionCelebration
        celebration={celebration}
        onDismiss={() => setCelebration(null)}
      />
    </div>
  );
}
