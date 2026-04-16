import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { db } from '../../db/database';
import { CATEGORY_CONFIG } from '../../lib/constants';

export default function FinanceSettingsSheet({ isOpen, onClose, onSave }) {
  const [budget, setBudget] = useState(30000);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [calorieGoal, setCalorieGoal] = useState(2200);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  const loadSettings = async () => {
    const b  = await db.settings.get('monthlyBudget');
    const c  = await db.settings.get('investmentCategories');
    const cb = await db.settings.get('categoryBudgets');
    const cg = await db.settings.get('calorieGoal');
    if (b)  setBudget(b.value);
    if (c)  setCategories(c.value);
    if (cb) setCategoryBudgets(cb.value || {});
    if (cg) setCalorieGoal(cg.value);
  };

  const handleSave = async () => {
    await db.settings.put({ key: 'monthlyBudget', value: Number(budget) });
    await db.settings.put({ key: 'investmentCategories', value: categories });
    await db.settings.put({ key: 'categoryBudgets', value: categoryBudgets });
    await db.settings.put({ key: 'calorieGoal', value: Number(calorieGoal) });
    onSave();
    onClose();
  };

  const addCategory = () => {
    if (newCat.trim() && !categories.includes(newCat.trim())) {
      setCategories([...categories, newCat.trim()]);
      setNewCat('');
    }
  };

  const removeCategory = (cat) => setCategories(categories.filter(c => c !== cat));

  const setCatBudget = (cat, val) => setCategoryBudgets(prev => ({ ...prev, [cat]: Number(val) }));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Finance Settings">
      <div className="space-y-6">

        {/* Monthly Budget */}
        <div>
          <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Monthly Expenses Budget (₹)
          </label>
          <input type="number" className="input-pill w-full text-lg font-headline font-bold text-primary"
            value={budget} onChange={e => setBudget(e.target.value)} />
        </div>

        {/* Per-category budgets */}
        <div>
          <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-3 ml-1">
            Category Budgets (₹/month)
          </label>
          <div className="space-y-2">
            {Object.keys(CATEGORY_CONFIG).map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <div key={cat} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon name={cfg.icon} size={15} className={cfg.color} />
                  </div>
                  <span className="text-sm font-semibold text-on-surface flex-1">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-outline">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      className="w-20 text-sm font-bold text-right bg-surface-container-high rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={categoryBudgets[cat] || 0}
                      onChange={e => setCatBudget(cat, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-outline mt-2 ml-1">
            Total: ₹{Object.values(categoryBudgets).reduce((s, v) => s + (Number(v) || 0), 0).toLocaleString()}
          </p>
        </div>

        {/* Calorie Goal */}
        <div>
          <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Daily Calorie Goal (kcal)
          </label>
          <input type="number" min="1000" max="5000" step="50"
            className="input-pill w-full text-lg font-headline font-bold text-tertiary"
            value={calorieGoal} onChange={e => setCalorieGoal(e.target.value)} />
        </div>

        {/* Investment Categories */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-outline uppercase tracking-wider block ml-1">
            Investment Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat}
                className="flex items-center gap-2 bg-secondary/10 text-secondary text-xs font-semibold px-3 py-1.5 rounded-full border border-secondary/20">
                {cat}
                <button onClick={() => removeCategory(cat)} className="text-secondary/60 hover:text-secondary">
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4" placeholder="Add new category..."
              value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button onClick={addCategory} className="bg-primary text-white p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all">
              <Icon name="add" size={20} />
            </button>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          Save Settings
        </button>
      </div>
    </BottomSheet>
  );
}
