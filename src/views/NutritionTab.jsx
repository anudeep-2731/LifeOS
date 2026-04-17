import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import {
  db, getTodayStr, seedTodayData,
  getWeekStart, getWeekDates, getTodayWeekIndex,
  generateWeeklySchedule,
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

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

function CalorieRing({ eaten, goal }) {
  const pct = Math.min(eaten / goal, 1);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const remaining = Math.max(goal - eaten, 0);

  const ringColor = pct >= 1 ? '#4caf50' : pct >= 0.7 ? 'var(--primary)' : 'var(--primary)';

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke="url(#calorieGrad)" strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
          <defs>
            <linearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-on-surface leading-none">{eaten}</span>
          <span className="text-[9px] font-bold text-outline uppercase tracking-wide">kcal</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div>
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Daily Goal</p>
          <p className="text-2xl font-headline font-black text-on-surface">{goal}</p>
        </div>
        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="text-xs text-outline font-medium">
          {pct >= 1 ? '✓ Goal reached' : `${remaining} kcal remaining`}
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
        {meal.calories > 0 && (
          <span className="text-[11px] font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full mt-0.5 inline-block">
            {meal.calories} kcal
          </span>
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

function MealForm({ onSave, onClose, initialData, editId, forDate, defaultMealType = 'Breakfast' }) {
  const [form, setForm] = useState(initialData || { mealType: defaultMealType, title: '', calories: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const caloriesVal = form.calories !== '' ? Number(form.calories) : null;
    if (editId) {
      await db.meals.update(editId, { mealType: form.mealType, title: form.title.trim(), calories: caloriesVal });
    } else {
      await db.meals.add({ date: forDate, mealType: form.mealType, title: form.title.trim(), completed: false, calories: caloriesVal });
    }
    onSave();
    onClose();
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiSuggestion('');
    const prompt = `Suggest a healthy, simple Indian ${form.mealType.toLowerCase()} meal. Respond with just the name, and an estimated calorie count in parentheses. One suggestion only. Example: "Masala oats with boiled egg (320)"`;
    const result = await askGemini(prompt);
    if (result) {
      setAiSuggestion(result.trim());
      // Auto-fill if suggestion contains calorie
      const calMatch = result.match(/\((\d+)\)/);
      const name = result.replace(/\(.*\)/, '').trim();
      set('title', name);
      if (calMatch) set('calories', calMatch[1]);
    }
    setAiLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Calories (optional)</label>
        <input type="number" className="input-pill w-full text-sm" placeholder="e.g. 450"
          value={form.calories} onChange={e => set('calories', e.target.value)} />
      </div>

      <button type="submit" className="btn-primary w-full py-4 font-bold shadow-gradient">
        {editId ? 'Save Changes' : 'Add Meal'}
      </button>
    </form>
  );
}

// ─── Nutrition Check Card ─────────────────────────────────────────────────────

function NutritionCard({ category, checked, onCheck }) {
  const c = color(category.colorKey);
  const foods = category.userFoods || category.examples;

  return (
    <button
      onClick={onCheck}
      className={cn(
        'w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98]',
        checked ? 'bg-surface-container border border-outline-variant/20' : 'bg-surface-container-lowest shadow-card border border-transparent'
      )}
    >
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', checked ? 'bg-secondary/20' : c.bg)}>
        {checked ? <Icon name="check_circle" size={22} filled className="text-secondary" /> : <Icon name="nutrition" size={22} className={c.text} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn('font-semibold text-sm text-on-surface', checked && 'line-through text-outline')}>{category.name}</p>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', checked ? 'bg-secondary/10 text-secondary' : `${c.bg} ${c.text}`)}>
            {FREQ_LABELS[category.userFrequency || category.frequency]}
          </span>
        </div>
        <p className="text-xs text-outline truncate">{foods}</p>
      </div>
      <div className={cn('w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center flex-shrink-0', checked ? 'bg-secondary border-secondary' : 'border-outline-variant')}>
        {checked && <Icon name="check" size={13} className="text-white" />}
      </div>
    </button>
  );
}

// ─── Manage Categories Sheet ──────────────────────────────────────────────────

function ManageCategoriesSheet({ categories, onRefresh }) {
  const [editTarget, setEditTarget] = useState(null);
  const handleToggle = async (cat) => {
    await db.nutritionCategories.update(cat.id, { active: cat.active ? 0 : 1 });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {categories.map(cat => (
        <div key={cat.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container border border-outline-variant/10">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold text-on-surface', !cat.active && 'text-outline line-through')}>{cat.name}</p>
            <p className="text-[10px] text-outline">{FREQ_LABELS[cat.userFrequency || cat.frequency]}</p>
          </div>
          <button onClick={() => setEditTarget(cat)} className="text-outline-variant hover:text-primary p-1.5"><Icon name="edit" size={16} /></button>
          <button onClick={() => handleToggle(cat)} className={cn('text-xs font-bold px-3 py-1.5 rounded-full', cat.active ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-outline')}>
            {cat.active ? 'On' : 'Off'}
          </button>
        </div>
      ))}
      <BottomSheet isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit · ${editTarget?.name}`}>
        <EditCategorySheet category={editTarget} onSave={onRefresh} onClose={() => setEditTarget(null)} />
      </BottomSheet>
    </div>
  );
}

function EditCategorySheet({ category, onSave, onClose }) {
  const [userFoods, setUserFoods] = useState(category?.userFoods || '');
  const [userFrequency, setUserFrequency] = useState(category?.userFrequency || category?.frequency || 'daily');
  const handleSave = async () => {
    await db.nutritionCategories.update(category.id, { userFoods, userFrequency });
    onSave();
    onClose();
  };
  return (
    <div className="space-y-5">
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
        <p className="text-xs font-bold text-primary mb-1">Why this matters</p>
        <p className="text-xs text-outline leading-relaxed">{category.why}</p>
      </div>
      <div>
        <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-1.5">My Preferences</label>
        <textarea className="input-pill w-full text-sm resize-none" rows={2} placeholder={category.examples} value={userFoods} onChange={e => setUserFoods(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2">Target Frequency</label>
        <div className="grid grid-cols-3 gap-2">
          {FREQ_OPTIONS.map(f => (
            <button key={f} onClick={() => setUserFrequency(f)} className={cn('py-2.5 rounded-full text-xs font-bold transition-all', userFrequency === f ? 'bg-primary text-white shadow-gradient' : 'bg-surface-container text-outline')}>
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} className="btn-primary w-full py-4 font-bold">Save Changes</button>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function NutritionTab() {
  const [categories, setCategories] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [logs, setLogs] = useState(new Set());
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getTodayStr());

  const [meals, setMeals] = useState([]);
  const [calorieGoal, setCalorieGoal] = useState(2200);
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
    await generateWeeklySchedule(weekStart);

    const [cats, sch, ml, settings, groceries] = await Promise.all([
      db.nutritionCategories.orderBy('order').toArray(),
      db.weeklySchedule.where('weekStart').equals(weekStart).toArray(),
      db.meals.where('date').equals(selectedDay).toArray(),
      db.settings.get('calorieGoal'),
      db.groceryItems.where('weekStart').equals(weekStart).toArray()
    ]);

    setCategories(cats);
    setWeekDates(getWeekDates(today));
    setMeals(ml.sort((a, b) => (MEAL_ORDER[a.mealType] || 0) - (MEAL_ORDER[b.mealType] || 0)));
    setCalorieGoal(settings?.value || 2200);
    setGroceryItems(groceries);

    const sm = {};
    sch.forEach(r => sm[r.categoryId] = r.assignedDays || []);
    setScheduleMap(sm);

    const dayLogs = await db.nutritionLogs.where('date').equals(selectedDay).toArray();
    setLogs(new Set(dayLogs.map(l => l.categoryId)));
    setLoading(false);
  }, [selectedDay, weekStart, today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleNutritionToggle = async (catId) => {
    if (logs.has(catId)) {
      await db.nutritionLogs.where({ date: selectedDay, categoryId: catId }).delete();
    } else {
      await db.nutritionLogs.add({ date: selectedDay, categoryId: catId });
    }
    loadAll();
  };

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
  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const selectedDayIdx = getTodayWeekIndex(selectedDay);
  const assignedCats = categories.filter(c => c.active && (scheduleMap[c.id] || []).includes(selectedDayIdx));
  const checkedCount = assignedCats.filter(c => logs.has(c.id)).length;
  const nutritionPct = assignedCats.length ? Math.round((checkedCount / assignedCats.length) * 100) : 0;
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
          <CalorieRing eaten={totalCals} goal={calorieGoal} />
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

        {/* Food Group Checklist */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">Food Groups</p>
            <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full',
              nutritionPct === 100 ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary')}>
              {checkedCount}/{assignedCats.length} done
            </span>
          </div>
          {assignedCats.length === 0 ? (
            <div className="p-6 text-center bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30">
              <p className="text-xs text-outline">No food groups scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedCats.map(cat => (
                <NutritionCard key={cat.id} category={cat} checked={logs.has(cat.id)} onCheck={() => handleNutritionToggle(cat.id)} />
              ))}
            </div>
          )}
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
          initialData={editMeal ? { mealType: editMeal.mealType, title: editMeal.title, calories: editMeal.calories || '' } : null}
          editId={editMeal?.id}
          forDate={selectedDay}
          defaultMealType={mealFormType}
        />
      </BottomSheet>

      {/* Manage Food Groups Sheet */}
      <BottomSheet isOpen={showManage} onClose={() => setShowManage(false)} title="Fuel Sources">
        <ManageCategoriesSheet categories={categories} onRefresh={loadAll} onClose={() => setShowManage(false)} />
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
