import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import FinanceSettingsSheet from '../components/ui/FinanceSettingsSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, getMonthStr, seedTodayData, rolloverFinancials } from '../db/database';
import { 
  fetchCloudExpenses, 
  addCloudExpense, 
  updateCloudExpense, 
  deleteCloudExpense, 
  adjustCloudHoldingBalance,
  fetchCloudSetting
} from '../lib/supabase';
import { downloadCSV } from '../lib/ExportUtils';

const DEFAULT_CATEGORY_METADATA = [
  { name: 'Food', emoji: '🍔', icon: 'lunch_dining', defaultBudget: 5000, color: 'text-secondary', bg: 'bg-secondary-container/40' },
  { name: 'Transport', emoji: '🚗', icon: 'directions_car', defaultBudget: 3000, color: 'text-primary', bg: 'bg-primary-fixed/40' },
  { name: 'Shopping', emoji: '🛍️', icon: 'shopping_bag', defaultBudget: 4000, color: 'text-tertiary', bg: 'bg-tertiary-fixed/40' },
  { name: 'Dining', emoji: '🍜', icon: 'ramen_dining', defaultBudget: 3000, color: 'text-secondary', bg: 'bg-secondary-container/40' },
  { name: 'Utilities', emoji: '⚡', icon: 'bolt', defaultBudget: 2500, color: 'text-tertiary', bg: 'bg-tertiary-fixed/50' },
  { name: 'Health', emoji: '💊', icon: 'health_and_safety', defaultBudget: 2000, color: 'text-secondary', bg: 'bg-secondary-fixed/40' },
  { name: 'Entertainment', emoji: '🎬', icon: 'movie', defaultBudget: 2500, color: 'text-error', bg: 'bg-error-container/50' },
  { name: 'Other', emoji: '📦', icon: 'more_horiz', defaultBudget: 2000, color: 'text-outline', bg: 'bg-surface-container-high' },
];

const PAYMENT_SOURCES = [
  'HDFC Bank',
  'SBI Bank',
  'Credit Card',
  'Cash in Hand',
  'UPI / GPay',
  'Axis Bank',
  'Other'
];

