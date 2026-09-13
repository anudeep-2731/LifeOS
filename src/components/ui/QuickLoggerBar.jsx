import { useState } from 'react';
import Icon from './Icon';
import LogExpenseModal from '../finance/LogExpenseModal';
import { getTodayStr } from '../../db/database';

function inferCategoryFromText(text = '') {
  const lower = text.toLowerCase();
  if (/coffee|tea|sandwich|lunch|dinner|breakfast|snack|bakery|food|burger|pizza|ramen|swiggy|zomato/i.test(lower)) {
    return 'Dining';
  }
  if (/uber|ola|metro|fuel|petrol|diesel|cab|auto|bus|train|flight|parking/i.test(lower)) {
    return 'Transport';
  }
  if (/shopping|cloth|shirt|pants|shoes|amazon|flipkart|myntra|zara/i.test(lower)) {
    return 'Shopping';
  }
  if (/electricity|wifi|recharge|bill|water|gas|rent|maid/i.test(lower)) {
    return 'Utilities';
  }
  if (/medicine|doctor|pharmacy|clinic|gym|supplement|health/i.test(lower)) {
    return 'Health';
  }
  if (/movie|cinema|netflix|spotify|game|concert|ticket/i.test(lower)) {
    return 'Entertainment';
  }
  return 'Food';
}

export default function QuickLoggerBar({ onExpenseLogged }) {
  const [expenseText, setExpenseText] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [modalAmount, setModalAmount] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalCategory, setModalCategory] = useState('Food');
  const today = getTodayStr();

  const handleQuickExpenseSubmit = (e) => {
    if (e) e.preventDefault();
    if (!expenseText.trim()) return;

    let amount = '';
    const amtMatch = expenseText.match(/(\d+(?:\.\d+)?)/);
    if (amtMatch) amount = amtMatch[1];

    const description = expenseText
      .replace(/(\d+(?:\.\d+)?)/, '')
      .replace(/\b(for|on|at|spent|paid|rs|inr|₹)\b/gi, '')
      .trim() || 'Expense';

    const inferredCategory = inferCategoryFromText(expenseText);

    setModalAmount(amount);
    setModalDescription(description);
    setModalCategory(inferredCategory);
    setShowLogModal(true);
  };

  const handleExpenseSaved = () => {
    setExpenseText('');
    if (onExpenseLogged) onExpenseLogged();
  };

  return (
    <>
      <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/30 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-outline flex items-center gap-1.5">
            <Icon name="bolt" size={16} className="text-primary" /> Quick Expense Logger
          </h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Review &amp; Confirm
          </span>
        </div>

        <form onSubmit={handleQuickExpenseSubmit} className="bg-surface-container/60 rounded-2xl p-2.5 border border-outline-variant/20 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="payments" size={18} />
          </div>
          <input
            type="text"
            className="bg-transparent text-xs font-semibold text-on-surface placeholder-outline focus:outline-none flex-1 min-w-0 px-1"
            placeholder="e.g. 150 Coffee & Sandwich"
            value={expenseText}
            onChange={(e) => setExpenseText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!expenseText.trim()}
            className="px-4 py-2 rounded-xl primary-gradient text-white font-bold text-xs disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0 cursor-pointer"
          >
            Add Expense
          </button>
        </form>
      </div>

      {/* Pre-filled Confirmation Modal */}
      <LogExpenseModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        initialAmount={modalAmount}
        initialDescription={modalDescription}
        initialCategory={modalCategory}
        initialDate={today}
        onExpenseSaved={handleExpenseSaved}
      />
    </>
  );
}
