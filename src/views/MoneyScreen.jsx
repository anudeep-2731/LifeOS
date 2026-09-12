import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import FinanceSettingsSheet from '../components/ui/FinanceSettingsSheet';
import { getTodayStr, getMonthStr } from '../db/database';
import { fetchCloudExpenses, addCloudExpense, fetchCloudSetting, saveCloudSetting } from '../lib/supabase';
import { calculateBudgetMetrics } from '../lib/budgetHealth';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Fun', 'Housing', 'Bills', 'Health', 'Other'];

export default function MoneyScreen() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [loading, setLoading] = useState(true);

  // Top Dropdown Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Keypad Bottom Sheet state
  const [showKeypadSheet, setShowKeypadSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [keypadVal, setKeypadVal] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [expenseTitle, setExpenseTitle] = useState('');

  const navigate = useNavigate();
  const today = getTodayStr();
  const currentMonth = getMonthStr();

  const loadExpenses = async () => {
    setLoading(true);
    const [expData, b, catConfig] = await Promise.all([
      fetchCloudExpenses(currentMonth),
      fetchCloudSetting('monthlyBudget', 30000),
      fetchCloudSetting('expenseCategories', []),
    ]);

    setExpenses(expData || []);
    if (b) setMonthlyBudget(b);

    if (catConfig && catConfig.length > 0) {
      const names = catConfig.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
      if (names.length > 0) setCategories(names);
    } else if (expData && expData.length > 0) {
      const existingCats = Array.from(new Set(expData.map(e => e.category).filter(Boolean)));
      if (existingCats.length > 0) {
        setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCats])));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const budgetMetrics = calculateBudgetMetrics(expenses, monthlyBudget, today, categories);

  // Keypad click handlers
  const handleKeypadNum = (val) => {
    if (keypadVal === '0') {
      setKeypadVal(val);
    } else if (keypadVal.length < 7) {
      setKeypadVal(prev => prev + val);
    }
  };

  const handleKeypadDelete = () => {
    if (keypadVal.length <= 1) {
      setKeypadVal('0');
    } else {
      setKeypadVal(prev => prev.slice(0, -1));
    }
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(keypadVal);
    if (!amt || isNaN(amt)) return;

    await addCloudExpense({
      title: expenseTitle.trim() || selectedCategory,
      description: expenseTitle.trim() || selectedCategory,
      amount: amt,
      category: selectedCategory,
      date: today,
      month: currentMonth,
      paymentMethod: 'UPI',
      paymentSource: 'HDFC Bank',
    });

    setShowKeypadSheet(false);
    setKeypadVal('0');
    setExpenseTitle('');
    loadExpenses();
  };

  const exportCSV = () => {
    if (expenses.length === 0) return alert('No expenses to export.');
    const headers = ['Date', 'Title', 'Amount', 'Category', 'PaymentMethod'];
    const rows = expenses.map(e => [e.date, `"${e.title || e.description}"`, e.amount, e.category, e.paymentMethod || 'UPI']);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LifeOS_Expenses_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 select-none max-w-lg mx-auto gap-5">
      {/* 1. TOP UTILITY & ACTION BAR */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Live Cashflow</span>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface font-label text-xs font-semibold">
              <span>{currentMonth}</span>
              <Icon name="expand_more" size={16} className="text-outline" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Portfolio Quick Button */}
            <button
              onClick={() => navigate('/portfolio')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors active:scale-95 text-on-surface"
              title="Wealth Portfolio"
            >
              <Icon name="account_balance" size={18} />
            </button>

            {/* Dropdown Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors active:scale-95 text-on-surface"
                aria-label="Cashflow Options"
              >
                <Icon name="more_vert" size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-container-lowest shadow-xl z-50 py-2 border border-outline-variant/30 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/expenses-history'); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors text-left font-label text-xs font-semibold"
                  >
                    <span>📊</span>
                    <span>View All Expenses</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/portfolio'); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors text-left font-label text-xs font-semibold"
                  >
                    <span>💎</span>
                    <span>Wealth Portfolio</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); exportCSV(); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors text-left font-label text-xs font-semibold"
                  >
                    <span>📤</span>
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setShowSettingsSheet(true); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors text-left font-label text-xs font-semibold"
                  >
                    <span>⚙️</span>
                    <span>Edit Budget & Categories</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal 7-Day Date Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { day: 'Wed', date: '10' },
            { day: 'Thu', date: '11' },
            { day: 'Fri', date: '12', active: true },
            { day: 'Sat', date: '13' },
            { day: 'Sun', date: '14' },
            { day: 'Mon', date: '15' },
            { day: 'Tue', date: '16' },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl min-w-[52px] shrink-0 transition-all ${
                item.active
                  ? 'bg-primary text-on-primary shadow-sm scale-105'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="font-label text-[11px] uppercase tracking-wide opacity-80">{item.day}</span>
              <span className="font-data text-sm font-bold mt-0.5">{item.date}</span>
              {item.active && <span className="w-1 h-1 rounded-full bg-white mt-0.5"></span>}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SAFE TO SPEND HERO CARD */}
      <div className="relative overflow-hidden rounded-[24px] bg-surface-container-lowest shadow-sm p-6 flex flex-col items-center text-center border border-outline-variant/20">
        {/* Soft Glow Ambient Background */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-secondary-fixed-dim/20 rounded-full blur-2xl pointer-events-none"></div>

        <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest relative z-10 font-bold">
          Safe to Spend Today
        </span>

        <div className="mt-2 flex items-baseline justify-center relative z-10">
          <span className="font-data text-4xl font-bold tracking-tight text-on-surface">
            ₹{budgetMetrics.safeSpendToday.toLocaleString()}
          </span>
        </div>

        <span className="font-body text-xs text-on-surface-variant mt-1 relative z-10">
          / day remaining
        </span>

        <div className="mt-4 relative z-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label text-xs font-semibold ${
            budgetMetrics.isOnTrack ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container text-error'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            {budgetMetrics.isOnTrack ? 'On Track ✓' : 'Over Pace ⚠️'}
          </span>
        </div>

        {/* Micro Cadence Sparkline Tracker */}
        <div className="w-full mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-label text-xs relative z-10 border-t border-outline-variant/20">
          <div className="flex-1 flex flex-col items-center border-r border-outline-variant/20 pr-2">
            <span className="text-[10px] uppercase tracking-wider text-outline">Spent Today</span>
            <span className="font-data text-xs font-semibold text-on-surface mt-0.5">
              ₹{budgetMetrics.todaySpent.toLocaleString()}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center pl-2">
            <span className="text-[10px] uppercase tracking-wider text-outline">Pace Buffer</span>
            <span className={`font-data text-xs font-semibold mt-0.5 ${budgetMetrics.paceBufferPercent >= 0 ? 'text-secondary' : 'text-error'}`}>
              {budgetMetrics.paceBufferPercent >= 0 ? `+${budgetMetrics.paceBufferPercent}% Buffer` : `${budgetMetrics.paceBufferPercent}% Over`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. QUICK LOG EXPENSE CTA BUTTON */}
      <button
        onClick={() => setShowKeypadSheet(true)}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary-container to-primary flex items-center justify-center gap-2 text-on-primary shadow-md active:scale-[0.98] transition-transform duration-150"
      >
        <Icon name="add" size={22} />
        <span className="font-headline text-base font-bold tracking-tight">Log Expense</span>
      </button>

      {/* 4. DYNAMIC BUDGET ENVELOPES SECTION */}
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline text-lg text-on-surface font-bold">Budget Envelopes</h2>
          <span className="font-label text-xs text-outline font-medium">{currentMonth} Cycle</span>
        </div>

        <div className="flex flex-col gap-3">
          {budgetMetrics.envelopes.map((env) => (
            <div key={env.name} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-base">
                {env.emoji || '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-label text-xs text-on-surface font-semibold truncate">{env.name}</span>
                    {env.status === 'error' && (
                      <span className="font-label text-[9px] text-error bg-error-container/60 px-1.5 py-0.5 rounded-full font-bold">
                        Over {env.percent - 100}%
                      </span>
                    )}
                  </div>
                  <span className={`font-data text-xs shrink-0 ${env.status === 'error' ? 'text-error font-bold' : 'text-outline'}`}>
                    ₹{env.spent.toLocaleString()} / ₹{env.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      env.status === 'secondary'
                        ? 'bg-secondary'
                        : env.status === 'tertiary'
                        ? 'bg-tertiary-fixed-dim'
                        : 'bg-error'
                    }`}
                    style={{ width: `${Math.min(100, env.percent)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. RECENT TRANSACTIONS SECTION */}
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-headline text-lg text-on-surface font-bold">Expenses</h2>
            <span className="font-label text-xs text-outline font-medium">Recent Activity</span>
          </div>
          <button
            onClick={() => navigate('/expenses-history')}
            className="font-label text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline"
          >
            See All <Icon name="arrow_forward" size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-3xl bg-surface-container-lowest p-2 shadow-sm border border-outline-variant/20">
          {expenses.length === 0 ? (
            <div className="p-4 text-center text-xs text-on-surface-variant italic">
              No expenses logged for this month yet.
            </div>
          ) : (
            expenses.slice(0, 5).map((exp, idx) => (
              <div
                key={exp.id || idx}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center shrink-0">
                    <Icon name="payments" size={20} className="text-secondary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label text-xs text-on-surface font-semibold truncate">
                      {exp.title || exp.description || exp.category}
                    </span>
                    <span className="font-body text-[11px] text-outline truncate">
                      {exp.date} · {exp.category}
                    </span>
                  </div>
                </div>
                <span className="font-data text-xs font-bold text-on-surface shrink-0 pl-2">
                  -₹{Number(exp.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TACTILE KEYPAD EXPENSE SHEET WITH DYNAMIC CATEGORIES */}
      <BottomSheet isOpen={showKeypadSheet} onClose={() => setShowKeypadSheet(false)} title="Log Expense">
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {/* Keypad Display */}
          <div className="flex flex-col items-center py-2">
            <span className="font-label text-[11px] text-outline uppercase tracking-wider mb-1 font-semibold">Amount</span>
            <div className="flex items-baseline justify-center">
              <span className="font-data text-4xl font-bold tracking-tight text-on-surface">
                ₹{keypadVal}
              </span>
            </div>
          </div>

          {/* Title input */}
          <input
            type="text"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            placeholder="Merchant / Note (e.g. Artisan Bakery)"
            className="w-full h-10 px-4 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-outline focus:outline-none"
          />

          {/* Dynamic Category Selector Pills */}
          <div>
            <label className="font-label text-[11px] text-outline font-semibold mb-1 block">Category</label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {categories.map((catName) => (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-3 py-1.5 rounded-full font-label text-xs shrink-0 transition-all ${
                    selectedCategory === catName
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadNum(num)}
                className="h-12 rounded-2xl bg-surface-container-low active:bg-surface-container text-on-surface font-data text-xl font-semibold flex items-center justify-center transition-transform active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleKeypadDelete}
              className="h-12 rounded-2xl bg-surface-container-low active:bg-surface-container text-on-surface font-data text-xl font-semibold flex items-center justify-center transition-transform active:scale-95"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleSaveExpense}
            className="w-full h-12 rounded-full bg-primary-container text-on-primary font-body text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform shadow-md mt-1"
          >
            Save Cashflow Entry
          </button>
        </div>
      </BottomSheet>

      {/* Finance Settings Sheet */}
      <FinanceSettingsSheet
        isOpen={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        monthlyBudget={monthlyBudget}
        onSaveBudget={async (newBudget) => {
          setMonthlyBudget(newBudget);
          await saveCloudSetting('monthlyBudget', newBudget);
          loadExpenses();
        }}
      />
    </div>
  );
}
