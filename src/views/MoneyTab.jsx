import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import SmartImportSheet from '../components/ui/SmartImportSheet';
import FinanceSettingsSheet from '../components/ui/FinanceSettingsSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, getMonthStr, seedTodayData } from '../db/database';
import { CATEGORY_CONFIG, EMPTY_FORM } from '../lib/constants';

function CategoryIcon({ category }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
  return (
    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon name={cfg.icon} size={22} className={cfg.color} />
    </div>
  );
}

function ExpenseRow({ expense, onDelete, onEdit }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-4 shadow-card">
      <CategoryIcon category={expense.category} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-on-surface truncate">{expense.description}</p>
        <p className="text-xs text-outline mt-0.5">{expense.category} &bull; {expense.timestamp}</p>
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

function ExpenseForm({ onSave, onClose, initialData, editId }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    if (editId) {
      await db.expenses.update(editId, {
        amount: Number(form.amount),
        category: form.category,
        description: form.description.trim(),
      });
    } else {
      const today = getTodayStr();
      const now   = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      await db.expenses.add({
        date: today,
        timestamp,
        amount: Number(form.amount),
        category: form.category,
        description: form.description.trim(),
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Description</label>
        <input className="input-pill w-full text-sm" placeholder="e.g. Coffee & Sandwich"
          value={form.description} onChange={e => set('description', e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Amount (₹)</label>
        <input type="number" min="1" step="1" className="input-pill w-full text-sm" placeholder="e.g. 450"
          value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Category</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.keys(CATEGORY_CONFIG).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button key={cat} type="button" onClick={() => set('category', cat)}
                className={cn('flex flex-col items-center gap-1 py-3 rounded-2xl text-[10px] font-semibold transition-all active:scale-95',
                  form.category === cat ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
                <Icon name={cfg.icon} size={18} />{cat}
              </button>
            );
          })}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full text-center">
        {editId ? 'Save Changes' : 'Add Expense'}
      </button>
    </form>
  );
}

function InvestmentInput({ category, date, onSave, defaultValue = 0 }) {
  const [val, setVal] = useState(defaultValue);
  const [editing, setEditing] = useState(false);

  const save = async () => {
    const existing = await db.investments.where({ date, category }).first();
    if (existing) {
      await db.investments.update(existing.id, { amount: Number(val) });
    } else {
      await db.investments.add({ date, category, amount: Number(val) });
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
      <div className="flex items-center gap-2 w-full p-2 rounded-2xl bg-primary/5 border border-primary/20">
        <input type="number" autoFocus className="bg-transparent w-full text-sm font-bold text-primary focus:outline-none px-2"
          value={val} onChange={e => setVal(e.target.value)}
          onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} />
        <button onClick={save} className="text-primary p-1"><Icon name="check" size={18} /></button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="flex items-center justify-between w-full p-3 rounded-2xl bg-secondary/10 border border-secondary/20 transition-all">
      <span className="text-xs font-bold text-secondary">{category}</span>
      <span className="text-sm font-headline font-bold text-secondary">₹{val.toLocaleString()}</span>
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
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const today = getTodayStr();

  const loadData = async () => {
    setLoading(true);
    const b  = await db.settings.get('monthlyBudget');
    const c  = await db.settings.get('investmentCategories');
    const cb = await db.settings.get('categoryBudgets');
    if (b)  setBudget(b.value);
    if (c)  setInvestCats(c.value);
    if (cb) setCategoryBudgets(cb.value);

    const monthExpenses = await db.expenses.filter(e => e.date.startsWith(selectedMonth)).toArray();
    monthExpenses.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
    setExpenses(monthExpenses);

    const currentInvests = await db.investments.where('date').equals(selectedDate).toArray();
    setInvestments(currentInvests);

    setLoading(false);
  };

  useEffect(() => {
    seedTodayData().then(loadData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedDate]);

  const handleDelete = async (expense) => {
    await db.expenses.delete(expense.id);
    loadData();
  };

  const todaySpent = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const monthSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining  = budget - monthSpent;
  const pct        = Math.min((monthSpent / budget) * 100, 100);
  const barColor   = pct > 90 ? 'bg-error' : pct > 70 ? 'bg-tertiary' : 'bg-primary';

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(daysInMonth - now.getDate() + 1, 1);
  const dailyAllowance = Math.max(remaining / daysRemaining, 0);

  const catTotals = useMemo(() => {
    return expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }, [expenses]);

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

      {/* Monthly overview card */}
      <div className="mx-4 mt-2 card-floating overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-outline uppercase tracking-wider mb-1">Month Spending</p>
              <p className="text-4xl font-headline font-extrabold text-primary leading-tight">
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

      {/* Investments Section */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Daily Investments</span>
          <input type="date"
            className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg focus:outline-none"
            value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {investCats.map(cat => {
            const existing = investments.find(inv => inv.category === cat);
            return (
              <InvestmentInput key={cat} category={cat} date={selectedDate}
                defaultValue={existing?.amount || 0} onSave={loadData} />
            );
          })}
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
              const cfg       = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;
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
          <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Transactions</span>
          {!loading && <span className="text-xs text-outline">{expenses.length} items</span>}
        </div>

        {loading && <p className="text-center text-outline text-sm pt-8 animate-pulse">Loading...</p>}

        <div className="space-y-3">
          {expenses.map(e => (
            <ExpenseRow key={e.id} expense={e}
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
        <ExpenseForm onSave={loadData} onClose={() => setShowForm(false)} />
      </BottomSheet>

      <BottomSheet isOpen={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        {editExpense && (
          <ExpenseForm
            initialData={{ description: editExpense.description, amount: editExpense.amount, category: editExpense.category }}
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
