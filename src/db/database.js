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

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthStr = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};


let _seeded = false;

export const seedTodayData = async () => {
  if (_seeded) return;
  _seeded = true;

  // Essential Settings Initialization (Defaults)
  const budget = await db.settings.get('monthlyBudget');
  if (!budget) {
    await db.settings.put({ key: 'monthlyBudget', value: 30000 });
  }

  const investmentCats = await db.settings.get('investmentCategories');
  if (!investmentCats) {
    await db.settings.put({
      key: 'investmentCategories',
      value: ['MF SIP', 'FDs', 'Gold', 'Other']
    });
  }

  // Gmail Client ID (Default)
  const gmailClientId = await db.settings.get('gmailClientId');
  if (!gmailClientId) {
    await db.settings.put({ 
      key: 'gmailClientId', 
      value: '401418950876-3ik48eji7rgsue15ve1rabmcdi3n7d6a.apps.googleusercontent.com' 
    });
  }
};

