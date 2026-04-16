import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData, getWeekStart, getWeekDates } from '../db/database';

const MEAL_CONFIG = {
  Breakfast: { icon: 'breakfast_dining', color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: '08:00' },
  Lunch:     { icon: 'lunch_dining',     color: 'text-primary',   bg: 'bg-primary/10',   time: '13:00' },
  Dinner:    { icon: 'dinner_dining',    color: 'text-secondary', bg: 'bg-secondary/10', time: '19:00' },
  Snack:     { icon: 'cookie',           color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: ''      },
};

const MEAL_ORDER = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function MealTypeIcon({ mealType }) {
  const cfg = MEAL_CONFIG[mealType] || { icon: 'restaurant', color: 'text-outline', bg: 'bg-surface-container' };
  return (
    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon name={cfg.icon} size={22} className={cfg.color} />
    </div>
  );
}

function MealCard({ meal, onToggle, onDelete, onEdit }) {
  const cfg = MEAL_CONFIG[meal.mealType] || {};
  return (
    <div className={cn('card-floating p-4 flex items-center gap-4 transition-all duration-300', meal.completed && 'opacity-55')}>
      <MealTypeIcon mealType={meal.mealType} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-outline mb-0.5">{meal.mealType}</p>
        <p className={cn('font-semibold text-sm text-on-surface truncate', meal.completed && 'line-through text-outline')}>
          {meal.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {cfg.time && <p className="text-xs text-outline">{cfg.time}</p>}
          {meal.calories > 0 && (
            <span className="text-[11px] font-medium text-outline bg-surface-container px-2 py-0.5 rounded-full">
              {meal.calories} kcal
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="text-outline-variant hover:text-primary transition-colors p-1" aria-label="Edit meal">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={onToggle}
          className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            meal.completed ? 'bg-secondary border-secondary text-white' : 'border-outline-variant hover:border-secondary')}
          aria-label={meal.completed ? 'Mark incomplete' : 'Mark complete'}>
          {meal.completed && <Icon name="check" size={14} filled className="text-white" />}
        </button>
        <button onClick={onDelete} className="text-outline-variant hover:text-error transition-colors p-1" aria-label="Delete meal">
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { mealType: 'Breakfast', title: '', calories: '' };

function MealForm({ onSave, onClose, initialData, editId, forDate }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const dateToUse = forDate || getTodayStr();
    const caloriesVal = form.calories !== '' ? Number(form.calories) : null;

    if (editId) {
      await db.meals.update(editId, {
        mealType: form.mealType,
        title: form.title.trim(),
        calories: caloriesVal,
      });
    } else {
      await db.meals.add({
        date: dateToUse,
        day: 'Today',
        mealType: form.mealType,
        title: form.title.trim(),
        completed: false,
        calories: caloriesVal,
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Meal Type</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(MEAL_CONFIG).map(type => {
            const cfg = MEAL_CONFIG[type];
            return (
              <button key={type} type="button" onClick={() => set('mealType', type)}
                className={cn('flex items-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-95',
                  form.mealType === type ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
                <Icon name={cfg.icon} size={16} />{type}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Meal Name</label>
        <input className="input-pill w-full text-sm" placeholder="e.g. Oatmeal with berries"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">
          Calories (optional)
        </label>
        <input type="number" min="0" step="10" className="input-pill w-full text-sm"
          placeholder="e.g. 450"
          value={form.calories} onChange={e => set('calories', e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full text-center">
        {editId ? 'Save Changes' : 'Add Meal'}
      </button>
    </form>
  );
}

export default function MealsTab() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getTodayStr());
  const [weekDates, setWeekDates] = useState([]);
  const [calorieGoal, setCalorieGoal] = useState(2200);

  // Grocery list
  const [groceryItems, setGroceryItems] = useState([]);
  const [newGroceryItem, setNewGroceryItem] = useState('');

  const today = getTodayStr();
  const weekStart = getWeekStart(today);

  const loadMeals = async () => {
    const data = await db.meals.where('date').equals(selectedDay).toArray();
    data.sort((a, b) => (MEAL_ORDER[a.mealType] ?? 4) - (MEAL_ORDER[b.mealType] ?? 4));
    setMeals(data);
    setLoading(false);
  };

  const loadCalorieGoal = async () => {
    const saved = await db.settings.get('calorieGoal');
    if (saved) setCalorieGoal(saved.value);
  };

  const loadGroceryItems = async () => {
    const items = await db.groceryItems.where('weekStart').equals(weekStart).toArray();
    setGroceryItems(items);
  };

  useEffect(() => {
    const dates = getWeekDates(today);
    setWeekDates(dates);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    seedTodayData().then(() => {
      loadMeals();
      loadCalorieGoal();
      loadGroceryItems();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const handleToggle = async (meal) => {
    await db.meals.update(meal.id, { completed: !meal.completed });
    loadMeals();
  };

  const handleDelete = async (meal) => {
    await db.meals.delete(meal.id);
    loadMeals();
  };

  const handleAddGrocery = async () => {
    if (!newGroceryItem.trim()) return;
    await db.groceryItems.add({ weekStart, name: newGroceryItem.trim(), checked: false });
    setNewGroceryItem('');
    loadGroceryItems();
  };

  const handleToggleGrocery = async (item) => {
    await db.groceryItems.update(item.id, { checked: !item.checked });
    loadGroceryItems();
  };

  const handleDeleteGrocery = async (item) => {
    await db.groceryItems.delete(item.id);
    loadGroceryItems();
  };

  const mealsDone = meals.filter(m => m.completed).length;
  const adherence = meals.length ? Math.round((mealsDone / meals.length) * 100) : 0;
  const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const isToday = selectedDay === today;

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-4 bg-surface-container-low">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Nutrition</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Meals</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="add" size={14} className="text-white" />
            Add Meal
          </button>
        </div>

        {/* Weekly day chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weekDates.map((date, i) => {
            const isActive = date === selectedDay;
            const isTodayDate = date === today;
            return (
              <button
                key={date}
                onClick={() => setSelectedDay(date)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[10px] font-bold transition-all flex-shrink-0',
                  isActive ? 'bg-primary text-white' :
                  isTodayDate ? 'bg-primary/10 text-primary' :
                  'bg-surface-container text-outline hover:bg-surface-container-high'
                )}
              >
                <span>{SHORT_DAYS[i]}</span>
                <span className="text-[9px] opacity-70">{date.slice(8)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 flex gap-3">
        <div className="flex-1 card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="nutrition" size={16} className="text-secondary" />
            <span className="text-xs font-semibold text-outline">Adherence</span>
          </div>
          <p className="text-3xl font-headline font-bold text-on-surface">{adherence}%</p>
          <p className="text-xs text-outline mt-1">{mealsDone} of {meals.length} meals</p>
        </div>
        <div className="flex-1 card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="local_fire_department" size={16} className="text-tertiary" />
            <span className="text-xs font-semibold text-outline">Calories</span>
          </div>
          <p className="text-3xl font-headline font-bold text-on-surface">
            {totalCalories > 0 ? totalCalories.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-outline mt-1">
            {totalCalories > 0 ? `of ${calorieGoal.toLocaleString()} goal` : 'Add calories to meals'}
          </p>
        </div>
      </div>

      {/* Today's meals */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">
          {isToday ? "Today's Meals" : `${selectedDay}`}
        </p>

        {loading && <p className="text-center text-outline text-sm pt-8">Loading...</p>}

        <div className="space-y-3 mb-6">
          {meals.map(m => (
            <MealCard
              key={m.id}
              meal={m}
              onToggle={() => handleToggle(m)}
              onDelete={() => handleDelete(m)}
              onEdit={() => setEditMeal(m)}
            />
          ))}
          {!loading && meals.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-10 text-outline">
              <Icon name="restaurant" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No meals for this day.</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-primary text-sm font-semibold flex items-center gap-1">
                <Icon name="add_circle" size={16} className="text-primary" /> Add a meal
              </button>
            </div>
          )}
        </div>

        {/* Grocery list */}
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mt-6 mb-3 px-1">
          This Week&apos;s Grocery List
        </p>
        <div className="space-y-2 mb-3">
          {groceryItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 card-floating p-3">
              <button
                onClick={() => handleToggleGrocery(item)}
                className={cn('w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all',
                  item.checked ? 'bg-secondary border-secondary' : 'border-outline-variant hover:border-secondary')}
                aria-label="Toggle item"
              >
                {item.checked && <Icon name="check" size={12} className="text-white" />}
              </button>
              <span className={cn('text-sm flex-1 text-on-surface', item.checked && 'line-through text-outline')}>
                {item.name}
              </span>
              <button onClick={() => handleDeleteGrocery(item)} className="text-outline-variant hover:text-error p-1">
                <Icon name="delete" size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input-pill flex-1 text-sm py-2.5"
            placeholder="Add grocery item..."
            value={newGroceryItem}
            onChange={e => setNewGroceryItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddGrocery()}
          />
          <button onClick={handleAddGrocery} className="bg-primary text-white p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all">
            <Icon name="add" size={20} />
          </button>
        </div>
      </div>

      {/* Add Meal sheet */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Add Meal">
        <MealForm onSave={loadMeals} onClose={() => setShowForm(false)} forDate={selectedDay} />
      </BottomSheet>

      {/* Edit Meal sheet */}
      <BottomSheet isOpen={!!editMeal} onClose={() => setEditMeal(null)} title="Edit Meal">
        {editMeal && (
          <MealForm
            initialData={{ mealType: editMeal.mealType, title: editMeal.title, calories: editMeal.calories ?? '' }}
            editId={editMeal.id}
            onSave={loadMeals}
            onClose={() => setEditMeal(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
