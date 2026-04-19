import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import SmartImportSheet from '../components/ui/SmartImportSheet';
import FinanceSettingsSheet from '../components/ui/FinanceSettingsSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, getMonthStr, seedTodayData, rolloverFinancials } from '../db/database';
import { DEFAULT_CATEGORY, EMPTY_FORM } from '../lib/constants';
import { downloadCSV } from '../lib/ExportUtils';

function CategoryIcon({ category, config }) {
  const cfg = config?.find(c => c.name === category) || { icon: 'more_horiz', color: 'text-outline', bg: 'bg-surface-container' };
  return (
    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon name={cfg.icon} size={22} className={cfg.color} />
    </div>
  );
}

function ExpenseRow({ expense, onDelete, onEdit, categories }) {
  const today = getTodayStr();
  const dateDisplay = expense.date === today ? 'Today' : expense.date;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-4 shadow-card">
      <CategoryIcon category={expense.category} config={categories} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-on-surface truncate">{expense.description}</p>
        <p className="text-xs text-outline mt-0.5">{expense.category} &bull; {dateDisplay} {expense.timestamp}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-headline font-bold text-tertiary text-sm">
          &#8722;&#8377;{expense.amount.toLocaleString()}
        </span>
        <button onClick={onEdit} className="text-outline-variant hover:text-primary transition-colors p-1" aria-label="Edit expense">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={onDelete} className="text-outline-variant hover:text-error transition-colors p-1" aria-label="Delete expense">
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({ onSave, onClose, initialData, editId, categories = [] }) {
  const [form, setForm] = useState(initialData || { ...EMPTY_FORM, date: getTodayStr() });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    
    const amount = Number(form.amount);
    const date = form.date || getTodayStr();
    
    if (editId) {
      await db.expenses.update(editId, {
        amount,
        category: form.category,
        description: form.description.trim(),
        date,
      });
    } else {
      const now   = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      await db.expenses.add({
        date,
        timestamp,
        amount,
        category: form.category,
        description: form.description.trim(),
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Date</label>
          <input type="date" className="input-pill w-full text-sm" 
            value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Amount (₹)</label>
          <input type="number" min="0" step="any" className="input-pill w-full text-sm font-bold text-primary" placeholder="e.g. 450"
            value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
      </div>
      
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Description</label>
        <input className="input-pill w-full text-sm" placeholder="e.g. Coffee & Sandwich"
          value={form.description} onChange={e => set('description', e.target.value)} required />
      </div>

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Category</label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => {
            return (
              <button key={cat.name} type="button" onClick={() => set('category', cat.name)}
                className={cn('flex flex-col items-center gap-1 py-3 rounded-2xl text-[10px] font-semibold transition-all active:scale-95',
                  form.category === cat.name ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
                <Icon name={cat.icon} size={18} />{cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {editId && initialData?.emailBody && (
        <details className="text-xs">
          <summary className="cursor-pointer text-outline font-semibold select-none flex items-center gap-1.5 px-1">
            <Icon name="mail" size={13} className="text-outline" /> Source email
          </summary>
          <div className="mt-2 bg-surface-container rounded-xl p-3 border border-outline-variant/20 max-h-28 overflow-y-auto">
            <p className="font-mono text-[11px] text-outline leading-relaxed whitespace-pre-wrap break-words">
              {initialData.emailBody.substring(0, 400)}
            </p>
          </div>
        </details>
      )}

      <button type="submit" className="btn-primary w-full py-4 mt-2">
        {editId ? 'Save Changes' : 'Add Expense'}
      </button>
    </form>
  );
}

function MonthlyItemInput({ type, category, date, onSave, defaultValue = 0, colorClass = 'text-primary', bgClass = 'bg-primary/5', borderClass = 'border-primary/20', hideAmount = false }) {
  const [val, setVal] = useState(defaultValue);
  const [editing, setEditing] = useState(false);

  // Sync with defaultValue when it changes (e.g. month navigation)
  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  const save = async () => {
    const table = type === 'investment' ? 'investments' : type === 'income' ? 'income' : 'emis';
    const existing = await db[table].where({ month: date, category }).first();
    if (existing) {
      await db[table].update(existing.id, { amount: Number(val) });
    } else {
      await db[table].add({ month: date, category, amount: Number(val) });
    }
    setEditing(false);
    onSave();
  };

  if (!editing && val === 0) {
    return (
      <button onClick={() => setEditing(true)} className="flex items-center justify-between w-full p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-all">
        <span className="text-xs text-outline">{category}</span>
        <Icon name="add" size={16} className="text-outline" />
      </button>
    );
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2 w-full p-2 rounded-2xl border", bgClass, borderClass)}>
        <input type="number" autoFocus className={cn("bg-transparent w-full text-sm font-bold focus:outline-none px-2", colorClass)}
          value={val} onChange={e => setVal(e.target.value)}
          onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} />
        <button onClick={save} className={colorClass}><Icon name="check" size={18} /></button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className={cn("flex items-center justify-between w-full p-3 rounded-2xl border transition-all", bgClass, borderClass)}>
      <span className={cn("text-xs font-bold", colorClass)}>{category}</span>
      <span className={cn("text-sm font-headline font-bold", colorClass)}>
        {hideAmount ? '₹••••' : `₹${val.toLocaleString()}`}
      </span>
    </button>
  );
}

export default function MoneyTab() {
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const [budget, setBudget] = useState(30000);
  const [investCats, setInvestCats] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(getMonthStr());
  const [nlInput, setNlInput] = useState('');
  const [isNlProcessing, setIsNlProcessing] = useState(false);

  const [categories, setCategories] = useState([]);
  const [income, setIncome] = useState([]);
  const [emis, setEmis] = useState([]);
  const [incomeCats, setIncomeCats] = useState([]);
  const [emiCats, setEmiCats] = useState([]);

  // Privacy & Collapse State
  const [isPrivate, setIsPrivate] = useState(true);
  const [incomeCollapsed, setIncomeCollapsed] = useState(true);
  const [emiCollapsed, setEmiCollapsed] = useState(true);
  const [investmentsCollapsed, setInvestmentsCollapsed] = useState(true);

  const today = getTodayStr();

  const loadData = async () => {
    setLoading(true);
    
    // Ensure seeds and rollover
    await seedTodayData();
    await rolloverFinancials(selectedMonth);

    const [b, c, cb, ec, ic, mc] = await Promise.all([
      db.settings.get('monthlyBudget'),
      db.settings.get('investmentCategories'),
      db.settings.get('categoryBudgets'),
      db.settings.get('expenseCategories'),
      db.settings.get('incomeCategories'),
      db.settings.get('emiCategories'),
    ]);

    if (b)  setBudget(b.value);
    if (c)  setInvestCats(c.value);
    if (cb) setCategoryBudgets(cb.value);
    if (ec) setCategories(ec.value);
    if (ic) setIncomeCats(ic.value);
    if (mc) setEmiCats(mc.value);

    // Load monthly data
    const [monthExpenses, currentInvests, currentIncome, currentEmis] = await Promise.all([
      db.expenses.filter(e => e.date.startsWith(selectedMonth)).toArray(),
      db.investments.where('month').equals(selectedMonth).toArray(),
      db.income.where('month').equals(selectedMonth).toArray(),
      db.emis.where('month').equals(selectedMonth).toArray(),
    ]);

    monthExpenses.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
    
    setExpenses(monthExpenses);
    setInvestments(currentInvests);
    setIncome(currentIncome);
    setEmis(currentEmis);

    setLoading(false);
  };

  const handleQuickAdd = async (e) => {
    if (e.key !== 'Enter' || !nlInput.trim()) return;
    setIsNlProcessing(true);
    
    try {
      // Import parser logic or use a simple regex for now
      // Pattern 1: [amount] for [desc]
      // Pattern 2: [desc] [amount]
      let amount = null;
      let description = '';
      
      const amtMatch = nlInput.match(/(\d+(?:\.\d+)?)/);
      if (amtMatch) amount = Number(amtMatch[1]);
      
      description = nlInput.replace(/(\d+(?:\.\d+)?)/, '').replace(/\b(for|on|at|spent|paid)\b/gi, '').trim();
      
      if (amount && description) {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        await db.expenses.add({
          date: today,
          timestamp,
          amount,
          description,
          category: DEFAULT_CATEGORY, // Use default from constants
        });
        setNlInput('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNlProcessing(false);
    }
  };

  useEffect(() => {
    seedTodayData().then(loadData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('life-os:settings-saved', handler);
    return () => window.removeEventListener('life-os:settings-saved', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleDelete = async (expense) => {
    await db.expenses.delete(expense.id);
    loadData();
  };

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalInvest = investments.reduce((s, i) => s + i.amount, 0);
  const totalEmis   = emis.reduce((s, i) => s + i.amount, 0);
  const monthSpent  = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebits = monthSpent + totalInvest + totalEmis;
  const netBalance  = totalIncome - totalDebits;

  const todaySpent = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const remaining  = budget - monthSpent;
  const pct        = Math.min((monthSpent / budget) * 100, 100);
  const barColor   = pct > 90 ? 'bg-error' : pct > 70 ? 'bg-tertiary' : 'bg-primary';

  const healthPct  = totalIncome > 0 ? Math.max(0, Math.min((netBalance / totalIncome) * 100, 100)) : 0;
  const healthColor = netBalance < 0 ? 'text-error' : netBalance < totalIncome * 0.1 ? 'text-tertiary' : 'text-primary';

  const now = new Date();
  const [selYear, selMonth0] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(selYear, selMonth0, 0).getDate();
  const isCurrentMonth = selectedMonth === getMonthStr();
  const daysRemaining = isCurrentMonth ? Math.max(daysInMonth - now.getDate() + 1, 1) : daysInMonth;
  const dailyAllowance = Math.max(remaining / daysRemaining, 0);

  const catTotals = useMemo(() => {
    return expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }, [expenses]);

  const handleExport = () => {
    const data = [
      ...expenses.map(e => ({ type: 'Expense', date: e.date, category: e.category, description: e.description, amount: e.amount })),
      ...income.map(i => ({ type: 'Income', date: selectedMonth, category: i.category, description: 'Monthly Income', amount: i.amount })),
      ...investments.map(i => ({ type: 'Investment', date: selectedMonth, category: i.category, description: 'Monthly Investment', amount: i.amount })),
      ...emis.map(e => ({ type: 'EMI', date: selectedMonth, category: e.category, description: 'Monthly EMI', amount: e.amount })),
    ];
    downloadCSV(`finance_report_${selectedMonth}.csv`, data);
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-4 bg-surface-container-low">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <input type="month"
              className="bg-transparent text-lg font-headline font-bold text-on-surface focus:outline-none"
              value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            {selectedMonth !== getMonthStr() && (
              <button onClick={() => setSelectedMonth(getMonthStr())}
                className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-all">
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 bg-surface-container text-outline-variant text-xs font-semibold rounded-full px-3 py-2 hover:bg-surface-container-high transition-all active:scale-95">
              <Icon name="download" size={14} />
            </button>
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 bg-surface-container text-outline-variant text-xs font-semibold rounded-full px-3 py-2 hover:bg-surface-container-high transition-all active:scale-95">
              <Icon name="tune" size={14} />
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-primary-fixed text-on-primary-fixed-variant text-xs font-semibold rounded-full px-4 py-2 hover:bg-primary-fixed-dim transition-all active:scale-95">
              <Icon name="auto_awesome" size={14} />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Health Overview */}
      <div className="mx-4 mt-2 grid grid-cols-2 gap-3">
        <div className="card-floating p-4 bg-primary/5 border-primary/10 relative group">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] text-outline uppercase font-bold tracking-wider">Total Income</p>
            <button onClick={() => setIsPrivate(!isPrivate)} className="text-outline-variant hover:text-primary transition-colors">
              <Icon name={isPrivate ? "visibility_off" : "visibility"} size={14} />
            </button>
          </div>
          <p className="text-xl font-headline font-extrabold text-primary">
            {isPrivate ? '₹••••' : `₹${totalIncome.toLocaleString()}`}
          </p>
        </div>
        <div className="card-floating p-4 bg-tertiary/5 border-tertiary/10">
          <p className="text-[10px] text-outline uppercase font-bold tracking-wider mb-1">Net Balance</p>
          <p className={cn("text-xl font-headline font-extrabold", healthColor)}>
            {isPrivate ? '₹••••' : `₹${netBalance.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Monthly spending progress bar card */}
      <div className="mx-4 mt-4 card-floating overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-outline uppercase tracking-wider mb-1">Expense Budget</p>
              <p className="text-4xl font-headline font-extrabold text-on-surface leading-tight">
                &#8377;{monthSpent.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-outline uppercase tracking-wider mb-1">Allowance</p>
              <p className="text-xl font-headline font-bold text-secondary">
                &#8377;{Math.floor(dailyAllowance).toLocaleString()}<span className="text-xs text-outline">/day</span>
              </p>
            </div>
          </div>

          <div className="w-full h-3 bg-outline-variant/30 rounded-full overflow-hidden mb-2 mt-4">
            <div className={cn('h-full rounded-full transition-all duration-1000', barColor)} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-outline-variant">
            <span>{pct.toFixed(0)}% OF BUDGET</span>
            <span>₹{remaining.toLocaleString()} LEFT</span>
          </div>
        </div>

        <div className="bg-surface-container-high px-6 py-3 flex justify-between items-center">
          <span className="text-xs font-semibold text-outline">Spent Today</span>
          <span className="text-sm font-headline font-bold text-on-surface">₹{todaySpent.toLocaleString()}</span>
        </div>
      </div>

      {/* Monthly Sections (Income, EMIs, Investments) */}
      <div className="mx-4 mt-6 space-y-6">
        {/* Income */}
        <div>
          <button onClick={() => setIncomeCollapsed(!incomeCollapsed)} className="flex items-center justify-between w-full mb-3 px-1 hover:bg-surface-container-highest/20 rounded-lg transition-all py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Monthly Income</span>
              <Icon name={incomeCollapsed ? "expand_more" : "expand_less"} size={16} className="text-outline-variant" />
            </div>
            <span className="text-xs font-bold text-primary">
              {isPrivate ? '₹••••' : `₹${totalIncome.toLocaleString()}`}
            </span>
          </button>
          {!incomeCollapsed && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {incomeCats.map(cat => {
                const existing = income.find(i => i.category === cat);
                return (
                  <MonthlyItemInput key={`income-${cat}-${selectedMonth}`} type="income" category={cat} date={selectedMonth}
                    defaultValue={existing?.amount || 0} onSave={loadData} colorClass="text-primary" bgClass="bg-primary/5" borderClass="border-primary/20"
                    hideAmount={isPrivate} />
                );
              })}
            </div>
          )}
        </div>

        {/* EMIs */}
        <div>
          <button onClick={() => setEmiCollapsed(!emiCollapsed)} className="flex items-center justify-between w-full mb-3 px-1 hover:bg-surface-container-highest/20 rounded-lg transition-all py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Monthly EMIs</span>
              <Icon name={emiCollapsed ? "expand_more" : "expand_less"} size={16} className="text-outline-variant" />
            </div>
            <span className="text-xs font-bold text-error">₹{totalEmis.toLocaleString()}</span>
          </button>
          {!emiCollapsed && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {emiCats.map(cat => {
                const existing = emis.find(e => e.category === cat);
                return (
                  <MonthlyItemInput key={`emi-${cat}-${selectedMonth}`} type="emi" category={cat} date={selectedMonth}
                    defaultValue={existing?.amount || 0} onSave={loadData} colorClass="text-error" bgClass="bg-error/5" borderClass="border-error/20" />
                );
              })}
            </div>
          )}
        </div>

        {/* Investments */}
        <div>
          <button onClick={() => setInvestmentsCollapsed(!investmentsCollapsed)} className="flex items-center justify-between w-full mb-3 px-1 hover:bg-surface-container-highest/20 rounded-lg transition-all py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Monthly Investments</span>
              <Icon name={investmentsCollapsed ? "expand_more" : "expand_less"} size={16} className="text-outline-variant" />
            </div>
            <span className="text-xs font-bold text-secondary">₹{totalInvest.toLocaleString()}</span>
          </button>
          {!investmentsCollapsed && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {investCats.map(cat => {
                const existing = investments.find(inv => inv.category === cat);
                return (
                  <MonthlyItemInput key={`invest-${cat}-${selectedMonth}`} type="investment" category={cat} date={selectedMonth}
                    defaultValue={existing?.amount || 0} onSave={loadData} colorClass="text-secondary" bgClass="bg-secondary/5" borderClass="border-secondary/20" />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown — with budget bars */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Category Budgets</span>
        </div>
        {Object.keys(catTotals).length === 0 ? (
          <p className="text-xs text-outline mt-2 italic px-1">No transactions in {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(catTotals).map(([cat, spent]) => {
              const catBudget = categoryBudgets[cat] || 0;
              const catPct    = catBudget > 0 ? Math.min((spent / catBudget) * 100, 100) : 0;
              const catColor  = catPct > 90 ? 'bg-error' : catPct > 70 ? 'bg-tertiary' : 'bg-primary';
              const cfg       = categories.find(c => c.name === cat) || { icon: 'more_horiz', color: 'text-outline', bg: 'bg-surface-container' };
              return (
                <div key={cat} className="card-floating p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg)}>
                        <Icon name={cfg.icon} size={14} className={cfg.color} />
                      </div>
                      <span className="text-sm font-semibold text-on-surface">{cat}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-headline font-bold text-on-surface">₹{spent.toLocaleString()}</span>
                      {catBudget > 0 && (
                        <span className="text-xs text-outline ml-1">/ ₹{catBudget.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {catBudget > 0 && (
                    <div className="w-full h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', catColor)} style={{ width: `${catPct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent expenses */}
      <div className="flex-1 px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Quick Log</span>
        </div>
        
        <div className="relative mb-6">
          <input
            type="text"
            className="input-pill w-full pl-12 pr-4 py-4 text-sm bg-surface-container-low border-surface-container-highest focus:bg-surface-container overflow-hidden shadow-inner"
            placeholder="e.g. 250 for lunch or spent 1200 on fuel"
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={handleQuickAdd}
            disabled={isNlProcessing}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Icon 
              name={isNlProcessing ? "sync" : "auto_awesome"} 
              size={18} 
              className={cn("text-primary", isNlProcessing && "animate-spin")} 
            />
          </div>
          {nlInput && !isNlProcessing && (
            <button 
              onClick={() => handleQuickAdd({ key: 'Enter' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-all"
            >
              <Icon name="arrow_forward" size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Transactions</span>
          {!loading && <span className="text-xs text-outline">{expenses.length} items</span>}
        </div>

        {loading && <p className="text-center text-outline text-sm pt-8 animate-pulse">Loading...</p>}

        <div className="space-y-3">
          {expenses.map(e => (
            <ExpenseRow key={e.id} expense={e} categories={categories}
              onDelete={() => handleDelete(e)}
              onEdit={() => setEditExpense(e)}
            />
          ))}
        </div>

        {!loading && expenses.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="account_balance_wallet" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No transactions yet.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-[100px] right-6 w-14 h-14 rounded-full primary-gradient text-white shadow-gradient flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        aria-label="Add expense">
        <Icon name="add" size={28} filled className="text-white" />
      </button>

      {/* Sheets */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Add Expense">
        <ExpenseForm onSave={loadData} onClose={() => setShowForm(false)} categories={categories} />
      </BottomSheet>

      <BottomSheet isOpen={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        {editExpense && (
          <ExpenseForm
            categories={categories}
            initialData={{ description: editExpense.description, amount: editExpense.amount, category: editExpense.category, date: editExpense.date, emailBody: editExpense.emailBody }}
            editId={editExpense.id}
            onSave={loadData}
            onClose={() => setEditExpense(null)}
          />
        )}
      </BottomSheet>

      <SmartImportSheet isOpen={showImport} onClose={() => setShowImport(false)} onSave={loadData} />

      <FinanceSettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={loadData} />
    </div>
  );
}
