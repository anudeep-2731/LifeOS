import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import FinanceSettingsSheet from '../components/ui/FinanceSettingsSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, getMonthStr, seedTodayData, rolloverFinancials } from '../db/database';
import { 
  fetchCloudExpenses, 
  addCloudExpense, 
  updateCloudExpense, 
  deleteCloudExpense, 
  adjustCloudHoldingBalance 
} from '../lib/supabase';
import { DEFAULT_CATEGORY, EMPTY_FORM } from '../lib/constants';
import { downloadCSV } from '../lib/ExportUtils';

function CategoryIcon({ category, config }) {
  const cfg = config?.find(c => c.name === category) || { icon: 'more_horiz', color: 'text-outline', bg: 'bg-surface-container' };
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon name={cfg.icon} size={20} className={cfg.color} />
    </div>
  );
}

function ExpenseRow({ expense, onDelete, onEdit, categories }) {
  const today = getTodayStr();
  const dateDisplay = expense.date === today ? 'Today' : expense.date;
  const source = expense.paymentSource || 'HDFC Bank';

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/20 shadow-sm hover:border-outline-variant/50 transition-all">
      <CategoryIcon category={expense.category} config={categories} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-on-surface truncate">{expense.description}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-outline flex-shrink-0">
            {source}
          </span>
        </div>
        <p className="text-xs text-outline mt-0.5">{expense.category} &bull; {dateDisplay} {expense.timestamp}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-headline font-bold text-tertiary text-sm">
          −₹{expense.amount.toLocaleString()}
        </span>
        <button onClick={onEdit} className="text-outline hover:text-primary transition-colors p-1" aria-label="Edit expense">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={onDelete} className="text-outline hover:text-error transition-colors p-1" aria-label="Delete expense">
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({ onSave, onClose, initialData, editId, categories = [] }) {
  const [form, setForm] = useState(
    initialData || { ...EMPTY_FORM, date: getTodayStr(), paymentSource: 'HDFC Bank', notes: '' }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const PAYMENT_SOURCES = [
    'HDFC Bank',
    'SBI Bank',
    'Cash in Hand',
    'Credit Card',
    'Axis Bank',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;

    const amount = Number(form.amount);
    const date = form.date || getTodayStr();

    if (editId) {
      await updateCloudExpense(editId, {
        amount,
        category: form.category,
        description: form.description.trim(),
        date,
        paymentSource: form.paymentSource || 'HDFC Bank',
        notes: form.notes || '',
      });
      await adjustCloudHoldingBalance(form.paymentSource, -amount);
    } else {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      
      await addCloudExpense({
        date,
        timestamp,
        amount,
        category: form.category,
        description: form.description.trim(),
        paymentSource: form.paymentSource || 'HDFC Bank',
        notes: form.notes || '',
      });

      await adjustCloudHoldingBalance(form.paymentSource, -amount);
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Payment Source Account</label>
          <select
            className="input-pill w-full text-sm font-medium text-on-surface bg-surface-container"
            value={form.paymentSource}
            onChange={e => set('paymentSource', e.target.value)}
          >
            {PAYMENT_SOURCES.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Category</label>
          <select
            className="input-pill w-full text-sm font-medium text-on-surface bg-surface-container"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Category Quick Picker</label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => (
            <button key={cat.name} type="button" onClick={() => set('category', cat.name)}
              className={cn('flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[10px] font-semibold transition-all active:scale-95',
                form.category === cat.name ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
              <Icon name={cat.icon} size={18} />{cat.name}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-3.5 mt-2 rounded-xl font-bold">
        {editId ? 'Save Changes' : 'Add Expense'}
      </button>
    </form>
  );
}

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [budget, setBudget] = useState(30000);
  const [selectedMonth, setSelectedMonth] = useState(getMonthStr());
  const [nlInput, setNlInput] = useState('');
  const [isNlProcessing, setIsNlProcessing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [income, setIncome] = useState([]);
  const [emis, setEmis] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);

  const today = getTodayStr();

  const loadData = async () => {
    setLoading(true);
    await seedTodayData();
    await rolloverFinancials(selectedMonth);

    const [b, ec] = await Promise.all([
      db.settings.get('monthlyBudget'),
      db.settings.get('expenseCategories'),
    ]);

    if (b) setBudget(b.value);
    if (ec) setCategories(ec.value);

    const monthExpenses = await fetchCloudExpenses(selectedMonth);
    setExpenses(monthExpenses);

    const [currentIncome, currentEmis] = await Promise.all([
      db.income.where('month').equals(selectedMonth).toArray(),
      db.emis.where('month').equals(selectedMonth).toArray(),
    ]);
    setIncome(currentIncome);
    setEmis(currentEmis);

    setLoading(false);
  };

  const handleQuickAdd = async (e) => {
    if (e.key !== 'Enter' || !nlInput.trim()) return;
    setIsNlProcessing(true);
    try {
      let amount = null;
      const amtMatch = nlInput.match(/(\d+(?:\.\d+)?)/);
      if (amtMatch) amount = Number(amtMatch[1]);
      const description = nlInput.replace(/(\d+(?:\.\d+)?)/, '').replace(/\b(for|on|at|spent|paid)\b/gi, '').trim();

      if (amount && description) {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        await addCloudExpense({
          date: today,
          timestamp,
          amount,
          description,
          category: DEFAULT_CATEGORY,
          paymentSource: 'HDFC Bank'
        });
        setNlInput('');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNlProcessing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleDelete = async (expense) => {
    if (expense.paymentSource) {
      await adjustCloudHoldingBalance(expense.paymentSource, expense.amount);
    }
    await deleteCloudExpense(expense.id);
    await loadData();
  };

  const monthSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - monthSpent;
  const pct = Math.min((monthSpent / budget) * 100, 100);
  const barColor = pct > 90 ? 'bg-error' : pct > 70 ? 'bg-tertiary' : 'bg-primary';

  // Category-wise spend computation
  const categoryTotals = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: monthSpent > 0 ? (amount / monthSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, monthSpent]);
  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header Bar */}
      <div className="pt-4 px-4 sm:px-6 pb-3 bg-surface-container-low border-b border-outline-variant/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center justify-between w-full sm:w-auto gap-1">
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-all"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="text-base font-headline font-bold text-on-surface min-w-[130px] text-center">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const d = new Date(y, m, 1);
                const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (next <= getMonthStr()) setSelectedMonth(next);
              }}
              disabled={selectedMonth >= getMonthStr()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-all disabled:opacity-30"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-surface-container text-outline hover:text-on-surface">
              <Icon name="tune" size={16} />
            </button>
            <button onClick={() => setShowImport(true)} className="flex items-center gap-1 bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold rounded-full px-3 py-1.5">
              <Icon name="auto_awesome" size={14} /> Import
            </button>
          </div>
        </div>
      </div>

      {/* Main Expenses Content */}
      <div className="px-4 sm:px-6 pt-4 space-y-5">
        {/* Quick Natural Language Logger */}
        <div className="bg-surface-container-lowest rounded-2xl p-2.5 border border-outline-variant/30 flex items-center gap-2 shadow-sm">
          <Icon name="bolt" size={18} className="text-primary ml-1 flex-shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Quick add expense (e.g. 450 Coffee & Snacks)..."
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={handleQuickAdd}
            disabled={isNlProcessing}
          />
          {isNlProcessing && <Icon name="sync" size={16} className="animate-spin text-primary mr-1" />}
        </div>

        {/* Budget Progress Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-outline uppercase font-semibold mb-1">Month Expenses Spent</p>
              <p className="text-3xl font-headline font-extrabold text-on-surface">₹{monthSpent.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-outline uppercase font-semibold mb-1">Budget Target</p>
              <p className="text-base font-headline font-bold text-secondary">₹{budget.toLocaleString()}</p>
            </div>
          </div>

          <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden mb-2 mt-3">
            <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-outline">
            <span>{pct.toFixed(0)}% OF BUDGET SPENT</span>
            <span>₹{remaining.toLocaleString()} REMAINING</span>
          </div>
        </div>

        {/* Category-Wise Spend Breakdown Card */}
        {categoryTotals.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-sm text-on-surface">Category Spend Distribution</h3>
              <span className="text-xs text-outline font-medium">{categoryTotals.length} Active Categories</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {categoryTotals.map(cat => {
                const cfg = categories.find(c => c.name === cat.name) || { icon: 'more_horiz', color: 'text-primary' };
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-on-surface flex items-center gap-1.5">
                        <Icon name={cfg.icon} size={14} className={cfg.color} /> {cat.name}
                      </span>
                      <span className="font-bold text-on-surface">
                        ₹{cat.amount.toLocaleString()} <span className="text-[10px] text-outline font-normal">({cat.pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expenses Transactions Ledger List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline font-bold text-sm text-on-surface">Transactions Ledger</h3>
            <span className="text-xs text-outline">{expenses.length} Entries</span>
          </div>

          {loading ? (
            <p className="text-center text-outline text-xs py-8 animate-pulse">Loading ledger...</p>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-outline">
              <Icon name="account_balance_wallet" size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No transactions logged for this month yet.</p>
            </div>
          ) : (
            expenses.map(e => (
              <ExpenseRow key={e.id} expense={e} categories={categories} onDelete={() => handleDelete(e)} onEdit={() => setEditExpense(e)} />
            ))
          )}
        </div>
      </div>

      {/* FAB Add Expense Button */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-[95px] right-6 w-14 h-14 rounded-full primary-gradient text-white shadow-gradient flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
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
            initialData={{ description: editExpense.description, amount: editExpense.amount, category: editExpense.category, date: editExpense.date }}
            editId={editExpense.id}
            onSave={loadData}
            onClose={() => setEditExpense(null)}
          />
        )}
      </BottomSheet>

      <FinanceSettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={loadData} />
    </div>
  );
}
