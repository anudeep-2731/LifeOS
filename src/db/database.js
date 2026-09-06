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

// Version 10: Income, EMIs, and custom categories
db.version(10).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, dueDate, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description, emailBody',
  routines: '++id, date, title, start, duration, type, completed, taskId',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, month, category, amount, note',
  income: '++id, month, category, amount, note',
  emis: '++id, month, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
  nutritionCategories: '++id, name, frequency, userFrequency, priority, colorKey, order, active',
  nutritionLogs: '++id, date, categoryId',
  weeklySchedule: '++id, weekStart, categoryId',
  userStats: 'key',
});

// Version 12: Add paymentSource field to expenses
db.version(12).stores({
  wellbeingLogs: '++id, date, type, timestamp, value, note',
  tasks: '++id, date, dueDate, title, duration, priority, postponeCount, completed, scheduledTime, recurring',
  expenses: '++id, date, timestamp, amount, category, description, paymentSource, emailBody',
  routines: '++id, date, title, start, duration, type, completed, taskId',
  meals: '++id, date, day, mealType, title, completed, calories',
  energyLogs: '++id, date, time, level, tag, note',
  settings: 'key',
  investments: '++id, month, category, amount, note',
  income: '++id, month, category, amount, note',
  emis: '++id, month, category, amount, note',
  habitTemplates: '++id, title, startTime, duration, type, active',
  groceryItems: '++id, weekStart, name, checked',
  nutritionCategories: '++id, name, frequency, userFrequency, priority, colorKey, order, active',
  nutritionLogs: '++id, date, categoryId',
  weeklySchedule: '++id, weekStart, categoryId',
  userStats: 'key',
  holdings: '++id, group, type, platform, amount, date, expiry',
});

/**
 * Adjusts liquid holding balance in db.holdings when an expense is logged or deleted.
 * E.g., if paymentSource is 'HDFC Bank', 'SBI Bank', or 'Cash in Hand',
 * amountDelta = -450 will deduct 450 from that liquid fund holding.
 */
export const adjustHoldingBalance = async (paymentSource, amountDelta) => {
  if (!paymentSource || paymentSource === 'Credit Card' || paymentSource === 'Other') return;

  const holdings = await db.holdings.where('group').equals('Liquid Funds').toArray();
  const match = holdings.find(h => 
    h.platform.toLowerCase().includes(paymentSource.toLowerCase()) ||
    h.type.toLowerCase().includes(paymentSource.toLowerCase())
  );

  if (match) {
    const newAmt = Math.max(0, (Number(match.amount) || 0) + amountDelta);
    await db.holdings.update(match.id, { amount: newAmt });
  }
};

// ─── Date helpers ────────────────────────────────────────────────────────────

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthStr = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getPrevMonthStr = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

/**
 * Carries forward monthly items (Investments, Income, EMIs) from the previous month
 * if they are missing for the current month.
 */
