import Dexie from 'dexie';

export const db = new Dexie('LifeOSCompanionDB');

// Version 1: original stores (re-declared for non-destructive migration)
db.version(1).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, title, duration, priority, postponeCount, completed, scheduledTime',
  expenses: '++id, date, timestamp, amount, category, description'
});

// Version 2: add routines table
db.version(2).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, title, duration, priority, postponeCount, completed, scheduledTime',
  expenses: '++id, date, timestamp, amount, category, description',
  routines: '++id, date, title, start, duration, type, completed'
});

// Version 3: add meals + energyLogs tables for new 5-tab layout
db.version(3).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, title, duration, priority, postponeCount, completed, scheduledTime',
  expenses: '++id, date, timestamp, amount, category, description',
  routines: '++id, date, title, start, duration, type, completed',
  meals: '++id, date, day, mealType, title, completed',
  energyLogs: '++id, date, time, level, tag, note',
});

// Version 4: add settings + investments tables
db.version(4).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, title, duration, priority, postponeCount, completed, scheduledTime',
  expenses: '++id, date, timestamp, amount, category, description',
  routines: '++id, date, title, start, duration, type, completed',
  meals: '++id, date, day, mealType, title, completed',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, date, category, amount, note'
});

// Version 5: habit templates, grocery items, recurring tasks, meal calories
db.version(5).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description',
  routines: '++id, date, title, start, duration, type, completed',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, date, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
});

// Version 7: Task carry-forward (dueDate), Routine-Task linking (taskId), Investment monthly keying (month)
db.version(7).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, dueDate, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description',
  routines: '++id, date, title, start, duration, type, completed, taskId',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, month, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
  nutritionCategories: '++id, name, frequency, userFrequency, priority, colorKey, order, active',
  nutritionLogs: '++id, date, categoryId',
  weeklySchedule: '++id, weekStart, categoryId',
}).upgrade(async tx => {
  // Migrate investments from date (YYYY-MM-DD) to month (YYYY-MM)
  return tx.table('investments').toCollection().modify(inv => {
    if (inv.date && !inv.month) {
      inv.month = inv.date.slice(0, 7);
      delete inv.date;
    }
  });
});

// Version 8: Add emailBody field to expenses for Gmail import validation
db.version(8).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, dueDate, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description, emailBody',
  routines: '++id, date, title, start, duration, type, completed, taskId',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, month, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
  nutritionCategories: '++id, name, frequency, userFrequency, priority, colorKey, order, active',
  nutritionLogs: '++id, date, categoryId',
  weeklySchedule: '++id, weekStart, categoryId',
});

// Version 9: Gamification stats and history
db.version(9).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, dueDate, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description, emailBody',
  routines: '++id, date, title, start, duration, type, completed, taskId',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, month, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
  nutritionCategories: '++id, name, frequency, userFrequency, priority, colorKey, order, active',
  nutritionLogs: '++id, date, categoryId',
  weeklySchedule: '++id, weekStart, categoryId',
  userStats: 'key',
});

