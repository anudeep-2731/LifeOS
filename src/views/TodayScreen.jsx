import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { getTodayStr, getMonthStr, seedTodayData, computeStreak } from '../db/database';
import {
  fetchCloudExpenses,
  fetchCloudSchedule,
  updateCloudScheduleItem,
  addCloudScheduleItem,
  addCloudExpense,
  fetchCloudSetting,
  fetchUserProfileName,
  publishDailySnapshot
} from '../lib/supabase';
import { askGemini } from '../lib/ai';
import { groupItemsByTimeBlock } from '../lib/timeBlockTransformer';
import { calculateBudgetMetrics } from '../lib/budgetHealth';

export default function TodayScreen() {
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(5);
  const [loading, setLoading] = useState(true);

  const [routines, setRoutines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [aiInsight, setAiInsight] = useState('Focus on completing your morning routine before checking expenses.');
  const [vitalityScore, setVitalityScore] = useState(85);

  // Sheets state
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSlot, setTaskSlot] = useState('morning');
  const [taskPriority, setTaskPriority] = useState('High Priority');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');

  const navigate = useNavigate();
  const today = getTodayStr();
  const currentMonth = getMonthStr();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const loadData = async () => {
    setLoading(true);
    await seedTodayData();

    const [name, streakVal, b, schedData, expData] = await Promise.all([
      fetchUserProfileName(),
      computeStreak(),
      fetchCloudSetting('monthlyBudget', 30000),
      fetchCloudSchedule(today),
      fetchCloudExpenses(currentMonth),
    ]);

    if (name) setUserName(name);
    if (streakVal !== null && streakVal !== undefined) setStreak(streakVal);
    if (b) setMonthlyBudget(b);

    setRoutines(schedData.routines || []);
    setTasks(schedData.tasks || []);
    setExpenses(expData || []);

    setLoading(false);

    // Async AI insight fetch
    askGemini('Provide a 1-sentence energizing focus tip for today based on habits and momentum.', [])
      .then(res => { if (res) setAiInsight(res); })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRoutines = routines.length;
  const doneRoutines = routines.filter(r => r.completed).length;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.completed).length;

  const budgetMetrics = calculateBudgetMetrics(expenses, monthlyBudget, today);
  const timeBlocks = groupItemsByTimeBlock(routines, tasks);

  const toggleRoutine = async (id, currentCompleted) => {
    const item = routines.find(r => r.id === id);
    if (item) {
      await updateCloudScheduleItem(id, { ...item, completed: !currentCompleted });
      publishDailySnapshot(today).catch(console.error);
      loadData();
    }
  };

  const toggleTask = async (id, currentCompleted) => {
    const item = tasks.find(t => t.id === id);
    if (item) {
      await updateCloudScheduleItem(id, { ...item, completed: !currentCompleted });
      publishDailySnapshot(today).catch(console.error);
      loadData();
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const timeMap = { morning: '08:30', afternoon: '14:00', evening: '19:30' };
    const newTask = {
      title: taskTitle.trim(),
      date: today,
      dueDate: today,
      time: timeMap[taskSlot] || '10:30',
      priority: taskPriority.includes('High') ? 'High' : 'Medium',
      completed: false,
      itemType: 'task',
      type: 'Work',
    };

    await addCloudScheduleItem(newTask);
    setShowTaskSheet(false);
    setTaskTitle('');
    loadData();
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!amt || isNaN(amt)) return;

    await addCloudExpense({
      title: expenseTitle.trim() || expenseCategory,
      amount: amt,
      category: expenseCategory,
      date: today,
      month: currentMonth,
      paymentMethod: 'UPI',
    });

    setShowExpenseSheet(false);
    setExpenseAmount('');
    setExpenseTitle('');
    loadData();
  };

  const logHydration = () => {
    setVitalityScore(prev => Math.min(100, prev + 3));
  };

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 select-none max-w-lg mx-auto">
      {/* 1. HERO SECTION */}
      <header className="flex items-start justify-between pt-2 pb-3">
        <div className="flex flex-col">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface leading-none">
            Good morning, {userName || 'Anudeep'}
          </h2>
          <p className="font-body text-xs text-on-surface-variant mt-1.5 font-medium">
            {formattedDate}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-primary to-indigo-500 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary font-headline text-lg font-bold">
              {userName ? userName[0].toUpperCase() : 'A'}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed/40">
            <span className="text-[11px] leading-none">🔥</span>
            <span className="font-data text-xs text-tertiary font-bold leading-none">{streak}</span>
          </div>
        </div>
      </header>

      {/* 2. PROGRESS HERO / DAILY MOMENTUM */}
      <section className="mt-2 bg-surface-container-lowest rounded-[20px] p-4 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <h3 className="font-headline text-base font-bold text-on-surface tracking-tight">Daily Momentum</h3>
            <span className="font-data text-[11px] text-on-surface-variant font-medium ml-1">
              {doneRoutines + doneTasks} of {totalRoutines + totalTasks} done
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Optimal Flow</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="flex flex-col gap-1.5 bg-surface-container-low rounded-[14px] p-2.5">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label text-[11px] font-semibold text-on-surface flex items-center gap-1">
                <Icon name="check_circle" size={14} className="text-secondary" /> Routines
              </span>
              <span className="font-data text-xs font-bold text-on-surface">
                {doneRoutines}<span className="opacity-50 text-[10px] font-normal">/{totalRoutines}</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${totalRoutines > 0 ? (doneRoutines / totalRoutines) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="font-body text-[10px] text-on-surface-variant truncate">
              {routines.find(r => !r.completed)?.title ? `Next: ${routines.find(r => !r.completed)?.title}` : 'All complete! 🎉'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 bg-surface-container-low rounded-[14px] p-2.5">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label text-[11px] font-semibold text-on-surface flex items-center gap-1">
                <Icon name="assignment" size={14} className="text-primary" /> Tasks
              </span>
              <span className="font-data text-xs font-bold text-on-surface">
                {doneTasks}<span className="opacity-50 text-[10px] font-normal">/{totalTasks}</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="font-body text-[10px] text-on-surface-variant truncate">
              {tasks.find(t => !t.completed)?.title ? `Next: ${tasks.find(t => !t.completed)?.title}` : 'No pending tasks'}
            </span>
          </div>
        </div>

        {/* Financial Pulse Mini Card */}
        <div className="flex flex-col gap-2 p-2.5 rounded-[14px] bg-surface-container-low border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="account_balance_wallet" size={15} className="text-secondary" />
              <span className="font-label text-[11px] font-semibold text-on-surface">Financial Pulse</span>
            </div>
            <span className={`font-data text-[10px] font-bold px-2 py-0.5 rounded-full ${budgetMetrics.isOnTrack ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-error-container text-error'}`}>
              {budgetMetrics.isOnTrack ? 'On Track ✓' : 'Over Pace ⚠️'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div className="flex flex-col">
              <span className="text-[10px] font-label text-on-surface-variant font-medium">Month Spent</span>
              <span className="font-data text-xs font-bold text-on-surface">₹{budgetMetrics.totalSpent.toLocaleString()}</span>
              <span className="text-[9px] text-on-surface-variant opacity-70 truncate">of ₹{monthlyBudget.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-label text-on-surface-variant font-medium">Budget Left</span>
              <span className="font-data text-xs font-bold text-secondary">₹{budgetMetrics.budgetRemaining.toLocaleString()}</span>
              <span className="text-[9px] text-on-surface-variant opacity-70 truncate">remaining</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-label text-on-surface-variant font-medium">Safe Today</span>
              <span className="font-data text-xs font-bold text-primary">₹{budgetMetrics.safeSpendToday.toLocaleString()}</span>
              <span className="text-[9px] text-on-surface-variant opacity-70 truncate">daily target</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[11px] font-label text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <Icon name="bolt" size={14} className="text-amber-500" />
            <span className="font-medium text-on-surface">Morning block:</span>
            <span>75% complete</span>
          </div>
          <div className="flex items-center gap-1 font-data font-semibold text-primary">
            <span>{vitalityScore}%</span> Vitality
          </div>
        </div>
      </section>

      {/* 3. QUICK ACTIONS BAR */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        {/* Hydrate */}
        <button
          className="group flex flex-col items-center gap-1.5 focus:outline-none"
          onClick={logHydration}
        >
          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary group-active:scale-95 transition-transform duration-150 shadow-sm">
            <Icon name="water_drop" size={22} />
          </div>
          <span className="font-label text-xs text-on-surface-variant font-medium">Hydrate</span>
        </button>

        {/* Add Task */}
        <button
          className="group flex flex-col items-center gap-1.5 focus:outline-none"
          onClick={() => { setTaskSlot('morning'); setShowTaskSheet(true); }}
        >
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary group-active:scale-95 transition-transform duration-150 shadow-sm">
            <Icon name="add" size={24} />
          </div>
          <span className="font-label text-xs text-on-surface font-semibold">Add Task</span>
        </button>

        {/* Expense */}
        <button
          className="group flex flex-col items-center gap-1.5 focus:outline-none"
          onClick={() => setShowExpenseSheet(true)}
        >
          <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary group-active:scale-95 transition-transform duration-150 shadow-sm">
            <Icon name="payments" size={22} />
          </div>
          <span className="font-label text-xs text-on-surface-variant font-medium">Expense</span>
        </button>
      </section>

      {/* 4. UNIFIED TIMELINE */}
      <section className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Daily Cadence</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
            <span className="font-body text-xs text-on-surface-variant">3 Time Blocks</span>
          </div>
          <button
            onClick={() => navigate('/routine-studio')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface-variant hover:text-on-surface text-xs font-label font-semibold transition-all shadow-sm"
          >
            <Icon name="tune" size={16} />
            <span>Routine Studio</span>
          </button>
        </div>

        {/* MORNING, AFTERNOON, EVENING SECTIONS */}
        {Object.values(timeBlocks).map((block) => (
          <div key={block.id} className="flex flex-col">
            <div className="flex items-center justify-between py-1 px-1">
              <span className={`font-headline text-lg bg-gradient-to-r ${block.color} bg-clip-text text-transparent font-bold`}>
                {block.icon} {block.label}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 mt-1.5">
              {block.items.length === 0 ? (
                <div className="p-3 bg-surface-container-lowest/60 rounded-[16px] text-xs text-on-surface-variant/70 italic text-center">
                  No items scheduled for {block.label.toLowerCase()}
                </div>
              ) : (
                block.items.map((item) => {
                  const isRoutine = item.itemType === 'routine';
                  const isCompleted = !!item.completed;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-[16px] shadow-sm transition-all relative overflow-hidden ${
                        !isRoutine && item.priority === 'High' ? 'border-l-4 border-error' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => isRoutine ? toggleRoutine(item.id, isCompleted) : toggleTask(item.id, isCompleted)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isCompleted
                              ? isRoutine ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
                              : 'bg-surface-container text-transparent hover:bg-secondary/20'
                          }`}
                        >
                          <Icon name="check" size={16} className="font-bold" />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`font-body text-sm font-semibold text-on-surface truncate ${
                              isCompleted ? 'line-through opacity-50' : ''
                            }`}
                          >
                            {item.title}
                          </span>
                          {!isRoutine && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 font-label text-[10px] text-error font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-error"></span> High Priority
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-on-surface-variant opacity-60 flex-shrink-0 ml-2">
                        <Icon name="schedule" size={14} />
                        <span className="font-data text-xs">{item.displayTime}</span>
                      </div>
                    </div>
                  );
                })
              )}

              <button
                onClick={() => { setTaskSlot(block.id); setShowTaskSheet(true); }}
                className="text-left font-body text-xs text-primary font-medium py-1.5 px-2 mt-0.5 hover:opacity-80 flex items-center gap-1"
              >
                + Add to {block.label}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 5. AI COACH CARD */}
      <section className="mt-6 p-4 rounded-[20px] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-start gap-3 relative border border-primary/10">
        <div className="flex-shrink-0 text-primary pt-0.5">
          <Icon name="auto_awesome" size={20} filled />
        </div>
        <div className="flex-1 pr-14">
          <p className="font-body text-sm text-on-surface font-normal leading-relaxed">
            {aiInsight}
          </p>
        </div>
        <div className="absolute right-3 top-3 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label text-[9px] tracking-wide uppercase font-semibold">
          Gemini
        </div>
      </section>

      {/* Task Creation Bottom Sheet */}
      <BottomSheet isOpen={showTaskSheet} onClose={() => setShowTaskSheet(false)} title="Create Task Item">
        <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Task Title</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Architect LifeOS API Spec"
              className="mt-1 w-full h-12 px-4 rounded-[16px] bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-xs text-on-surface-variant font-medium">Timeline Slot</label>
              <select
                value={taskSlot}
                onChange={(e) => setTaskSlot(e.target.value)}
                className="mt-1 w-full h-12 px-3 rounded-[16px] bg-surface-container-low text-on-surface font-body text-sm font-semibold focus:outline-none"
              >
                <option value="morning">Morning (08:00 AM)</option>
                <option value="afternoon">Afternoon (02:00 PM)</option>
                <option value="evening">Evening (08:00 PM)</option>
              </select>
            </div>

            <div>
              <label className="font-label text-xs text-on-surface-variant font-medium">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="mt-1 w-full h-12 px-3 rounded-[16px] bg-surface-container-low text-error font-body text-sm font-semibold focus:outline-none"
              >
                <option value="High Priority">● High Urgency</option>
                <option value="Medium">● Medium</option>
                <option value="Low">● Low</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 h-12 rounded-full bg-primary-container text-on-primary font-body text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
          >
            Save Task Protocol
          </button>
        </form>
      </BottomSheet>

      {/* Expense Log Bottom Sheet */}
      <BottomSheet isOpen={showExpenseSheet} onClose={() => setShowExpenseSheet(false)} title="Log Cashflow Expense">
        <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Amount (₹)</label>
            <input
              type="number"
              step="any"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="e.g. 320"
              className="mt-1 w-full h-12 px-4 rounded-[16px] bg-surface-container-low text-on-surface font-data font-bold text-lg focus:outline-none focus:bg-surface-container-lowest"
              required
            />
          </div>

          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Merchant / Title</label>
            <input
              type="text"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. Artisan Bakery"
              className="mt-1 w-full h-12 px-4 rounded-[16px] bg-surface-container-low text-on-surface focus:outline-none"
            />
          </div>

          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Category</label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {['Food', 'Transport', 'Fun', 'Fitness', 'Housing'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setExpenseCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full font-label text-xs font-semibold shrink-0 transition-all ${
                    expenseCategory === cat
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 h-12 rounded-full bg-secondary text-on-secondary font-body text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
          >
            Save Cashflow Entry
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
