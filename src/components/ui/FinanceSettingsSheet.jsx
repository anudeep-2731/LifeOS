import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { db } from '../../db/database';

export default function FinanceSettingsSheet({ isOpen, onClose, onSave }) {
  const [budget, setBudget] = useState(30000);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const b = await db.settings.get('monthlyBudget');
    const c = await db.settings.get('investmentCategories');
    if (b) setBudget(b.value);
    if (c) setCategories(c.value);
  };

  const handleSave = async () => {
    await db.settings.put({ key: 'monthlyBudget', value: Number(budget) });
    await db.settings.put({ key: 'investmentCategories', value: categories });
    onSave();
    onClose();
  };

  const addCategory = () => {
    if (newCat.trim() && !categories.includes(newCat.trim())) {
      setCategories([...categories, newCat.trim()]);
      setNewCat('');
    }
  };

  const removeCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Finance Settings">
      <div className="space-y-6">
        {/* Monthly Budget */}
        <div>
          <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Monthly Expenses Budget (₹)
          </label>
          <input
            type="number"
            className="input-pill w-full text-lg font-headline font-bold text-primary"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>

        {/* Investment Categories */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-outline uppercase tracking-wider block ml-1">
            Investment Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div 
                key={cat} 
                className="flex items-center gap-2 bg-secondary/10 text-secondary text-xs font-semibold px-3 py-1.5 rounded-full border border-secondary/20"
              >
                {cat}
                <button onClick={() => removeCategory(cat)} className="text-secondary/60 hover:text-secondary">
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="input-pill flex-1 text-sm py-2 px-4"
              placeholder="Add new category..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button 
              onClick={addCategory}
              className="bg-primary text-white p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all"
            >
              <Icon name="add" size={20} />
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="btn-primary w-full mt-4"
        >
          Save Settings
        </button>
      </div>
    </BottomSheet>
  );
}
