import { useState } from 'react';
import Icon from './Icon';
import { addCloudExpense } from '../../lib/supabase';
import { getTodayStr } from '../../db/database';

export default function QuickLoggerBar({ onExpenseLogged }) {
  const [expenseText, setExpenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = getTodayStr();

  const handleQuickExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseText.trim()) return;

    setIsSubmitting(true);
    try {
      let amount = null;
      const amtMatch = expenseText.match(/(\d+(?:\.\d+)?)/);
      if (amtMatch) amount = Number(amtMatch[1]);
      
      const description = expenseText
        .replace(/(\d+(?:\.\d+)?)/, '')
        .replace(/\b(for|on|at|spent|paid)\b/gi, '')
        .trim() || 'Quick Expense';

      if (amount) {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        await addCloudExpense({
          date: today,
          timestamp,
          amount,
          description,
          category: 'Other',
          paymentSource: 'HDFC Bank',
        });

        setExpenseText('');
        if (onExpenseLogged) onExpenseLogged();
      }
    } catch (err) {
      console.error('Quick expense failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/30 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-outline flex items-center gap-1.5">
          <Icon name="bolt" size={16} className="text-primary" /> Quick Expense Logger
        </h3>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Instant Sync
        </span>
      </div>

      <form onSubmit={handleQuickExpenseSubmit} className="bg-surface-container/60 rounded-2xl p-2.5 border border-outline-variant/20 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Icon name="payments" size={18} />
        </div>
        <input
          type="text"
          className="bg-transparent text-xs font-semibold text-on-surface placeholder-outline focus:outline-none flex-1 min-w-0 px-1"
          placeholder="Quick log expense: e.g. 150 Coffee & Sandwich"
          value={expenseText}
          onChange={(e) => setExpenseText(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !expenseText.trim()}
          className="px-4 py-2 rounded-xl primary-gradient text-white font-bold text-xs disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >
          {isSubmitting ? '...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
