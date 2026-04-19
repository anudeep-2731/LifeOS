import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import {
  db, getTodayStr, seedTodayData,
  getWeekStart, getWeekDates
} from '../db/database';
import { askGemini } from '../lib/ai';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = [
  { bg: 'bg-primary/10',             text: 'text-primary',   fill: 'bg-primary'   },
  { bg: 'bg-secondary/10',           text: 'text-secondary', fill: 'bg-secondary' },
  { bg: 'bg-tertiary/10',            text: 'text-tertiary',  fill: 'bg-tertiary'  },
  { bg: 'bg-tertiary-fixed/40',      text: 'text-tertiary',  fill: 'bg-tertiary-fixed-dim' },
  { bg: 'bg-secondary-container/40', text: 'text-secondary', fill: 'bg-secondary' },
];
const color = (key) => COLORS[(key || 0) % COLORS.length];

const FREQ_LABELS = { daily: 'Daily', '5x': '5×/wk', '4x': '4×/wk', '3x': '3×/wk', '2x': '2×/wk', '1x': '1×/wk' };
const FREQ_OPTIONS = ['daily', '5x', '4x', '3x', '2x', '1x'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_CONFIG = {
  Breakfast: { icon: 'breakfast_dining', color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: '8:00 AM',  emoji: '🌅' },
  Lunch:     { icon: 'lunch_dining',     color: 'text-primary',   bg: 'bg-primary/10',   time: '1:00 PM',  emoji: '☀️' },
  Dinner:    { icon: 'dinner_dining',    color: 'text-secondary', bg: 'bg-secondary/10', time: '7:00 PM',  emoji: '🌙' },
  Snack:     { icon: 'cookie',           color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: 'Anytime',  emoji: '🍎' },
};

const MEAL_ORDER = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

// ─── Essentials Ring ──────────────────────────────────────────────────────────

function EssentialsRing({ done, total }) {
  const pct = total > 0 ? Math.min(done / total, 1) : 0;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={pct >= 1 ? '#22c55e' : 'url(#essentialsGrad)'} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
          <defs>
            <linearGradient id="essentialsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {pct >= 1 && total > 0 ? (
            <Icon name="check_circle" size={30} filled className="text-green-500" />
          ) : (
            <>
              <span className="text-xl font-black text-on-surface leading-none">{done}/{total}</span>
              <span className="text-[9px] font-bold text-outline uppercase tracking-wide">done</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div>
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Essentials Today</p>
          <p className="text-2xl font-headline font-black text-on-surface">
            {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
          </p>
        </div>
        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="text-xs text-outline font-medium">
          {total === 0 ? 'No essentials scheduled today' :
           pct >= 1 ? '✓ All essentials covered!' :
           `${total - done} essential${total - done !== 1 ? 's' : ''} remaining`}
        </p>
      </div>
    </div>
  );
}

// ─── Meal Type Quick-Add Grid ─────────────────────────────────────────────────

function MealTypeGrid({ meals, onAddMeal }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(MEAL_CONFIG).map(([type, cfg]) => {
        const meal = meals.find(m => m.mealType === type);
        const isDone = meal?.completed;
        return (
          <button
            key={type}
            onClick={() => onAddMeal(type)}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-95 border',
              isDone ? 'bg-secondary/10 border-secondary/20' : meal ? 'bg-surface-container border-outline-variant/20' : 'bg-surface-container-lowest border-dashed border-outline-variant/30 hover:border-primary/30'
            )}
          >
            <span className="text-xl">{cfg.emoji}</span>
            <span className={cn('text-[10px] font-bold', isDone ? 'text-secondary' : 'text-outline')}>{type}</span>
            {isDone && <Icon name="check_circle" size={12} className="text-secondary" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────

function MealCard({ meal, onToggle, onDelete, onEdit }) {
  const cfg = MEAL_CONFIG[meal.mealType] || { icon: 'restaurant', color: 'text-outline', bg: 'bg-surface-container', emoji: '🍽️', time: '' };
  return (
    <div className={cn('card-floating p-4 flex items-center gap-4 transition-all duration-300', meal.completed && 'opacity-55')}>
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl', cfg.bg)}>
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-0.5">{meal.mealType} · {cfg.time}</p>
        <p className={cn('font-semibold text-sm text-on-surface truncate', meal.completed && 'line-through text-outline')}>
          {meal.title}
        </p>
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {meal.tags.map(tag => (
              <span key={tag} className={cn("text-[9px] font-bold px-2 py-0.5 rounded border", meal.completed ? 'border-outline-variant/30 text-outline-variant bg-surface-container-low' : 'border-primary/20 text-primary bg-primary/5')}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="text-outline-variant hover:text-primary transition-colors p-1">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={onToggle}
          className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            meal.completed ? 'bg-secondary border-secondary text-white' : 'border-outline-variant hover:border-secondary')}>
          {meal.completed && <Icon name="check" size={14} filled className="text-white" />}
        </button>
        <button onClick={onDelete} className="text-outline-variant hover:text-error transition-colors p-1">
          <Icon name="delete" size={16} />
        </button>
      </div>

    </div>
  );
}

// ─── Meal Form ────────────────────────────────────────────────────────────────

function MealForm({ onSave, onClose, initialData, editId, forDate, defaultMealType = 'Breakfast', foodGroups = [] }) {
  const [form, setForm] = useState(initialData || { mealType: defaultMealType, title: '', tags: [] });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      await db.meals.update(editId, { mealType: form.mealType, title: form.title.trim(), tags: form.tags });
    } else {
      await db.meals.add({ date: forDate, mealType: form.mealType, title: form.title.trim(), completed: true, tags: form.tags });
    }
    onSave();
    onClose();
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiSuggestion('');
    const prompt = `Suggest a healthy, simple Indian ${form.mealType.toLowerCase()} meal. Just the name, one suggestion only. Example: "Masala oats with boiled egg"`;
    const result = await askGemini(prompt);
    if (result) {
      const name = result.replace(/\(.*\)/, '').trim();
      setAiSuggestion(name);
      set('title', name);
    }
    setAiLoading(false);
  };

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags?.includes(tag) ? f.tags.filter(t => t !== tag) : [...(f.tags || []), tag]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(MEAL_CONFIG).map(([type, cfg]) => (
          <button key={type} type="button" onClick={() => set('mealType', type)}
            className={cn('flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[11px] font-bold transition-all active:scale-95',
              form.mealType === type ? 'bg-primary text-white shadow-gradient' : 'bg-surface-container text-outline')}>
            <span>{cfg.emoji}</span>{type}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-outline uppercase tracking-wider">Meal Name</label>
          <button type="button" onClick={handleAiSuggest} disabled={aiLoading}
            className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full disabled:opacity-50">
            <Icon name={aiLoading ? 'sync' : 'auto_awesome'} size={11} className={aiLoading ? 'animate-spin' : ''} />
            {aiLoading ? 'Thinking...' : 'AI Suggest'}
          </button>
        </div>
        {aiSuggestion && (
          <p className="text-[11px] text-primary italic mb-1.5 px-1 leading-relaxed">✨ {aiSuggestion}</p>
        )}
        <input className="input-pill w-full text-sm" placeholder="e.g. Oatmeal with berries"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>

      {foodGroups.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-outline uppercase tracking-wider">Tags (Food Groups)</label>
          <div className="flex flex-wrap gap-2">
            {foodGroups.map(tag => {
              const isSelected = form.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'text-[11px] font-bold px-3 py-1.5 rounded-full transition-all border',
                    isSelected ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface-container text-outline-variant border-transparent hover:bg-surface-container-high'
                  )}
                >
                  {isSelected && <Icon name="check" size={12} className="inline mr-1" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary w-full py-4 font-bold shadow-gradient">
        {editId ? 'Save Changes' : 'Save Meal'}
      </button>
    </form>
  );
}

function TagManagerSheet({ foodGroups, onRefresh }) {
  const [newTag, setNewTag] = useState('');

  const handleAdd = async () => {
    if (!newTag.trim() || foodGroups.includes(newTag.trim())) return;
    const updated = [...foodGroups, newTag.trim()];
    await db.settings.put({ key: 'foodGroups', value: updated });
    setNewTag('');
    onRefresh();
  };

  const handleRemove = async (tag) => {
    const updated = foodGroups.filter(t => t !== tag);
    await db.settings.put({ key: 'foodGroups', value: updated });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-2">
        <p className="text-xs font-bold text-primary mb-1">Custom Food Groups</p>
        <p className="text-xs text-outline leading-relaxed">
          Add tags like "Protein", "Fiber", or "Water" to track alongside your meals.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {foodGroups.map(tag => (
          <div key={tag} className="flex items-center gap-2 bg-surface-container text-on-surface text-[11px] font-bold px-3 py-1.5 rounded-full border border-outline-variant/20">
            {tag}
            <button onClick={() => handleRemove(tag)} className="text-outline-variant hover:text-error transition-colors">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        {foodGroups.length === 0 && (
          <p className="text-xs text-outline italic">No custom food groups created yet.</p>
        )}
      </div>
      <div className="flex gap-2">
        <input className="input-pill flex-1 text-sm py-3 px-4 shadow-inner" placeholder="e.g. Greens, Protein..."
          value={newTag} onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <button onClick={handleAdd} className="bg-primary text-white p-3 rounded-full shadow-gradient">
          <Icon name="add" size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function NutritionTab() {
  const [foodGroups, setFoodGroups] = useState([]);
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getTodayStr());

  const [meals, setMeals] = useState([]);
  const [groceryItems, setGroceryItems] = useState([]);
  const [newGroceryItem, setNewGroceryItem] = useState('');
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealFormType, setMealFormType] = useState('Breakfast');
  const [editMeal, setEditMeal] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [showGrocery, setShowGrocery] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = getTodayStr();
  const weekStart = getWeekStart(today);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await seedTodayData();

    const [fg, ml, groceries] = await Promise.all([
      db.settings.get('foodGroups'),
      db.meals.where('date').equals(selectedDay).toArray(),
      db.groceryItems.where('weekStart').equals(weekStart).toArray()
    ]);

    setFoodGroups(fg?.value || []);
    setWeekDates(getWeekDates(today));
    setMeals(ml.sort((a, b) => (MEAL_ORDER[a.mealType] || 0) - (MEAL_ORDER[b.mealType] || 0)));
    setGroceryItems(groceries);

    setLoading(false);
  }, [selectedDay, weekStart, today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleMealToggle = async (meal) => {
    await db.meals.update(meal.id, { completed: !meal.completed });
    loadAll();
  };

  const handleMealDelete = async (meal) => {
    await db.meals.delete(meal.id);
    loadAll();
  };

  const handleAddGrocery = async () => {
    if (!newGroceryItem.trim()) return;
    await db.groceryItems.add({ weekStart, name: newGroceryItem.trim(), checked: false });
    setNewGroceryItem('');
    loadAll();
  };

  const handleQuickAddMeal = (type) => {
    setMealFormType(type);
    setEditMeal(null);
    setShowMealForm(true);
  };

  // Stats
  const targetGroupsCount = foodGroups.length;
  // Get all unique tags from completed meals today
  const completedTags = new Set();
  meals.filter(m => m.completed && m.tags).forEach(m => {
    m.tags.forEach(t => completedTags.add(t));
  });
  const completedTagsCount = completedTags.size;
  const groceryPending = groceryItems.filter(g => !g.checked).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="pt-6 px-6 pb-4 bg-surface-container-low">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Dietary Dashboard</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Fuel</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGrocery(true)}
              className="flex items-center gap-1.5 bg-surface-container text-outline-variant text-[10px] font-bold rounded-full px-3 py-2 border border-outline-variant/20">
              <Icon name="shopping_cart" size={13} />
              {groceryPending > 0 && <span className="text-primary">{groceryPending}</span>}
            </button>
            <button onClick={() => setShowManage(true)}
              className="flex items-center gap-1.5 primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all">
              <Icon name="tune" size={14} /> Manage
            </button>
          </div>
        </div>

        {/* Week Day Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {weekDates.map((date, i) => (
            <button key={date} onClick={() => setSelectedDay(date)}
              className={cn('flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[10px] font-bold transition-all flex-shrink-0',
                date === selectedDay ? 'bg-primary text-white shadow-gradient' : date === today ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline')}>
              <span>{SHORT_DAYS[i]}</span>
              <span className="text-[9px] opacity-70">{date.slice(8)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-28 space-y-5 overflow-y-auto">

        {/* Calorie Ring + Quick Add */}
        <section className="card-floating p-5 space-y-4">
          <EssentialsRing done={completedTagsCount} total={targetGroupsCount} />
          <div className="border-t border-outline-variant/20 pt-4">
            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Quick Add Meal</p>
            <MealTypeGrid
              meals={meals}
              onAddMeal={handleQuickAddMeal}
            />
          </div>
        </section>

        {/* Meal Log */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">
              {selectedDay === today ? "Today's Meals" : 'Meals'}
            </p>
            <button onClick={() => handleQuickAddMeal('Breakfast')}
              className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {meals.map(m => (
              <MealCard key={m.id} meal={m}
                onToggle={() => handleMealToggle(m)}
                onDelete={() => handleMealDelete(m)}
                onEdit={() => { setEditMeal(m); setShowMealForm(true); }}
              />
            ))}
            {meals.length === 0 && !loading && (
              <div className="p-8 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30">
                <span className="text-3xl mb-2 block">🍽️</span>
                <p className="text-xs text-outline">No meals logged yet</p>
                <button onClick={() => handleQuickAddMeal('Breakfast')} className="mt-3 text-primary text-xs font-semibold flex items-center gap-1 mx-auto">
                  <Icon name="add_circle" size={14} /> Log your first meal
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Meal Form Sheet */}
      <BottomSheet
        isOpen={showMealForm || !!editMeal}
        onClose={() => { setShowMealForm(false); setEditMeal(null); }}
        title={editMeal ? 'Edit Meal' : `Add ${mealFormType}`}
      >
        <MealForm
          onSave={loadAll}
          onClose={() => { setShowMealForm(false); setEditMeal(null); }}
          initialData={editMeal ? { mealType: editMeal.mealType, title: editMeal.title, tags: editMeal.tags || [] } : null}
          editId={editMeal?.id}
          forDate={selectedDay}
          defaultMealType={mealFormType}
          foodGroups={foodGroups}
        />
      </BottomSheet>

      {/* Manage Food Groups Sheet */}
      <BottomSheet isOpen={showManage} onClose={() => setShowManage(false)} title="Manage Food Tags">
        <TagManagerSheet foodGroups={foodGroups} onRefresh={loadAll} />
      </BottomSheet>

      {/* Grocery Sheet */}
      <BottomSheet isOpen={showGrocery} onClose={() => setShowGrocery(false)} title="Grocery List">
        <div className="space-y-4">
          <div className="space-y-2">
            {groceryItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10">
                <button
                  onClick={() => db.groceryItems.update(item.id, { checked: !item.checked }).then(loadAll)}
                  className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', item.checked ? 'bg-secondary border-secondary' : 'border-outline-variant')}>
                  {item.checked && <Icon name="check" size={12} className="text-white" />}
                </button>
                <span className={cn('text-sm flex-1 font-medium', item.checked && 'line-through text-outline')}>{item.name}</span>
                <button onClick={() => db.groceryItems.delete(item.id).then(loadAll)} className="text-outline-variant hover:text-error p-1">
                  <Icon name="delete" size={14} />
                </button>
              </div>
            ))}
            {groceryItems.length === 0 && (
              <p className="text-xs text-outline text-center py-4">Your grocery list is empty</p>
            )}
          </div>
          <div className="flex gap-2">
            <input className="input-pill flex-1 text-sm py-3 px-4 shadow-inner" placeholder="Add eggs, milk, almonds..."
              value={newGroceryItem} onChange={e => setNewGroceryItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddGrocery()} />
            <button onClick={handleAddGrocery} className="bg-primary text-white p-3 rounded-full shadow-gradient">
              <Icon name="add" size={20} />
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
