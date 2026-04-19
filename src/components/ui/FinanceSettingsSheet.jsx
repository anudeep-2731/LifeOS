import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { db } from '../../db/database';
import { CATEGORY_CONFIG } from '../../lib/constants';

export default function FinanceSettingsSheet({ isOpen, onClose, onSave }) {
  const [budget, setBudget] = useState(30000);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [investCategories, setInvestCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [emiCategories, setEmiCategories] = useState([]);
  
  const [newExp, setNewExp] = useState('');
  const [newInv, setNewInv] = useState('');
  const [newInc, setNewInc] = useState('');
  const [newEmi, setNewEmi] = useState('');
  
  const [categoryBudgets, setCategoryBudgets] = useState({});

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  const loadSettings = async () => {
    const [b, ec, ic, inc, em, cb] = await Promise.all([
      db.settings.get('monthlyBudget'),
      db.settings.get('expenseCategories'),
      db.settings.get('investmentCategories'),
      db.settings.get('incomeCategories'),
      db.settings.get('emiCategories'),
      db.settings.get('categoryBudgets'),
    ]);

    if (b) setBudget(b.value);
    if (ec) setExpenseCategories(ec.value || []);
    if (ic) setInvestCategories(ic.value || []);
    if (inc) setIncomeCategories(inc.value || []);
    if (em) setEmiCategories(em.value || []);
    if (cb) setCategoryBudgets(cb.value || {});
  };

  const handleSave = async () => {
    await Promise.all([
      db.settings.put({ key: 'monthlyBudget', value: Number(budget) }),
      db.settings.put({ key: 'expenseCategories', value: expenseCategories }),
      db.settings.put({ key: 'investmentCategories', value: investCategories }),
      db.settings.put({ key: 'incomeCategories', value: incomeCategories }),
      db.settings.put({ key: 'emiCategories', value: emiCategories }),
      db.settings.put({ key: 'categoryBudgets', value: categoryBudgets }),
    ]);
    window.dispatchEvent(new CustomEvent('life-os:settings-saved'));
    onSave();
    onClose();
  };

  const addExp = () => {
    if (newExp.trim() && !expenseCategories.some(c => c.name === newExp.trim())) {
      setExpenseCategories([...expenseCategories, { 
        name: newExp.trim(), 
        icon: 'payments', 
        color: 'text-primary', 
        bg: 'bg-primary/10' 
      }]);
      setNewExp('');
    }
  };

  const addCategory = (list, setList, val, setVal) => {
    if (val.trim() && !list.includes(val.trim())) {
      setList([...list, val.trim()]);
      setVal('');
    }
  };

  const removeExp = (name) => setExpenseCategories(expenseCategories.filter(c => c.name !== name));
  const removeSimple = (list, setList, val) => setList(list.filter(l => l !== val));
  
  const setCatBudget = (cat, val) => setCategoryBudgets(prev => ({ ...prev, [cat]: Number(val) }));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Finance Settings">
      <div className="space-y-8 pb-8">

        {/* Monthly Budget */}
        <section>
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2 ml-1">
            Monthly Expenses Budget (₹)
          </label>
          <input type="number" className="input-pill w-full text-lg font-headline font-bold text-primary"
            value={budget} onChange={e => setBudget(e.target.value)} />
        </section>

        {/* Expense Categories & Budgets */}
        <section>
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-3 ml-1">
            Expense Categories & Budgets
          </label>
          <div className="space-y-3 mb-4">
            {expenseCategories.map(cat => (
              <div key={cat.name} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                  <Icon name={cat.icon} size={15} className={cat.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{cat.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-outline">₹</span>
                    <input type="number" step="500" className="w-16 text-sm font-bold text-right bg-transparent focus:outline-none"
                      value={categoryBudgets[cat.name] || 0} onChange={e => setCatBudget(cat.name, e.target.value)} />
                  </div>
                  <button onClick={() => removeExp(cat.name)} className="text-outline-variant hover:text-error transition-colors">
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4 shadow-inner" placeholder="Add expense category..."
              value={newExp} onChange={e => setNewExp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExp()} />
            <button onClick={addExp} className="bg-primary text-white p-2.5 rounded-full shadow-gradient"><Icon name="add" size={20} /></button>
          </div>
        </section>

        {/* Income Categories */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block ml-1">
            Income Sources
          </label>
          <div className="flex flex-wrap gap-2">
            {incomeCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/20">
                {cat}
                <button onClick={() => removeSimple(incomeCategories, setIncomeCategories, cat)}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4 shadow-inner" placeholder="Add income source..."
              value={newInc} onChange={e => setNewInc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(incomeCategories, setIncomeCategories, newInc, setNewInc)} />
            <button onClick={() => addCategory(incomeCategories, setIncomeCategories, newInc, setNewInc)} className="bg-primary text-white p-2.5 rounded-full shadow-gradient"><Icon name="add" size={20} /></button>
          </div>
        </section>

        {/* EMI Categories */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block ml-1">
            Monthly EMIs
          </label>
          <div className="flex flex-wrap gap-2">
            {emiCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-error/10 text-error text-[11px] font-bold px-3 py-1.5 rounded-full border border-error/20">
                {cat}
                <button onClick={() => removeSimple(emiCategories, setEmiCategories, cat)}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4 shadow-inner" placeholder="Add EMI..."
              value={newEmi} onChange={e => setNewEmi(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(emiCategories, setEmiCategories, newEmi, setNewEmi)} />
            <button onClick={() => addCategory(emiCategories, setEmiCategories, newEmi, setNewEmi)} className="bg-error text-white p-2.5 rounded-full shadow-gradient"><Icon name="add" size={20} /></button>
          </div>
        </section>

        {/* Investment Categories */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-outline uppercase tracking-wider block ml-1">
            Investment Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {investCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-secondary/10 text-secondary text-[11px] font-bold px-3 py-1.5 rounded-full border border-secondary/20">
                {cat}
                <button onClick={() => removeSimple(investCategories, setInvestCategories, cat)}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-2 px-4 shadow-inner" placeholder="Add investment category..."
              value={newInv} onChange={e => setNewInv(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(investCategories, setInvestCategories, newInv, setNewInv)} />
            <button onClick={() => addCategory(investCategories, setInvestCategories, newInv, setNewInv)} className="bg-secondary text-white p-2.5 rounded-full shadow-gradient"><Icon name="add" size={20} /></button>
          </div>
        </section>

        <button onClick={handleSave} className="btn-primary w-full py-4 font-bold shadow-gradient mt-4">
          Save Settings
        </button>
      </div>
    </BottomSheet>
  );
}