export default function ExpensesTab() {
  const navigate = useNavigate();
  const today = getTodayStr();
  const currentMonthStr = getMonthStr();

  // State
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState(null); // null means all month
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);

  // Expense Logger Sheet Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [logAmount, setLogAmount] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logCategory, setLogCategory] = useState('Food');
  const [logPaymentSource, setLogPaymentSource] = useState('HDFC Bank');
  const [logDate, setLogDate] = useState(today);
  const [isSaving, setIsSaving] = useState(false);

  // Week strip generator around today
  const weekStripDays = useMemo(() => {
    const curr = new Date(today);
    const day = curr.getDay(); // 0 is Sun
    const mondayDiff = day === 0 ? -6 : 1 - day;
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
        dateStr,
        isToday: dateStr === today
      });
    }
    return days;
  }, [today]);

  // Load Financial Data
  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      await seedTodayData();
      await rolloverFinancials(selectedMonth);

      const [b, cb, monthExpenses] = await Promise.all([
        fetchCloudSetting('monthlyBudget', 30000),
        fetchCloudSetting('categoryBudgets', {}),
        fetchCloudExpenses(selectedMonth)
      ]);

      if (b !== undefined && b !== null) setMonthlyBudget(Number(b) || 30000);
      if (cb) setCategoryBudgets(cb);
      setExpenses(monthExpenses || []);
    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Financial Metrics Computation
  const {
    monthSpent,
    todaySpent,
    remainingMonthlyBudget,
    safeToSpendToday,
    targetDailySafe,
    burnPercent,
    isOnTrack,
    bufferPercent,
    dashOffset
  } = useMemo(() => {
    const totalMonth = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalToday = expenses
      .filter(e => e.date === today)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    const remBudget = Math.max(0, monthlyBudget - totalMonth);
    const safeToday = Math.round(remBudget / daysRemaining);
    const targetDaily = Math.round(monthlyBudget / totalDaysInMonth);

    // Radial Gauge
    const radius = 88;
    const circumference = 2 * Math.PI * radius; // ~552.92
    const totalDailyCapacity = Math.max(1, safeToday + totalToday);
    const burn = Math.min(100, Math.round((totalToday / totalDailyCapacity) * 100));
    const offset = circumference - (circumference * burn) / 100;

    const onTrack = totalToday <= safeToday || safeToday > 0;
    const buffer = safeToday > targetDaily ? Math.round(((safeToday - targetDaily) / targetDaily) * 100) : 0;

    return {
      monthSpent: totalMonth,
      todaySpent: totalToday,
      remainingMonthlyBudget: remBudget,
      safeToSpendToday: safeToday,
      targetDailySafe: targetDaily,
      burnPercent: burn,
      isOnTrack: onTrack,
      bufferPercent: buffer,
      dashOffset: offset
    };
  }, [expenses, monthlyBudget, today]);

  // Category Envelopes Breakdown
  const envelopes = useMemo(() => {
    const spendByCategory = {};
    expenses.forEach(e => {
      spendByCategory[e.category] = (spendByCategory[e.category] || 0) + (Number(e.amount) || 0);
    });

    return DEFAULT_CATEGORY_METADATA.map(meta => {
      const budget = categoryBudgets[meta.name] || meta.defaultBudget;
      const spent = spendByCategory[meta.name] || 0;
      const left = Math.max(0, budget - spent);
      const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
      const isOver = spent > budget;
      const isNear = pct >= 85 && !isOver;

      return {
        ...meta,
        budget,
        spent,
        left,
        pct,
        isOver,
        isNear
      };
    });
  }, [expenses, categoryBudgets]);

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (selectedDate) {
      list = list.filter(e => e.date === selectedDate);
    }
    if (selectedCategoryFilter) {
      list = list.filter(e => e.category === selectedCategoryFilter);
    }
    return list.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [expenses, selectedDate, selectedCategoryFilter]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (nextStr <= currentMonthStr) {
      setSelectedMonth(nextStr);
      setSelectedDate(null);
    }
  };

  const formattedMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Open Log Modal for New Expense
  const openNewExpenseModal = () => {
    setEditingExpenseId(null);
    setLogAmount('');
    setLogDescription('');
    setLogCategory('Food');
    setLogPaymentSource('HDFC Bank');
    setLogDate(selectedDate || today);
    setShowLogModal(true);
  };

  // Open Log Modal for Editing
  const openEditExpenseModal = (exp) => {
    setEditingExpenseId(exp.id);
    setLogAmount(String(exp.amount));
    setLogDescription(exp.description);
    setLogCategory(exp.category);
    setLogPaymentSource(exp.paymentSource || 'HDFC Bank');
    setLogDate(exp.date);
    setShowLogModal(true);
  };

  // Save Transaction
  const handleSaveTransaction = async (e) => {
    if (e) e.preventDefault();
    const amount = Number(logAmount);
    if (!amount || amount <= 0 || !logDescription.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (editingExpenseId) {
        await updateCloudExpense(editingExpenseId, {
          amount,
          description: logDescription.trim(),
          category: logCategory,
          paymentSource: logPaymentSource,
          date: logDate,
          notes: ''
        });
      } else {
        await addCloudExpense({
          amount,
          description: logDescription.trim(),
          category: logCategory,
          paymentSource: logPaymentSource,
          date: logDate,
          timestamp,
          notes: ''
        });
        await adjustCloudHoldingBalance(logPaymentSource, -amount);
      }

      setShowLogModal(false);
      await loadFinancialData();
    } catch (err) {
      console.error('Error saving transaction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (exp) => {
    if (!confirm(`Delete expense "${exp.description}" for ₹${exp.amount}?`)) return;
    try {
      if (exp.paymentSource) {
        await adjustCloudHoldingBalance(exp.paymentSource, exp.amount);
      }
      await deleteCloudExpense(exp.id);
      await loadFinancialData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // Keypad button press
  const handleKeypadPress = (val) => {
    if (val === 'backspace') {
      setLogAmount(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!logAmount.includes('.')) {
        setLogAmount(prev => prev ? `${prev}.` : '0.');
      }
    } else {
      setLogAmount(prev => prev === '0' ? val : prev + val);
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-28">
      <main className="flex flex-col relative w-full max-w-4xl mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="flex flex-col w-full relative pb-6 gap-5">

          {/* Interactive Action Bar / Top Level Utility */}
          <div className="flex flex-col gap-3 pt-2 relative">
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Live Cashflow
                  </span>
                </div>

                {/* Month Picker Button */}
                <div className="flex items-center gap-1 bg-surface-container rounded-full px-1.5 py-0.5 border border-outline-variant/15">
                  <button
                    onClick={handlePrevMonth}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                  >
                    <Icon name="chevron_left" size={16} />
                  </button>
                  <span className="font-headline font-bold text-xs text-on-surface px-1">
                    {formattedMonth}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    disabled={selectedMonth >= currentMonthStr}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface disabled:opacity-30 cursor-pointer"
                  >
                    <Icon name="chevron_right" size={16} />
                  </button>
                </div>
              </div>

              {/* Utility Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Date Picker Button */}
                <button
                  onClick={() => setSelectedDate(selectedDate ? null : today)}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
                    selectedDate 
                      ? "bg-primary text-white shadow-xs" 
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                  )}
                  title={selectedDate ? `Filtering by ${selectedDate} (Click to clear)` : 'Filter today'}
                >
                  <Icon name="calendar_today" size={18} />
                </button>

                {/* Options Menu Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors active:scale-95 text-on-surface cursor-pointer"
                    title="Cashflow Options"
                  >
                    <Icon name="more_vert" size={18} />
                  </button>

                  {showMenuDropdown && (
                    <div className="absolute right-0 mt-1 w-56 rounded-2xl bg-surface-container-lowest shadow-card border border-outline-variant/20 z-40 py-2 origin-top-right animate-fadeIn">
                      <button
                        onClick={() => {
                          setShowMenuDropdown(false);
                          navigate('/portfolio');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span>💎</span>
                        <span>Wealth Portfolio &amp; Holdings</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMenuDropdown(false);
                          downloadCSV(expenses, `lifeos-expenses-${selectedMonth}.csv`);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span>📤</span>
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMenuDropdown(false);
                          setShowSettings(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span>⚙️</span>
                        <span>Edit Budget &amp; Envelopes</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horizontal 7-Day Precision Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedDate(null)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-2xl min-w-[56px] shrink-0 transition-all cursor-pointer",
                  selectedDate === null
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                )}
              >
                <span className="text-[10px] uppercase font-semibold opacity-80">ALL</span>
                <span className="font-headline text-xs font-bold mt-0.5">Month</span>
              </button>

              {weekStripDays.map((d) => {
                const isSelected = selectedDate === d.dateStr;

                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : d.dateStr)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-3 rounded-2xl min-w-[50px] shrink-0 transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-white shadow-xs font-bold scale-105"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                    )}
                  >
                    <span className="text-[10px] uppercase font-semibold opacity-75">{d.name}</span>
                    <span className="font-mono text-xs font-bold mt-0.5">{d.dayNum}</span>
                    {d.isToday && <span className={cn("w-1 h-1 rounded-full mt-0.5", isSelected ? "bg-white" : "bg-primary")}></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concentric Ring & Radial Cashflow Card */}
          <div className="relative overflow-hidden rounded-[28px] bg-surface-container-lowest shadow-card border border-outline-variant/20 p-5 sm:p-6 flex flex-col items-center">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-32 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />

            {/* Radial Concentric Ring Visualizer */}
            <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 220 220">
                {/* Background Track */}
                <circle cx="110" cy="110" fill="none" r="88" stroke="#ecedf7" strokeLinecap="round" strokeWidth="14" />
                {/* Active Burn Ring */}
                <circle
                  className="transition-all duration-700 ease-out"
                  cx="110"
                  cy="110"
                  fill="none"
                  r="88"
                  stroke={isOnTrack ? '#0050cb' : '#ba1a1a'}
                  strokeDasharray="552.92"
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  strokeWidth="14"
                />
              </svg>

              {/* Typography Inside Radial Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-[10px] text-outline uppercase tracking-[0.14em] font-bold">
                  AVAILABLE TODAY
                </span>
                <div className="mt-1 flex items-baseline justify-center">
                  <span className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
                    ₹{safeToSpendToday.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  of ₹{targetDailySafe.toLocaleString('en-IN')} daily cap
                </span>
              </div>
            </div>

            {/* Dual Floating Status Badges */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs",
                isOnTrack 
                  ? "bg-secondary-container/50 text-secondary" 
                  : "bg-error-container/60 text-error"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isOnTrack ? "bg-secondary" : "bg-error")}></span>
                {isOnTrack ? 'Calm & On Track ✓' : 'Daily Cap Exceeded'}
              </span>

              {bufferPercent > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed/60 text-primary text-xs font-semibold">
                  <span>📈</span>
                  +{bufferPercent}% Buffer
                </span>
              )}
            </div>

            {/* Compact Horizontal 3-Column Footer */}
            <div className="w-full mt-4 pt-3 border-t border-outline-variant/15 grid grid-cols-3 divide-x divide-outline-variant/20 text-center">
              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] uppercase tracking-wider text-outline font-bold">SPENT TODAY</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-on-surface mt-0.5">
                  ₹{todaySpent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] uppercase tracking-wider text-outline font-bold">REMAINING CAP</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-primary mt-0.5">
                  ₹{safeToSpendToday.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] uppercase tracking-wider text-outline font-bold">MONTH ACCRUAL</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-on-surface mt-0.5">
                  ₹{monthSpent.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Log CTA Button */}
          <button
            onClick={openNewExpenseModal}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-primary to-primary-container flex items-center justify-center gap-2 text-white shadow-md active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Icon name="add" size={20} className="font-bold" />
            <span className="font-headline text-sm sm:text-base font-bold tracking-tight">
              Log Expense
            </span>
          </button>

          {/* Budget Envelopes Section */}
          <div className="flex flex-col w-full gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Budget Envelopes
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant font-mono">
                  {envelopes.length} Active
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-outline">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="font-medium">{formattedMonth} Cycle</span>
              </div>
            </div>

            {/* 8 Detailed Envelope Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {envelopes.map((env) => {
                const isFiltered = selectedCategoryFilter === env.name;

                return (
                  <div
                    key={env.name}
                    onClick={() => setSelectedCategoryFilter(isFiltered ? null : env.name)}
                    className={cn(
                      "flex flex-col justify-between p-3 rounded-2xl bg-surface-container-lowest shadow-xs border transition-all cursor-pointer group active:scale-[0.99]",
                      isFiltered 
                        ? "border-primary ring-2 ring-primary/20 shadow-sm" 
                        : "border-outline-variant/20 hover:border-outline-variant/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base shadow-2xs", env.bg)}>
                        {env.emoji}
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                        env.isOver 
                          ? "bg-error-container/60 text-error" 
                          : env.isNear 
                            ? "bg-tertiary-fixed/60 text-tertiary" 
                            : "bg-secondary-container/40 text-secondary"
                      )}>
                        {env.isOver ? 'Over' : `${env.pct}%`}
                      </span>
                    </div>

                    <div className="mt-2 min-w-0">
                      <div className="font-headline text-xs font-bold text-on-surface truncate">
                        {env.name}
                      </div>
                      <div className={cn(
                        "text-[11px] truncate",
                        env.isOver ? "text-error font-semibold" : "text-outline"
                      )}>
                        {env.isOver ? `+₹${(env.spent - env.budget).toLocaleString('en-IN')} over` : `₹${env.left.toLocaleString('en-IN')} left`}
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden my-2">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          env.isOver ? "bg-error" : env.isNear ? "bg-tertiary-container" : "bg-secondary"
                        )}
                        style={{ width: `${env.pct}%` }}
                      />
                    </div>

                    <div className="flex items-baseline justify-between text-[11px] font-mono">
                      <span className="font-bold text-on-surface">₹{env.spent.toLocaleString('en-IN')}</span>
                      <span className="text-outline">/ ₹{env.budget.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Expenses Section */}
          <div className="flex flex-col w-full gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-baseline gap-2">
                <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                  Expenses
                </h2>
                <span className="text-xs text-outline font-medium">
                  {selectedDate ? selectedDate : selectedCategoryFilter ? `${selectedCategoryFilter} Filter` : formattedMonth}
                </span>
              </div>

              {(selectedDate || selectedCategoryFilter) && (
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedCategoryFilter(null);
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>

            {/* Transactions List */}
            <div className="flex flex-col gap-2 rounded-3xl bg-surface-container-lowest p-3 shadow-card border border-outline-variant/20">
              {loading ? (
                <div className="p-8 text-center text-xs text-outline animate-pulse">
                  Loading expenses...
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <p className="font-headline font-bold text-xs text-secondary">
                    No Expenses Found
                  </p>
                  <p className="text-[11px] text-outline">
                    No transactions recorded for this selected criteria.
                  </p>
                </div>
              ) : (
                filteredExpenses.map((exp) => {
                  const meta = DEFAULT_CATEGORY_METADATA.find(c => c.name === exp.category) || {
                    emoji: '📦',
                    icon: 'payments',
                    bg: 'bg-surface-container'
                  };

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-surface-container-low transition-colors border border-outline-variant/10 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg shadow-2xs", meta.bg)}>
                          {meta.emoji}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                            {exp.description}
                          </span>
                          <span className="text-[11px] text-outline truncate mt-0.5">
                            {exp.date === today ? 'Today' : exp.date} {exp.timestamp && `· ${exp.timestamp}`} · {exp.paymentSource || 'HDFC Bank'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-mono text-xs sm:text-sm font-bold text-on-surface">
                          -₹{Number(exp.amount).toLocaleString('en-IN')}
                        </span>

                        <button
                          onClick={() => openEditExpenseModal(exp)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Edit expense"
                        >
                          <Icon name="edit" size={15} />
                        </button>

                        <button
                          onClick={() => handleDeleteExpense(exp)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-error transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Delete expense"
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Tactile iOS-Style Log Expense Modal / Bottom Sheet */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-outline-variant/25 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto mb-0.5 sm:hidden"></div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                {editingExpenseId ? 'Edit Transaction' : 'Log Expense'}
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Amount Display */}
            <div className="flex flex-col items-center py-2 bg-surface-container-low rounded-2xl border border-outline-variant/15">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">Amount</span>
              <div className="flex items-baseline justify-center">
                <span className="font-headline font-extrabold text-3xl sm:text-4xl text-primary">
                  ₹{logAmount || '0'}
                </span>
              </div>
            </div>

            {/* Category Pills Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">Category</label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {DEFAULT_CATEGORY_METADATA.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setLogCategory(cat.name)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer",
                      logCategory === cat.name
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant">Description</label>
              <input
                type="text"
                value={logDescription}
                onChange={(e) => setLogDescription(e.target.value)}
                placeholder="e.g. Sourdough Bakery / Metro Reload"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-xs sm:text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary border border-outline-variant/15"
              />
            </div>

            {/* Payment Source and Date */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Payment Source</label>
                <select
                  value={logPaymentSource}
                  onChange={(e) => setLogPaymentSource(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold focus:outline-none border border-outline-variant/15"
                >
                  {PAYMENT_SOURCES.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-mono focus:outline-none border border-outline-variant/15"
                />
              </div>
            </div>

            {/* Tactile Keypad Grid */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((keyVal) => (
                <button
                  key={keyVal}
                  type="button"
                  onClick={() => handleKeypadPress(keyVal)}
                  className="h-10 rounded-xl bg-surface-container-low hover:bg-surface-container active:bg-surface-container-high text-on-surface font-mono text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  {keyVal === 'backspace' ? <Icon name="backspace" size={18} /> : keyVal}
                </button>
              ))}
            </div>

            {/* Save Transaction Button */}
            <button
              type="button"
              onClick={handleSaveTransaction}
              disabled={!logAmount || Number(logAmount) <= 0 || !logDescription.trim() || isSaving}
              className="w-full h-12 mt-1 rounded-2xl bg-primary text-white font-headline font-bold text-sm flex items-center justify-center shadow-md active:scale-[0.98] transition-transform disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? 'Saving...' : editingExpenseId ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </div>
      )}

      {/* Finance Settings Sheet */}
      <FinanceSettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={loadFinancialData}
      />
    </div>
  );
}
