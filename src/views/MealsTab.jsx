import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData } from '../db/database';

const MEAL_CONFIG = {
  Breakfast: { icon: 'breakfast_dining', color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: '08:00' },
  Lunch:     { icon: 'lunch_dining',     color: 'text-primary',   bg: 'bg-primary/10',   time: '13:00' },
  Dinner:    { icon: 'dinner_dining',    color: 'text-secondary', bg: 'bg-secondary/10', time: '19:00' },
  Snack:     { icon: 'cookie',           color: 'text-tertiary',  bg: 'bg-tertiary/10',  time: ''      },
};

function MealTypeIcon({ mealType }) {
  const cfg = MEAL_CONFIG[mealType] || { icon: 'restaurant', color: 'text-outline', bg: 'bg-surface-container' };
  return (
    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon name={cfg.icon} size={22} className={cfg.color} />
    </div>
  );
}

function MealCard({ meal, onToggle, onDelete }) {
  const cfg = MEAL_CONFIG[meal.mealType] || {};
  return (
    <div className={cn(
      'card-floating p-4 flex items-center gap-4 transition-all duration-300',
      meal.completed && 'opacity-55'
    )}>
      <MealTypeIcon mealType={meal.mealType} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-outline mb-0.5">{meal.mealType}</p>
        <p className={cn(
          'font-semibold text-sm text-on-surface truncate',
          meal.completed && 'line-through text-outline'
        )}>
          {meal.title}
        </p>
        {cfg.time && <p className="text-xs text-outline mt-0.5">{cfg.time}</p>}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            meal.completed
              ? 'bg-secondary border-secondary text-white'
              : 'border-outline-variant hover:border-secondary'
          )}
          aria-label={meal.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {meal.completed && <Icon name="check" size={14} filled className="text-white" />}
        </button>
        <button
          onClick={onDelete}
          className="text-outline-variant hover:text-error transition-colors p-1"
          aria-label="Delete meal"
        >
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { mealType: 'Breakfast', title: '' };

function MealForm({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const today = getTodayStr();
    await db.meals.add({
      date: today,
      day: 'Today',
      mealType: form.mealType,
      title: form.title.trim(),
      completed: false,
    });
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Meal type */}
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Meal Type</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(MEAL_CONFIG).map(type => {
            const cfg = MEAL_CONFIG[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => set('mealType', type)}
                className={cn(
                  'flex items-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-95',
                  form.mealType === type
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-outline hover:bg-surface-container-high'
                )}
              >
                <Icon name={cfg.icon} size={16} />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meal name */}
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Meal Name</label>
        <input
          className="input-pill w-full text-sm"
          placeholder="e.g. Oatmeal with berries"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          autoFocus
        />
      </div>

      <button type="submit" className="btn-primary w-full text-center">
        Add Meal
      </button>
    </form>
  );
}

export default function MealsTab() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const today = getTodayStr();

  const loadMeals = async () => {
    const data = await db.meals.where('date').equals(today).toArray();
    const order = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };
    data.sort((a, b) => (order[a.mealType] ?? 4) - (order[b.mealType] ?? 4));
    setMeals(data);
    setLoading(false);
  };

  useEffect(() => {
    seedTodayData().then(loadMeals);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (meal) => {
    await db.meals.update(meal.id, { completed: !meal.completed });
    loadMeals();
  };

  const handleDelete = async (meal) => {
    await db.meals.delete(meal.id);
    loadMeals();
  };

  const mealsDone = meals.filter(m => m.completed).length;
  const adherence = meals.length ? Math.round((mealsDone / meals.length) * 100) : 0;

  const WEEKLY_PLAN = [
    { day: 'Mon', meals: ['Oatmeal', 'Salad', 'Stir Fry'] },
    { day: 'Tue', meals: ['Smoothie', 'Wrap', 'Pasta']    },
    { day: 'Wed', meals: ['Eggs', 'Bowl', 'Curry']        },
    { day: 'Thu', meals: ['Oats', 'Soup', 'Salmon']       },
    { day: 'Fri', meals: ['Avocado Toast', 'Tacos', 'Pizza'] },
    { day: 'Sat', meals: ['Pancakes', 'Burger', 'Sushi']  },
    { day: 'Sun', meals: ['Waffles', 'Brunch', 'Roast']   },
  ];

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-6 bg-surface-container-low">
        <div className="flex items-start justify-between">
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
          <p className="text-3xl font-headline font-bold text-on-surface">1,840</p>
          <p className="text-xs text-outline mt-1">of 2,200 goal</p>
        </div>
      </div>

      {/* Today's meals */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">
          Today&apos;s Meals
        </p>

        {loading && <p className="text-center text-outline text-sm pt-8">Loading...</p>}

        <div className="space-y-3 mb-6">
          {meals.map(m => (
            <MealCard key={m.id} meal={m} onToggle={() => handleToggle(m)} onDelete={() => handleDelete(m)} />
          ))}
          {!loading && meals.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-10 text-outline">
              <Icon name="restaurant" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No meals planned.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-primary text-sm font-semibold flex items-center gap-1"
              >
                <Icon name="add_circle" size={16} className="text-primary" /> Add a meal
              </button>
            </div>
          )}
        </div>

        {/* Weekly plan */}
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">
          This Week&apos;s Plan
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {WEEKLY_PLAN.map((dayPlan, i) => (
            <div key={i} className="flex-shrink-0 w-28 card-floating p-3">
              <p className="text-xs font-bold text-primary mb-2">{dayPlan.day}</p>
              {dayPlan.meals.map((m, j) => (
                <p key={j} className="text-[10px] text-outline truncate mb-0.5">{m}</p>
              ))}
            </div>
          ))}
        </div>

        {/* Grocery list */}
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mt-6 mb-3 px-1">
          Grocery List
        </p>
        <div className="space-y-2">
          {['Oats', 'Salmon fillet', 'Quinoa', 'Mixed greens', 'Greek yogurt'].map((item, i) => (
            <div key={i} className="flex items-center gap-3 card-floating p-3">
              <Icon name="check_box_outline_blank" size={18} className="text-outline-variant flex-shrink-0" />
              <span className="text-sm text-on-surface">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom sheet form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Add Meal">
        <MealForm onSave={loadMeals} onClose={() => setShowForm(false)} />
      </BottomSheet>
    </div>
  );
}
