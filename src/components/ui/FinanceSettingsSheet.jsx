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
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gmailClientId, setGmailClientId] = useState('');

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  const loadSettings = async () => {
    const [b, c, cb, cg, ai, g] = await Promise.all([
      db.settings.get('monthlyBudget'),
      db.settings.get('investmentCategories'),
      db.settings.get('categoryBudgets'),
      db.settings.get('calorieGoal'),
      db.settings.get('geminiApiKey'),
      db.settings.get('gmailClientId')
    ]);

    if (b) setBudget(b.value);
    if (c) setCategories(c.value);
    if (cb) setCategoryBudgets(cb.value || {});
    if (cg) setCalorieGoal(cg.value);
    if (ai) setGeminiApiKey(ai.value);
    if (g) setGmailClientId(g.value);
  };

  const handleSave = async () => {
    await Promise.all([
      db.settings.put({ key: 'monthlyBudget', value: Number(budget) }),
      db.settings.put({ key: 'investmentCategories', value: categories }),
      db.settings.put({ key: 'categoryBudgets', value: categoryBudgets }),
      db.settings.put({ key: 'calorieGoal', value: Number(calorieGoal) }),
      db.settings.put({ key: 'geminiApiKey', value: geminiApiKey }),
      db.settings.put({ key: 'gmailClientId', value: gmailClientId })
    ]);
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

        {/* AI & API Section */}
        <section className="bg-primary/5 rounded-3xl p-5 border border-primary/10">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Icon name="auto_awesome" size={14} /> AI & Integrations
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-outline uppercase block mb-1.5 ml-1">Gemini API Key</label>
              <input type="password" placeholder="Enter API Key" className="input-pill w-full text-xs"
                value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-outline uppercase block mb-1.5 ml-1">Gmail Client ID</label>
              <input type="text" placeholder="Enter Client ID" className="input-pill w-full text-xs text-on-surface"
                value={gmailClientId} onChange={e => setGmailClientId(e.target.value)} />
            </div>
          </div>
          <p className="text-[9px] text-outline mt-3 ml-1 italic leading-relaxed">
            Keys are stored locally in your browser and never sent to our servers.
          </p>
        </section>

        {/* Monthly Budget */}
        <div>
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Monthly Expenses Budget (₹)
          </label>
          <input type="number" className="input-pill w-full text-lg font-headline font-bold text-primary"
            value={budget} onChange={e => setBudget(e.target.value)} />
        </div>

        {/* Per-category budgets */}
        <div>
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-3 ml-1">
            Category Budgets (₹/month)
          </label>
          <div className="space-y-2">
            {Object.keys(CATEGORY_CONFIG).map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <div key={cat} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon name={cfg.icon} size={15} className={cfg.color} />
                  </div>
                  <span className="text-sm font-semibold text-on-surface flex-1">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-outline">₹</span>
                    <input type="number" step="500" className="w-16 text-sm font-bold text-right bg-transparent focus:outline-none"
                      value={categoryBudgets[cat] || 0} onChange={e => setCatBudget(cat, e.target.value)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calorie Goal */}
        <div>
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Daily Calorie Goal (kcal)
          </label>
          <input type="number" step="50" className="input-pill w-full text-lg font-headline font-bold text-tertiary"
            value={calorieGoal} onChange={e => setCalorieGoal(e.target.value)} />
        </div>

        {/* Investment Categories */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block ml-1">
            Investment Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-secondary/10 text-secondary text-[11px] font-bold px-3 py-1.5 rounded-full border border-secondary/20">
                {cat}
                <button onClick={() => removeCategory(cat)}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4 shadow-inner" placeholder="Add category..."
              value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button onClick={addCategory} className="bg-primary text-white p-2.5 rounded-full shadow-gradient"><Icon name="add" size={20} /></button>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full py-4 font-bold shadow-gradient mt-4">
          Save Settings
        </button>
      </div>
    </BottomSheet>
  );
}