// ─── Date helpers ────────────────────────────────────────────────────────────

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthStr = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/** Returns the Monday of the week containing `dateStr` (YYYY-MM-DD) */
export const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Returns all 7 dates (Mon–Sun) for the week containing `dateStr` */
export const getWeekDates = (dateStr) => {
  const monday = new Date(getWeekStart(dateStr) + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
};

// ─── Streak ──────────────────────────────────────────────────────────────────

/**
 * Computes consecutive completed-routine days ending yesterday.
 * A day counts if it has ≥1 routine AND every routine is completed.
 */
export const computeStreak = async () => {
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday

  for (let i = 0; i < 365; i++) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const routines = await db.routines.where('date').equals(dateStr).toArray();
    if (routines.length === 0 || routines.some(r => !r.completed)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

// ─── Habit template rollover ──────────────────────────────────────────────────

/**
 * If today has no routines yet, create them from active habitTemplates.
 * Safe to call multiple times — no-op after first run.
 */
export const rolloverHabitTemplates = async (today) => {
  const existing = await db.routines.where('date').equals(today).count();
  if (existing > 0) return;

  const templates = await db.habitTemplates.where('active').equals(1).toArray();
  for (const t of templates) {
    await db.routines.add({
      date: today,
      title: t.title,
      start: t.startTime,
      duration: t.duration,
      type: t.type,
      completed: false,
    });
  }
};

// ─── Recurring & Carry-Forward Rollover ───────────────────────────────────────

/**
 * Tasks with an overdue dueDate that aren't completed are "carried forward" to today.
 * They aren't duplicated, just identified as pending for the current view.
 */
export const rolloverIncompleteTasks = async (today) => {
  // This helper finds all incomplete tasks with dueDate < today
  const overdue = await db.tasks
    .where('completed').equals(0)
    .and(t => t.dueDate && t.dueDate < today)
    .toArray();
  
  return overdue;
};

/**
 * For each recurring task from the last 7 days, ensure a copy exists for today.
 * Skips Saturday/Sunday for 'weekdays' recurrence.
 */
export const rolloverRecurringTasks = async (today) => {
  const todayDate = new Date(today + 'T00:00:00');
  const todayDow = todayDate.getDay(); // 0=Sun, 6=Sat

  // Gather all recurring tasks from past 7 days (excluding today)
  const seen = new Set();
  const past = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const tasks = await db.tasks.where('date').equals(ds).filter(t => t.recurring && t.recurring !== 'none').toArray();
    for (const t of tasks) {
      if (!seen.has(t.title)) {
        seen.add(t.title);
        past.push(t);
      }
    }
  }

  if (past.length === 0) return;

  const todayTasks = await db.tasks.where('date').equals(today).toArray();
  const todayTitles = new Set(todayTasks.map(t => t.title));

  for (const t of past) {
    if (todayTitles.has(t.title)) continue;

    // Respect recurrence type
    if (t.recurring === 'daily') {
      // always
    } else if (t.recurring === 'weekdays' && (todayDow === 0 || todayDow === 6)) {
      continue;
    } else if (t.recurring === 'weekly') {
      // only on same day-of-week as the source task
      const srcDate = new Date(t.date + 'T00:00:00');
      if (srcDate.getDay() !== todayDow) continue;
    }

    await db.tasks.add({
      date: today,
      dueDate: today,
      title: t.title,
      duration: t.duration,
      priority: t.priority,
      scheduledTime: t.scheduledTime || '',
      postponeCount: 0,
      completed: false,
      recurring: t.recurring,
    });
  }
};

// ─── Seed / default settings ──────────────────────────────────────────────────

let _seeded = false;

export const seedTodayData = async () => {
  if (_seeded) return;
  _seeded = true;

  const budget = await db.settings.get('monthlyBudget');
  if (!budget) await db.settings.put({ key: 'monthlyBudget', value: 30000 });

  const investmentCats = await db.settings.get('investmentCategories');
  if (!investmentCats) {
    await db.settings.put({
      key: 'investmentCategories',
      value: ['MF SIP', 'FDs', 'Gold', 'Other']
    });
  }

  const gmailClientId = await db.settings.get('gmailClientId');
  if (!gmailClientId) {
    await db.settings.put({
      key: 'gmailClientId',
      value: '401418950876-3ik48eji7rgsue15ve1rabmcdi3n7d6a.apps.googleusercontent.com'
    });
  }

  const categoryBudgets = await db.settings.get('categoryBudgets');
  if (!categoryBudgets) {
    await db.settings.put({
      key: 'categoryBudgets',
      value: { Food: 5000, Transport: 3000, Shopping: 4000, Dining: 3000, Utilities: 2000, Health: 2000, Entertainment: 2000, Other: 3000 }
    });
  }

  const calorieGoal = await db.settings.get('calorieGoal');
  if (!calorieGoal) await db.settings.put({ key: 'calorieGoal', value: 2200 });

  const wakeTime = await db.settings.get('wakeTime');
  if (!wakeTime) await db.settings.put({ key: 'wakeTime', value: '07:00' });

  await seedNutritionDefaults();

  const xp = await db.userStats.get('xp');
  if (!xp) await db.userStats.put({ key: 'xp', value: 0 });

  const level = await db.userStats.get('level');
  if (!level) await db.userStats.put({ key: 'level', value: 1 });

  const rank = await db.userStats.get('rank');
  if (!rank) await db.userStats.put({ key: 'rank', value: 'Initiate' });
};

// ─── Gamification Helpers ────────────────────────────────────────────────────

export const getXP = async () => {
  const xp = await db.userStats.get('xp');
  const level = await db.userStats.get('level');
  return { xp: xp?.value || 0, level: level?.value || 1 };
};

export const giftXP = async (amount, reason) => {
  const current = await db.userStats.get('xp');
  const newXP = (current?.value || 0) + amount;
  await db.userStats.put({ key: 'xp', value: newXP });

  // Simple leveling: 1000 XP per level
  const oldLevel = Math.floor((current?.value || 0) / 1000) + 1;
  const newLevel = Math.floor(newXP / 1000) + 1;

  if (newLevel > oldLevel) {
    await db.userStats.put({ key: 'level', value: newLevel });
    // Update Rank
    const ranks = ['Initiate', 'Novice', 'Specialist', 'Expert', 'Master', 'Legend'];
    const rankIdx = Math.min(newLevel - 1, ranks.length - 1);
    await db.userStats.put({ key: 'rank', value: ranks[rankIdx] });
  }

  // Log for potential notification/UI feedback
  console.log(`[XP] +${amount} (${reason})`);
  return { newXP, leveledUp: newLevel > oldLevel };
};

/** Tracks synergy - if a task is done within 20 mins of a routine */
export const checkSynergyBonus = async () => {
  const lastRoutineStr = await db.userStats.get('lastRoutineCompletion');
  if (!lastRoutineStr) return false;

  const lastTime = new Date(lastRoutineStr.value).getTime();
  const now = new Date().getTime();
  const diffMins = (now - lastTime) / (1000 * 60);

  if (diffMins <= 20) {
    await db.userStats.delete('lastRoutineCompletion'); // Only one bonus per routine
    return true;
  }
  return false;
};

export const updateLastRoutineCompletion = async () => {
  await db.userStats.put({ key: 'lastRoutineCompletion', value: new Date().toISOString() });
};

// ─── Victory Log Helpers ─────────────────────────────────────────────────────

export const saveVictory = async (victoryText) => {
  const today = getTodayStr();
  await db.userStats.put({ key: `victory_${today}`, value: victoryText });
};

export const getVictory = async (date) => {
  const v = await db.userStats.get(`victory_${date}`);
  return v?.value || null;
};

// ─── Nutrition helpers ────────────────────────────────────────────────────────

const DEFAULT_NUTRITION_CATEGORIES = [
  { name: 'Dal & Pulses',      frequency: 'daily', portion: '1–2 servings', examples: 'Toor dal, moong, rajma, chana, masoor',           why: 'Primary protein source; longevity marker in every Blue Zone study', priority: 'must', colorKey: 0, order: 1  },
  { name: 'Vegetables',        frequency: 'daily', portion: '2–3 servings', examples: 'Any sabzi — vary the colour daily',                why: 'ICMR 2024: 400g+ vegetables daily; colour variety = nutrient variety',  priority: 'must', colorKey: 1, order: 2  },
  { name: 'Fruits',            frequency: 'daily', portion: '1–2 pieces',   examples: 'Banana, guava, papaya, mango, apple',              why: 'Vitamins, phytonutrients; choose seasonal over imported',               priority: 'must', colorKey: 2, order: 3  },
  { name: 'Fermented Foods',   frequency: 'daily', portion: '1 serving',    examples: 'Curd/dahi, idli, dosa, chaas, kanji',              why: 'Stanford 2021: microbiome diversity + 19 inflammatory proteins reduced',priority: 'must', colorKey: 3, order: 4  },
  { name: 'Nuts & Seeds',      frequency: 'daily', portion: '~25 g',        examples: 'Almonds, walnuts, chia, flaxseed, peanuts, til',   why: 'Heart health, ALA omega-3, brain function',                            priority: 'must', colorKey: 2, order: 5  },
  { name: 'Leafy Greens',      frequency: '5x',    portion: '1 serving',    examples: 'Palak, methi, amaranth, coriander, curry leaf',    why: 'Folate, iron, K2 — most consistently under-consumed in urban diets',   priority: 'good', colorKey: 1, order: 6  },
  { name: 'Millets',           frequency: '4x',    portion: '1 serving',    examples: 'Ragi dosa, bajra roti, jowar khichdi, foxtail',    why: 'ICMR 2024 explicitly: superior iron + zinc + fibre vs polished rice',  priority: 'good', colorKey: 2, order: 7  },
  { name: 'Whole Grains',      frequency: 'daily', portion: '1 serving',    examples: 'Brown rice, oats, whole wheat roti, quinoa',       why: 'Fibre + blood sugar regulation; avoid maida where possible',           priority: 'good', colorKey: 0, order: 8  },
  { name: 'Cruciferous Veg',   frequency: '3x',    portion: '1 serving',    examples: 'Cauliflower, cabbage, broccoli, radish, turnip',   why: 'Sulforaphane — strongest food-based cancer-prevention compound known', priority: 'good', colorKey: 1, order: 9  },
  { name: 'Omega-3 Source',    frequency: '3x',    portion: '1 serving',    examples: 'Walnuts, flaxseed in roti, fish (if non-veg)',     why: 'Anti-inflammatory, brain health; ALA from plants counts too',          priority: 'good', colorKey: 0, order: 10 },
  { name: 'Turmeric & Spices', frequency: 'daily', portion: '¼ tsp',        examples: 'Turmeric + black pepper in cooking, ginger, garlic',why: 'Curcumin clinically active at ¼ tsp/day; needs black pepper to absorb',priority: 'good', colorKey: 2, order: 11 },
  { name: 'Water',             frequency: 'daily', portion: '6–8 glasses',  examples: '—',                                               why: 'Dehydration impairs cognition before thirst is felt',                  priority: 'must', colorKey: 0, order: 12 },
];

export const seedNutritionDefaults = async () => {
  const existing = await db.nutritionCategories.count();
  if (existing > 0) return;
  for (const cat of DEFAULT_NUTRITION_CATEGORIES) {
    await db.nutritionCategories.add({ ...cat, userFoods: '', userFrequency: '', active: 1 });
  }
};

// 0=Mon … 6=Sun
export const getTodayWeekIndex = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
};

const SPREAD_PATTERNS = {
  daily: () => [0, 1, 2, 3, 4, 5, 6],
  '5x':  i => [[0,1,2,3,4],[1,2,3,4,5],[0,2,3,4,6],[0,1,3,5,6]][i % 4],
  '4x':  i => [[0,2,4,6],[1,3,5,6],[0,1,3,5],[0,2,5,6]][i % 4],
  '3x':  i => [[0,2,4],[1,3,5],[0,3,6],[2,4,6],[1,4,6]][i % 5],
  '2x':  i => [[0,3],[1,4],[2,5],[0,4],[2,6],[1,5]][i % 6],
  '1x':  i => [[1],[2],[3],[4],[5],[0],[6]][i % 7],
};

const getSpreadDays = (freq, idx) => {
  const fn = SPREAD_PATTERNS[freq] || SPREAD_PATTERNS['3x'];
  return fn(idx);
};

export const generateWeeklySchedule = async (weekStart, { reshuffle = false } = {}) => {
  const existing = await db.weeklySchedule.where('weekStart').equals(weekStart).count();
  if (existing > 0 && !reshuffle) return;
  if (reshuffle) await db.weeklySchedule.where('weekStart').equals(weekStart).delete();

  const categories = await db.nutritionCategories.where('active').equals(1).toArray();
  const seed = reshuffle ? Math.floor(Math.random() * 97) : 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const freq = cat.userFrequency || cat.frequency;
    const days = getSpreadDays(freq, (i + seed) % 10);
    await db.weeklySchedule.add({ weekStart, categoryId: cat.id, assignedDays: days });
  }
};
