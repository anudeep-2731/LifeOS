import { useState, useEffect } from 'react';
import Icon from './Icon';
import { addCloudExpense, fetchTodayWater, addWaterIntake } from '../../lib/supabase';
import { getTodayStr } from '../../db/database';

export default function QuickLoggerBar({ onExpenseLogged }) {
  const [waterMl, setWaterMl] = useState(0);
  const [expenseText, setExpenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = getTodayStr();
  const WATER_GOAL = 2500; // 2.5 Liters

  useEffect(() => {
    const loadWater = async () => {
      const val = await fetchTodayWater(today);
      setWaterMl(val);
    };
    loadWater();
  }, [today]);

  const handleAddWater = async () => {
    const newTotal = await addWaterIntake(250, today);
    setWaterMl(newTotal);
  };

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

  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL) * 100));

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/30 shadow-card space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          Quick Action Logger
        </h3>
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          1-Tap Sync
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Hydration Tracker */}
        <div className="bg-sky-500/10 rounded-2xl p-3.5 border border-sky-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              <Icon name="water_drop" size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-on-surface">Daily Hydration</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-20 bg-sky-200/50 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-sky-500 h-full transition-all duration-300" style={{ width: `${waterPct}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-outline">
                  {(waterMl / 1000).toFixed(1)}L / 2.5L
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAddWater}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm flex-shrink-0"
          >
            <Icon name="add" size={14} />
            <span>+250ml</span>
          </button>
        </div>

        {/* Quick Expense Logger */}
        <form onSubmit={handleQuickExpenseSubmit} className="bg-surface-container/60 rounded-2xl p-2.5 border border-outline-variant/20 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="payments" size={18} />
          </div>
          <input
            type="text"
            className="bg-transparent text-xs font-semibold text-on-surface placeholder-outline focus:outline-none flex-1 min-w-0 px-1"
            placeholder="Quick log: e.g. 150 Coffee"
            value={expenseText}
            onChange={(e) => setExpenseText(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !expenseText.trim()}
            className="px-3 py-1.5 rounded-xl primary-gradient text-white font-bold text-xs disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0"
          >
            {isSubmitting ? '...' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  );
}
