import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { cn } from '../../lib/utils';
import { getTodayStr } from '../../db/database';
import { addCloudExpense, updateCloudExpense, adjustCloudHoldingBalance } from '../../lib/supabase';

export const DEFAULT_CATEGORY_METADATA = [
  { name: 'Food', emoji: '🍔', icon: 'lunch_dining', defaultBudget: 5000, color: 'text-secondary', bg: 'bg-secondary-container/40' },
  { name: 'Transport', emoji: '🚗', icon: 'directions_car', defaultBudget: 3000, color: 'text-primary', bg: 'bg-primary-fixed/40' },
  { name: 'Shopping', emoji: '🛍️', icon: 'shopping_bag', defaultBudget: 4000, color: 'text-tertiary', bg: 'bg-tertiary-fixed/40' },
  { name: 'Dining', emoji: '🍜', icon: 'ramen_dining', defaultBudget: 3000, color: 'text-secondary', bg: 'bg-secondary-container/40' },
  { name: 'Utilities', emoji: '⚡', icon: 'bolt', defaultBudget: 2500, color: 'text-tertiary', bg: 'bg-tertiary-fixed/50' },
  { name: 'Health', emoji: '💊', icon: 'health_and_safety', defaultBudget: 2000, color: 'text-secondary', bg: 'bg-secondary-fixed/40' },
  { name: 'Entertainment', emoji: '🎬', icon: 'movie', defaultBudget: 2500, color: 'text-error', bg: 'bg-error-container/50' },
  { name: 'Other', emoji: '📦', icon: 'more_horiz', defaultBudget: 2000, color: 'text-outline', bg: 'bg-surface-container-high' },
];

export const PAYMENT_SOURCES = [
  'HDFC Bank',
  'SBI Bank',
  'Credit Card',
  'Cash in Hand',
  'UPI / GPay',
  'Axis Bank',
  'Other'
];

export default function LogExpenseModal({
  isOpen,
  onClose,
  initialAmount = '',
  initialDescription = '',
  initialCategory = 'Food',
  initialDate,
  initialPaymentSource = 'HDFC Bank',
  editingExpenseId = null,
  onExpenseSaved
}) {
  const today = getTodayStr();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentSource, setPaymentSource] = useState('HDFC Bank');
  const [date, setDate] = useState(today);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount ? String(initialAmount) : '');
      setDescription(initialDescription || '');
      setCategory(initialCategory || 'Food');
      setPaymentSource(initialPaymentSource || 'HDFC Bank');
      setDate(initialDate || today);
    }
  }, [isOpen, initialAmount, initialDescription, initialCategory, initialDate, initialPaymentSource, today]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !description.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (editingExpenseId) {
        await updateCloudExpense(editingExpenseId, {
          amount: numAmount,
          description: description.trim(),
          category,
          paymentSource,
          date,
          notes: ''
        });
      } else {
        await addCloudExpense({
          amount: numAmount,
          description: description.trim(),
          category,
          paymentSource,
          date,
          timestamp,
          notes: ''
        });
        await adjustCloudHoldingBalance(paymentSource, -numAmount);
      }

      if (onExpenseSaved) await onExpenseSaved();
      onClose();
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-[32px] sm:rounded-[32px] p-5 pb-12 sm:pb-6 shadow-2xl border border-outline-variant/25 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Sheet Handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto sm:hidden -mt-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface">
              {editingExpenseId ? 'Edit Transaction' : 'Log Expense'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Amount Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Amount</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-lg font-bold text-primary font-mono">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full h-13 pl-9 pr-4 rounded-2xl bg-surface-container-low text-primary font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest border border-outline-variant/20 transition-all"
              />
            </div>
          </div>

          {/* Category Grid (4x2 boxes without scrollbar) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_CATEGORY_METADATA.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/15 hover:border-outline-variant/35 hover:bg-surface-container"
                    )}
                  >
                    <span className="text-xl mb-0.5">{cat.emoji}</span>
                    <span className="text-[11px] truncate max-w-full">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sourdough Bakery, Metro recharge"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest border border-outline-variant/20 transition-all"
            />
          </div>

          {/* Payment Source & Date Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Payment Via</label>
              <select
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value)}
                className="w-full h-11 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold focus:outline-none border border-outline-variant/20"
              >
                {PAYMENT_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-outline">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-mono focus:outline-none border border-outline-variant/20"
              />
            </div>
          </div>

          {/* Save Button - elevated with ample clearance */}
          <button
            type="submit"
            disabled={!amount || Number(amount) <= 0 || !description.trim() || isSaving}
            className="w-full h-12 mt-1 rounded-2xl bg-primary hover:bg-primary/90 text-white font-headline font-bold text-xs sm:text-sm flex items-center justify-center shadow-md active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
          >
            {isSaving ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
