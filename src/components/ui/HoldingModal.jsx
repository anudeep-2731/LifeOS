import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { getTodayStr } from '../../db/database';
import { addCloudHolding, updateCloudHolding } from '../../lib/supabase';

const SUBCATEGORIES_MAP = {
  'Liquid Funds': ['Cash in Hand', 'Savings Account', 'Digital Wallet', 'Emergency Fund'],
  'Investments': ['Fixed Deposit (FD)', 'Recurring Deposit (RD)', 'Mutual Funds', 'Direct Equity / Stocks', 'Sovereign Gold Bond', 'Bonds / Debt'],
  'Outside Money': ['Lent Fund (Receivable)', 'Personal Loan Given', 'Refund Receivable'],
  'Physical Assets': ['Gold Asset', 'Physical Gold', 'Real Estate / Property', 'Vehicle / Capital Asset'],
  'Perks & Rewards': ['Credit Card Reward Points', 'Corporate Voucher', 'Digital Wallet Cash', 'Shopping Gift Card']
};

export default function HoldingModal({ isOpen, onClose, initialData, defaultGroup = 'Liquid Funds', onSave }) {
  const [group, setGroup] = useState(defaultGroup);
  const [type, setType] = useState('');
  const [platform, setPlatform] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    if (initialData) {
      setGroup(initialData.group || 'Liquid Funds');
      setType(initialData.type || '');
      setPlatform(initialData.platform || '');
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : '');
      setDate(initialData.date || getTodayStr());
      setExpiry(initialData.expiry || '');
    } else {
      setGroup(defaultGroup);
      const options = SUBCATEGORIES_MAP[defaultGroup] || [];
      setType(options[0] || '');
      setPlatform('');
      setAmount('');
      setDate(getTodayStr());
      setExpiry('');
    }
  }, [initialData, defaultGroup, isOpen]);

  const handleGroupChange = (newGroup) => {
    setGroup(newGroup);
    const options = SUBCATEGORIES_MAP[newGroup] || [];
    setType(options[0] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type || !platform || !amount) return;

    const numericAmount = Number(amount);
    const holdingData = {
      group,
      type,
      platform: platform.trim(),
      amount: numericAmount,
      date,
      expiry
    };

    if (initialData?.id) {
      await updateCloudHolding(initialData.id, holdingData);
    } else {
      await addCloudHolding(holdingData);
    }

    if (onSave) onSave();
    onClose();
  };

  const subcategoryOptions = SUBCATEGORIES_MAP[group] || ['General Asset'];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Holding' : 'Add New Portfolio Holding'}>
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Asset Group</label>
          <select
            className="input-pill w-full text-sm font-medium"
            value={group}
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            {Object.keys(SUBCATEGORIES_MAP).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Subcategory</label>
            <select
              className="input-pill w-full text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {subcategoryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="any"
              className="input-pill w-full text-sm font-bold text-primary"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Platform / Entity</label>
          <input
            type="text"
            className="input-pill w-full text-sm"
            placeholder="e.g. HDFC Bank, Zerodha, Physical"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Date Added</label>
            <input
              type="date"
              className="input-pill w-full text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Expiry Date (Optional)</label>
            <input
              type="date"
              className="input-pill w-full text-sm"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3.5 mt-2 rounded-xl font-bold flex items-center justify-center gap-2">
          <span>{initialData ? 'Update Holding' : 'Save Holding'}</span>
        </button>
      </form>
    </BottomSheet>
  );
}