export const rolloverFinancials = async (currentMonth) => {
  const prevMonth = getPrevMonthStr(currentMonth);

  const [currentEmis, prevEmis, currentInvests, prevInvests] = await Promise.all([
    db.emis.where('month').equals(currentMonth).toArray(),
    db.emis.where('month').equals(prevMonth).toArray(),
    db.investments.where('month').equals(currentMonth).toArray(),
    db.investments.where('month').equals(prevMonth).toArray(),
  ]);

  if (currentEmis.length === 0 && prevEmis.length > 0) {
    for (const e of prevEmis) {
      await db.emis.add({ month: currentMonth, category: e.category, amount: e.amount, note: e.note || '' });
    }
  }

  if (currentInvests.length === 0 && prevInvests.length > 0) {
    for (const inv of prevInvests) {
      await db.investments.add({ month: currentMonth, category: inv.category, amount: inv.amount, note: inv.note || '' });
    }
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

  const incomeCategories = await db.settings.get('incomeCategories');
  if (!incomeCategories) {
    await db.settings.put({
      key: 'incomeCategories',
      value: ['Salary', 'Freelance', 'Dividends', 'Other']
    });
  }

  const emiCategories = await db.settings.get('emiCategories');
  if (!emiCategories) {
    await db.settings.put({
      key: 'emiCategories',
      value: ['Home Loan', 'Car Loan', 'Personal Loan', 'Other']
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

  const expenseCategories = await db.settings.get('expenseCategories');
  if (!expenseCategories) {
    await db.settings.put({
      key: 'expenseCategories',
      value: [
        { name: 'Food',          icon: 'local_cafe',      color: 'text-primary',    bg: 'bg-primary/10',    type: 'Need', defaultPaymentMode: 'UPI' },
        { name: 'Transport',     icon: 'directions_car',  color: 'text-secondary',  bg: 'bg-secondary/10',  type: 'Need', defaultPaymentMode: 'UPI' },
        { name: 'Shopping',      icon: 'shopping_bag',    color: 'text-tertiary',   bg: 'bg-tertiary/10',   type: 'Want', defaultPaymentMode: 'Credit Card' },
        { name: 'Dining',        icon: 'restaurant',      color: 'text-primary',    bg: 'bg-primary/10',    type: 'Want', defaultPaymentMode: 'Credit Card' },
        { name: 'Utilities',     icon: 'wifi',            color: 'text-secondary',  bg: 'bg-secondary/10',  type: 'Need', defaultPaymentMode: 'Bank Transfer' },
        { name: 'Health',        icon: 'favorite',        color: 'text-error',      bg: 'bg-error/10',      type: 'Need', defaultPaymentMode: 'UPI' },
        { name: 'Entertainment', icon: 'movie',          color: 'text-tertiary',   bg: 'bg-tertiary/10',   type: 'Want', defaultPaymentMode: 'UPI' },
        { name: 'Other',         icon: 'more_horiz',      color: 'text-outline',    bg: 'bg-surface-container', type: 'Want', defaultPaymentMode: 'Cash' },
      ]
    });
  }

  const budgetRules = await db.settings.get('budgetRules');
  if (!budgetRules) {
    await db.settings.put({
      key: 'budgetRules',
      value: { needs: 50, wants: 30, savings: 20 }
    });
  }

  const calorieGoal = await db.settings.get('calorieGoal');
  if (!calorieGoal) await db.settings.put({ key: 'calorieGoal', value: 2200 });

  const wakeTime = await db.settings.get('wakeTime');
  if (!wakeTime) await db.settings.put({ key: 'wakeTime', value: '07:00' });

  const foodGroups = await db.settings.get('foodGroups');
  if (!foodGroups) {
    await db.settings.put({ 
      key: 'foodGroups', 
      value: ['Protein', 'Vegetables', 'Fruits', 'Whole Grains', 'Water'] 
    });
  }

  const xp = await db.userStats.get('xp');
  if (!xp) await db.userStats.put({ key: 'xp', value: 0 });

  const level = await db.userStats.get('level');
  if (!level) await db.userStats.put({ key: 'level', value: 1 });

  const rank = await db.userStats.get('rank');
  if (!rank) await db.userStats.put({ key: 'rank', value: 'Initiate' });

  // Seed default holdings if table is empty
  const holdingsCount = await db.holdings.count();
  if (holdingsCount === 0) {
    await db.holdings.bulkAdd(DEFAULT_HOLDINGS);
  }

  // Seed default schedule events for today if today has no routines
  const today = getTodayStr();
  const todayRoutines = await db.routines.where('date').equals(today).count();
  if (todayRoutines === 0) {
    for (const e of DEFAULT_SCHEDULE_EVENTS) {
      await db.routines.add({
        date: today,
        title: e.title,
        start: e.start,
        duration: e.duration,
        type: e.type,
        notes: e.notes,
        completed: false,
      });
    }
  }
};

export const DEFAULT_SCHEDULE_EVENTS = [
  { start: '08:00', duration: 15, type: 'Morning Routine', title: 'Wake Up & Hydration', notes: '• Brush teeth & wash face with gentle cleanser\n• Drink 1-2 glasses room-temperature water' },
  { start: '08:15', duration: 25, type: 'Fitness & Spine', title: 'Targeted Back & Core Routine (25 min)', notes: '• Spine Decompression (5 min): Cat-Cow (10 reps), Cobra pose (3x20s holds)\n• Core & Glutes (10 min): Glute Bridges (3x12), Deadbugs (3x8/side)\n• Upper Body (10 min): Push-ups, seated dumbbell curls\n• AVOID: Standing overhead dumbbell presses & heavy unassisted squats' },
  { start: '08:40', duration: 35, type: 'Hygiene', title: 'Shower & Hygiene Routine', notes: '• Bath/Shower\n• Scalp (2x/week): Ketoconazole 2% shampoo, lather, leave for full 5 mins before rinsing\n• Face: Lightweight oil-free gel moisturizer on clean skin' },
  { start: '09:15', duration: 30, type: 'Nutrition', title: 'Gut-Friendly Breakfast', notes: '• Steamed Idlis with light Sambar OR Pesarattu with ginger chutney\n• AVOID: Oily dosas, poori, vada, deep-fried sides' },
  { start: '09:45', duration: 15, type: 'Work Setup', title: 'Buffer & Ergonomic Desk Setup', notes: '• Fill 1L water bottle for your desk (aim 2.5-3L daily total)\n• Chair setup: Feet flat, elbows at 90 degrees, lower back supported' },
  { start: '10:00', duration: 210, type: 'Work', title: 'Work Block 1 (Deep Work)', notes: '• Deep work on software engineering tasks\n• The 50/50 Rule: Stand up every 50 mins for 60 seconds, stretch hips, roll shoulders' },
  { start: '13:30', duration: 45, type: 'Nutrition', title: 'Lunch Break', notes: '• 1 cup rice + Mudda Pappu / Dal + mild gourd vegetable curry\n• NON-NEGOTIABLE: 1 glass homemade churned buttermilk (majjiga) with roasted jeera & salt' },
  { start: '14:15', duration: 15, type: 'Digestive Health', title: 'Post-Lunch Walk', notes: '• 10-15 minute casual stroll\n• Do not sit or lie down immediately after eating' },
  { start: '14:30', duration: 150, type: 'Work', title: 'Work Block 2 (Tasks & Calls)', notes: '• Afternoon meetings, PR reviews, and coding\n• Steady water intake' },
  { start: '17:00', duration: 20, type: 'Nutrition', title: 'Evening Snack Break', notes: '• Tender coconut water, boiled chana sundal, or roasted makhana\n• AVOID: Packaged chips, biscuits, tea-stall bajjis/samosas' },
  { start: '17:20', duration: 100, type: 'Work', title: 'Final Work Block', notes: '• Wrap up daily sprint tickets, send EOD status updates\n• Close work laptop by 07:00 PM' },
  { start: '19:00', duration: 45, type: 'Personal', title: 'Open Slot (Free / Transition)', notes: '• Kept open for side-hustle research, family, or communication prep' },
  { start: '19:45', duration: 30, type: 'Nutrition', title: 'Early Dinner (Gut Repair)', notes: '• 2 Phulkas + light curry OR Pepper-cumin Rasam (charu) with small rice + 1/2 tsp ghee\n• Hard rule: Must finish before 08:30 PM to avoid overnight gut fermentation' },
  { start: '20:15', duration: 150, type: 'Personal', title: 'Evening Wind Down / Side Projects', notes: '• Relax, read, or work on side-hustle research\n• Light 10-minute walk around 09:00 PM' },
  { start: '22:45', duration: 15, type: 'Night Routine', title: 'Skin Care & Sleep Prep', notes: '• Wash face with gentle cleanser\n• Face Care: Apply Chemist at Play 2% Salicylic Acid only 3 nights/week\n• Sleep Posture: Pillow between knees (if on side) OR under knees (if on back)\n• Sleep by 11:00 PM' },
];

export const DEFAULT_HOLDINGS = [
  { group: 'Liquid Funds', type: 'Cash in Hand', platform: 'In Hand', amount: 1500, date: '2026-09-01', expiry: '' },
  { group: 'Liquid Funds', type: 'Savings Account', platform: 'HDFC Bank', amount: 62485, date: '2026-09-01', expiry: '' },
  { group: 'Liquid Funds', type: 'Savings Account', platform: 'SBI Bank', amount: 39500, date: '2026-09-01', expiry: '' },
  { group: 'Investments', type: 'Fixed Deposit (FD)', platform: 'SBI Bank', amount: 411011, date: '2026-09-01', expiry: '' },
  { group: 'Investments', type: 'Mutual Funds', platform: 'Zerodha Coin', amount: 578141, date: '2026-09-01', expiry: '' },
  { group: 'Investments', type: 'Direct Equity / Stocks', platform: 'Zerodha Kite & Smallcase', amount: 36717, date: '2026-09-01', expiry: '' },
  { group: 'Investments', type: 'Recurring Deposit (RD)', platform: 'HDFC Bank', amount: 320000, date: '2026-09-01', expiry: '' },
  { group: 'Outside Money', type: 'Lent Fund (Receivable)', platform: 'M Naveen', amount: 9400, date: '2025-12-01', expiry: '2025-12-01' },
  { group: 'Outside Money', type: 'Lent Fund (Receivable)', platform: 'Hemanth', amount: 1000, date: '2026-09-01', expiry: '2026-09-01' },
  { group: 'Physical Assets', type: 'Gold Asset', platform: 'Physical / Sovereign Gold', amount: 240000, date: '2026-09-01', expiry: '' },
  { group: 'Perks & Rewards', type: 'Credit Card Reward Points', platform: 'Rewards Program', amount: 3000, date: '2026-09-01', expiry: '2026-10-15' },
  { group: 'Perks & Rewards', type: 'Corporate Voucher', platform: 'Employer', amount: 3500, date: '2026-09-01', expiry: '2026-09-30' },
  { group: 'Perks & Rewards', type: 'Digital Wallet Cash', platform: 'Amazon Pay', amount: 1299, date: '2026-09-01', expiry: '2027-03-31' },
];

export const computePortfolioNetWorth = async () => {
  const holdings = await db.holdings.toArray();
  let liquid = 0, invested = 0, outside = 0, gold = 0, perks = 0;

  holdings.forEach(h => {
    const amt = Number(h.amount) || 0;
    if (h.group === 'Liquid Funds') liquid += amt;
    else if (h.group === 'Investments') invested += amt;
    else if (h.group === 'Outside Money') outside += amt;
    else if (h.group === 'Physical Assets') gold += amt;
    else if (h.group === 'Perks & Rewards') perks += amt;
  });

  const financialNetWorth = liquid + invested + outside;
  const combinedNetWorth = financialNetWorth + gold;

  return { liquid, invested, outside, gold, perks, financialNetWorth, combinedNetWorth, holdings };
};

export const getExpiringPerks = async (daysThreshold = 30) => {
  const holdings = await db.holdings.where('group').equals('Perks & Rewards').toArray();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiring = [];
  holdings.forEach(h => {
    if (!h.expiry) return;
    const expDate = new Date(h.expiry);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= daysThreshold) {
      expiring.push({ ...h, diffDays });
    }
  });

  return expiring;
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
// Removed hardcoded defaults and complex weekly scheduling algorithms in v11
