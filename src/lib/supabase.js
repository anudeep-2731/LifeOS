import { createClient } from '@supabase/supabase-js';
import { db } from '../db/database';

// Defaults or user-configured Supabase settings
let supabaseClient = null;

export const getSupabaseConfig = async () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key, isConfigured: Boolean(url && key && !url.includes('YOUR_SUPABASE')) };
};

export const initSupabase = (url, key) => {
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabaseClient;
};

export const getSupabase = async () => {
  if (supabaseClient) return supabaseClient;
  const cfg = await getSupabaseConfig();
  if (cfg.isConfigured) {
    return initSupabase(cfg.url, cfg.key);
  }
  return null;
};

// ─── SQL Schema Generator Script ──────────────────────────────────────────────
export const SUPABASE_SQL_SCHEMA = `-- Execute this SQL script in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Holdings Table (Net Worth & Assets)
create table if not exists public.holdings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  group_name text not null,
  type text not null,
  platform text not null,
  amount numeric not null default 0,
  date text,
  expiry text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Holdings
alter table public.holdings enable row level security;

create policy "Users can read own holdings" on public.holdings
  for select using (auth.uid() = user_id);

create policy "Users can insert own holdings" on public.holdings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own holdings" on public.holdings
  for update using (auth.uid() = user_id);

create policy "Users can delete own holdings" on public.holdings
  for delete using (auth.uid() = user_id);

-- 2. Expenses Table
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  date text not null,
  timestamp text,
  amount numeric not null,
  category text not null,
  description text not null,
  payment_source text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Expenses
alter table public.expenses enable row level security;

create policy "Users can read own expenses" on public.expenses
  for select using (auth.uid() = user_id);

create policy "Users can insert own expenses" on public.expenses
  for insert with check (auth.uid() = user_id);

create policy "Users can update own expenses" on public.expenses
  for update using (auth.uid() = user_id);

create policy "Users can delete own expenses" on public.expenses
  for delete using (auth.uid() = user_id);

-- 3. Tasks & Schedule Table
create table if not exists public.schedule (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  item_type text not null, -- 'routine' or 'task'
  date text not null,
  due_date text,
  title text not null,
  scheduled_time text,
  duration numeric default 15,
  category text,
  priority text,
  notes text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Schedule
alter table public.schedule enable row level security;

create policy "Users can read own schedule" on public.schedule
  for select using (auth.uid() = user_id);

create policy "Users can insert own schedule" on public.schedule
  for insert with check (auth.uid() = user_id);

create policy "Users can update own schedule" on public.schedule
  for update using (auth.uid() = user_id);

create policy "Users can delete own schedule" on public.schedule
  for delete using (auth.uid() = user_id);
`;

// ─── Direct Cloud CRUD API (Single Source of Truth) ───────────────────────────

// 1. EXPENSES API
export const fetchCloudExpenses = async (monthStr) => {
  const client = await getSupabase();
  if (!client) return [];
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return [];

  let query = client.from('expenses').select('*').eq('user_id', session.user.id);
  if (monthStr) {
    query = query.gte('date', `${monthStr}-01`).lte('date', `${monthStr}-31`);
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  return (data || []).map(e => ({
    id: e.id,
    date: e.date,
    timestamp: e.timestamp || '08:00',
    amount: Number(e.amount) || 0,
    category: e.category,
    description: e.description,
    paymentSource: e.payment_source || 'HDFC Bank',
    notes: e.notes || '',
  }));
};

export const addCloudExpense = async (expense) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    user_id: session.user.id,
    date: expense.date,
    timestamp: expense.timestamp || '08:00',
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.description,
    payment_source: expense.paymentSource || 'HDFC Bank',
    notes: expense.notes || '',
  };

  const { data, error } = await client.from('expenses').insert(payload).select().single();
  if (error) console.error('Error adding expense:', error);
  return data;
};

export const updateCloudExpense = async (id, expense) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    date: expense.date,
    timestamp: expense.timestamp || '08:00',
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.description,
    payment_source: expense.paymentSource || 'HDFC Bank',
    notes: expense.notes || '',
  };

  const { data, error } = await client.from('expenses').update(payload).eq('id', id).eq('user_id', session.user.id).select().single();
  if (error) console.error('Error updating expense:', error);
  return data;
};

export const deleteCloudExpense = async (id) => {
  const client = await getSupabase();
  if (!client) return false;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return false;

  const { error } = await client.from('expenses').delete().eq('id', id).eq('user_id', session.user.id);
  if (error) console.error('Error deleting expense:', error);
  return !error;
};

// 2. HOLDINGS API
export const fetchCloudHoldings = async () => {
  const client = await getSupabase();
  if (!client) return [];
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await client.from('holdings').select('*').eq('user_id', session.user.id);
  if (error) {
    console.error('Error fetching holdings:', error);
    return [];
  }
  return (data || []).map(h => ({
    id: h.id,
    group: h.group_name,
    type: h.type,
    platform: h.platform,
    amount: Number(h.amount) || 0,
    date: h.date || '',
    expiry: h.expiry || '',
  }));
};

export const addCloudHolding = async (holding) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    user_id: session.user.id,
    group_name: holding.group,
    type: holding.type,
    platform: holding.platform,
    amount: Number(holding.amount) || 0,
    date: holding.date || '',
    expiry: holding.expiry || '',
  };

  const { data, error } = await client.from('holdings').insert(payload).select().single();
  if (error) console.error('Error adding holding:', error);
  return data;
};

export const updateCloudHolding = async (id, holding) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    group_name: holding.group,
    type: holding.type,
    platform: holding.platform,
    amount: Number(holding.amount) || 0,
    date: holding.date || '',
    expiry: holding.expiry || '',
  };

  const { data, error } = await client.from('holdings').update(payload).eq('id', id).eq('user_id', session.user.id).select().single();
  if (error) console.error('Error updating holding:', error);
  return data;
};

export const deleteCloudHolding = async (id) => {
  const client = await getSupabase();
  if (!client) return false;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return false;

  const { error } = await client.from('holdings').delete().eq('id', id).eq('user_id', session.user.id);
  if (error) console.error('Error deleting holding:', error);
  return !error;
};

export const adjustCloudHoldingBalance = async (paymentSource, amountDelta) => {
  if (!paymentSource || paymentSource === 'Credit Card' || paymentSource === 'Other') return;
  const holdings = await fetchCloudHoldings();
  const liquid = holdings.filter(h => h.group === 'Liquid Funds');
  const match = liquid.find(h =>
    h.platform.toLowerCase().includes(paymentSource.toLowerCase()) ||
    h.type.toLowerCase().includes(paymentSource.toLowerCase())
  );
  if (match) {
    const newAmount = Math.max(0, match.amount + amountDelta);
    await updateCloudHolding(match.id, { ...match, amount: newAmount });
  }
};

export const computeCloudPortfolioNetWorth = async () => {
  const holdings = await fetchCloudHoldings();
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

export const getCloudExpiringPerks = async (daysThreshold = 30) => {
  const holdings = await fetchCloudHoldings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiring = [];
  holdings.filter(h => h.group === 'Perks & Rewards').forEach(h => {
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

// 3. SCHEDULE API
export const fetchCloudSchedule = async (selectedDate) => {
  const client = await getSupabase();
  if (!client) return { routines: [], tasks: [] };
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return { routines: [], tasks: [] };

  const { data, error } = await client
    .from('schedule')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('date', selectedDate);

  if (error) {
    console.error('Error fetching schedule:', error);
    return { routines: [], tasks: [] };
  }

  const routines = (data || [])
    .filter(s => s.item_type === 'routine')
    .map(s => ({
      id: s.id,
      itemType: 'routine',
      date: s.date,
      title: s.title,
      start: s.scheduled_time || '08:00',
      time: s.scheduled_time || '08:00',
      duration: Number(s.duration) || 15,
      type: s.category || 'Work',
      completed: Boolean(s.completed),
      notes: s.notes || '',
    }));

  const tasks = (data || [])
    .filter(s => s.item_type === 'task')
    .map(s => ({
      id: s.id,
      itemType: 'task',
      date: s.date,
      dueDate: s.due_date || s.date,
      title: s.title,
      duration: Number(s.duration) || 15,
      priority: s.priority || 'Medium',
      completed: Boolean(s.completed),
      scheduledTime: s.scheduled_time || '08:00',
      time: s.scheduled_time || '08:00',
      notes: s.notes || '',
    }));

  return { routines, tasks };
};

export const addCloudScheduleItem = async (item) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    user_id: session.user.id,
    item_type: item.itemType,
    date: item.date,
    due_date: item.dueDate || item.date,
    title: item.title,
    scheduled_time: item.start || item.scheduledTime || '08:00',
    duration: Number(item.duration) || 15,
    category: item.type || item.category || 'Work',
    priority: item.priority || 'Medium',
    notes: item.notes || '',
    completed: Boolean(item.completed),
  };

  const { data, error } = await client.from('schedule').insert(payload).select().single();
  if (error) console.error('Error adding schedule item:', error);
  return data;
};

export const updateCloudScheduleItem = async (id, item) => {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;

  const payload = {
    date: item.date,
    due_date: item.dueDate || item.date,
    title: item.title,
    scheduled_time: item.start || item.scheduledTime || '08:00',
    duration: Number(item.duration) || 15,
    category: item.type || item.category || 'Work',
    priority: item.priority || 'Medium',
    notes: item.notes || '',
    completed: Boolean(item.completed),
  };

  const { data, error } = await client.from('schedule').update(payload).eq('id', id).eq('user_id', session.user.id).select().single();
  if (error) console.error('Error updating schedule item:', error);
  return data;
};

export const deleteCloudScheduleItem = async (id) => {
  const client = await getSupabase();
  if (!client) return false;
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return false;

  const { error } = await client.from('schedule').delete().eq('id', id).eq('user_id', session.user.id);
  if (error) console.error('Error deleting schedule item:', error);
  return !error;
};

export const syncWithSupabase = async () => {
  return { success: true };
};

// ─── Automatic One-Time Migration Helper ──────────────────────────────────────
export const migrateLocalDataToSupabase = async () => {
  try {
    const client = await getSupabase();
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    // 1. Migrate Local Expenses
    const localExpenses = await db.expenses.toArray();
    if (localExpenses && localExpenses.length > 0) {
      const { data: cloudExp } = await client.from('expenses').select('*').eq('user_id', userId);
      const cloudSet = new Set((cloudExp || []).map(e => `${e.date}_${e.description}_${e.amount}`));
      
      const unmigrated = localExpenses.filter(e => !cloudSet.has(`${e.date}_${e.description}_${e.amount}`));
      if (unmigrated.length > 0) {
        const payload = unmigrated.map(e => ({
          user_id: userId,
          date: e.date,
          timestamp: e.timestamp || '08:00',
          amount: Number(e.amount),
          category: e.category,
          description: e.description,
          payment_source: e.paymentSource || 'HDFC Bank',
          notes: e.notes || '',
        }));
        await client.from('expenses').insert(payload);
      }
      await db.expenses.clear();
    }

    // 2. Migrate Local Holdings
    const localHoldings = await db.holdings.toArray();
    if (localHoldings && localHoldings.length > 0) {
      const { data: cloudHoldings } = await client.from('holdings').select('*').eq('user_id', userId);
      const cloudSet = new Set((cloudHoldings || []).map(h => `${h.group_name}_${h.platform}_${h.type}`));
      
      const unmigrated = localHoldings.filter(h => !cloudSet.has(`${h.group}_${h.platform}_${h.type}`));
      if (unmigrated.length > 0) {
        const payload = unmigrated.map(h => ({
          user_id: userId,
          group_name: h.group,
          type: h.type,
          platform: h.platform,
          amount: Number(h.amount) || 0,
          date: h.date || '',
          expiry: h.expiry || '',
        }));
        await client.from('holdings').insert(payload);
      }
      await db.holdings.clear();
    }

    // 3. Migrate Local Schedule & Tasks
    const localRoutines = await db.routines.toArray();
    const localTasks = await db.tasks.toArray();
    const localSched = [
      ...(localRoutines || []).map(r => ({ ...r, itemType: 'routine' })),
      ...(localTasks || []).map(t => ({ ...t, itemType: 'task' }))
    ];
    if (localSched && localSched.length > 0) {
      const { data: cloudSched } = await client.from('schedule').select('*').eq('user_id', userId);
      const cloudSet = new Set((cloudSched || []).map(s => `${s.date}_${s.title}_${s.item_type}`));
      
      const unmigrated = localSched.filter(s => !cloudSet.has(`${s.date}_${s.title}_${s.itemType}`));
      if (unmigrated.length > 0) {
        const payload = unmigrated.map(s => ({
          user_id: userId,
          item_type: s.itemType,
          date: s.date,
          due_date: s.dueDate || s.date,
          title: s.title,
          scheduled_time: s.start || s.scheduledTime || '08:00',
          duration: Number(s.duration) || 15,
          category: s.category || 'Work',
          priority: s.priority || 'Medium',
          notes: s.notes || '',
          completed: Boolean(s.completed),
        }));
        await client.from('schedule').insert(payload);
      }
      await db.routines.clear();
      await db.tasks.clear();
    }
  } catch (err) {
    console.error('Data migration error:', err);
  }
};

// ─── Master Daily Routine Blueprint & Auto-Population Engine ─────────────────

export const DEFAULT_STARTER_ROUTINES = [
  { start: '08:00', duration: 15, category: 'Morning Routine', title: 'Wake Up & Hydration', notes: 'Drink 2 glasses room-temperature water', days: ['Everyday'] },
  { start: '08:15', duration: 25, category: 'Fitness & Spine', title: 'Targeted Back & Core Routine (25 min)', notes: 'Cat-Cow 10 reps & Cobra holds', days: ['Everyday'] },
  { start: '09:15', duration: 30, category: 'Nutrition', title: 'Healthy Breakfast & Tea', notes: 'Nutritious breakfast & morning tea/coffee', days: ['Everyday'] },
  { start: '10:00', duration: 210, category: 'Work', title: 'Deep Work Focus Block 1', notes: 'Focus work session with 50/50 posture stretch', days: ['Everyday'] },
  { start: '13:30', duration: 45, category: 'Nutrition', title: 'Lunch Break & Posture Rest', notes: 'Mindful lunch break', days: ['Everyday'] },
  { start: '19:00', duration: 60, category: 'Health', title: 'Evening Walk & Wind Down', notes: '30-minute brisk walk & posture release', days: ['Everyday'] },
];

export const ANUDEEP_WEEKLY_SKIN_HAIR_PROTOCOLS = {
  Monday: {
    morning: {
      title: 'Morning Skin & Hair Care Protocol',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Rinse hair with plain water.\n2. Wash face with gentle cleanser.\n3. Apply Reginald Men\'s Sunscreen & Moisturizer.\n\n*Ground Rules:* Wash hair first, face last. Reginald Sunscreen in AM only.',
      ingredients: ['Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Care Protocol (2% BHA)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face thoroughly with gentle cleanser.\n2. Wait until skin is dry, then apply 3–4 drops of Chemist at Play 2% BHA.\n3. Apply light gel moisturizer.\n\n*Ground Rules:* 2% BHA Mon/Wed/Fri nights only.',
      ingredients: ['Gentle cleanser', 'Chemist at Play 2% BHA', 'Light gel moisturizer']
    }
  },
  Tuesday: {
    morning: {
      title: 'Morning Skin Care Protocol',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Keep hair dry.\n2. Wash face with gentle cleanser.\n3. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Protocol (Barrier Recovery)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face with gentle cleanser.\n2. Apply light gel moisturizer.\n\n*(Skin Barrier Recovery — NO BHA tonight!)*',
      ingredients: ['Gentle cleanser', 'Light gel moisturizer']
    }
  },
  Wednesday: {
    morning: {
      title: 'Morning Hair Treatment & Skin Care',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Apply crushed fresh Hibiscus gel to hair lengths only.\n2. Massage Scalpe+ on scalp roots; leave for 5 full minutes.\n3. Rinse hair thoroughly.\n4. Wash face with gentle cleanser.\n5. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['10–12 Hibiscus leaves', 'Scalpe+ shampoo', 'Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Care Protocol (2% BHA)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face thoroughly with gentle cleanser.\n2. Wait until dry; apply 3–4 drops of Chemist at Play 2% BHA.\n3. Apply light gel moisturizer.\n\n*(Put on a fresh clean pillowcase tonight!)*',
      ingredients: ['Gentle cleanser', 'Chemist at Play 2% BHA', 'Light gel moisturizer', 'Clean pillowcase']
    }
  },
  Thursday: {
    morning: {
      title: 'Morning Skin Care Protocol',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Keep hair dry.\n2. Wash face with gentle cleanser.\n3. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Protocol (Barrier Recovery)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face with gentle cleanser.\n2. Apply light gel moisturizer.\n\n*(Skin Barrier Recovery — NO BHA tonight!)*',
      ingredients: ['Gentle cleanser', 'Light gel moisturizer']
    }
  },
  Friday: {
    morning: {
      title: 'Morning Kunkudukaya Hair Wash & Skin Care',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Wash scalp with boiled & strained Kunkudukaya + Hibiscus water; rinse.\n2. Wash face with gentle cleanser.\n3. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['4–5 Kunkudukaya shells', '5 Hibiscus leaves', 'Straining cloth', 'Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Care Protocol (2% BHA)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face thoroughly with gentle cleanser.\n2. Wait until dry; apply 3–4 drops of Chemist at Play 2% BHA.\n3. Apply light gel moisturizer.',
      ingredients: ['Gentle cleanser', 'Chemist at Play 2% BHA', 'Light gel moisturizer']
    }
  },
  Saturday: {
    morning: {
      title: 'Morning Skin Care Protocol',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Keep hair dry.\n2. Wash face with gentle cleanser.\n3. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Protocol (Barrier Recovery)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face with gentle cleanser.\n2. Apply light gel moisturizer.\n\n*(Skin Barrier Recovery — NO BHA tonight!)*',
      ingredients: ['Gentle cleanser', 'Light gel moisturizer']
    }
  },
  Sunday: {
    morning: {
      title: 'Morning Hair Treatment & Skin Care',
      start: '08:40',
      duration: 20,
      category: 'Skin & Hair Care',
      notes: '1. Apply crushed fresh Hibiscus gel to hair lengths only.\n2. Massage Scalpe+ on scalp roots; leave for 5 full minutes.\n3. Rinse hair thoroughly.\n4. Wash face with gentle cleanser.\n5. Apply Reginald Men\'s Sunscreen & Moisturizer.',
      ingredients: ['10–12 Hibiscus leaves', 'Scalpe+ shampoo', 'Gentle cleanser', 'Reginald Sunscreen']
    },
    night: {
      title: 'Night Skin Protocol (Barrier Recovery)',
      start: '22:45',
      duration: 15,
      category: 'Skin Care',
      notes: '1. Wash face with gentle cleanser.\n2. Apply light gel moisturizer.\n\n*(Skin Barrier Recovery — NO BHA. Put on a fresh clean pillowcase tonight!)*',
      ingredients: ['Gentle cleanser', 'Light gel moisturizer', 'Clean pillowcase']
    }
  }
};

export const ANUDEEP_MASTER_ROUTINES = DEFAULT_STARTER_ROUTINES;

export const fetchCloudMasterRoutines = async () => {
  try {
    const client = await getSupabase();
    let key = 'master_routines_default';
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) key = `master_routines_${session.user.id}`;
    }
    const cached = await db.settings.get(key);
    if (cached && Array.isArray(cached.value) && cached.value.length > 0) {
      return cached.value;
    }
  } catch (err) {
    console.error('Error fetching master routines:', err);
  }
  return DEFAULT_STARTER_ROUTINES;
};

export const saveCloudMasterRoutines = async (routinesList) => {
  try {
    const client = await getSupabase();
    let key = 'master_routines_default';
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) key = `master_routines_${session.user.id}`;
    }
    await db.settings.put({ key, value: routinesList });
  } catch (err) {
    console.error('Error saving master routines:', err);
  }
  return routinesList;
};

export const autoPopulateDailyRoutines = async (selectedDate) => {
  const client = await getSupabase();
  if (!client) return [];
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  try {
    // Check if routines exist for selectedDate
    const { data: existing, error } = await client
      .from('schedule')
      .select('id')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .eq('item_type', 'routine');

    if (!error && existing && existing.length === 0) {
      // Determine day of week name (Monday, Tuesday, etc.)
      const d = new Date(selectedDate + 'T00:00:00');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });

      // Fetch base master routines
      const baseMasterList = await fetchCloudMasterRoutines();
      
      // Filter base routines applicable to today
      const applicableBase = baseMasterList.filter(r => {
        if (!r.days || r.days.includes('Everyday') || r.days.length === 0) return true;
        return r.days.includes(dayShort) || r.days.includes(dayName);
      });

      const payload = applicableBase.map(r => ({
        user_id: userId,
        item_type: 'routine',
        date: selectedDate,
        due_date: selectedDate,
        title: r.title,
        scheduled_time: r.start,
        duration: Number(r.duration) || 15,
        category: r.category || 'Morning Routine',
        priority: 'High',
        notes: r.notes || '',
        completed: false,
      }));

      // Inject Anudeep's specific Weekly Skin & Hair Care protocols for today
      const skinHairDayProtocol = ANUDEEP_WEEKLY_SKIN_HAIR_PROTOCOLS[dayName];
      if (skinHairDayProtocol) {
        if (skinHairDayProtocol.morning) {
          payload.push({
            user_id: userId,
            item_type: 'routine',
            date: selectedDate,
            due_date: selectedDate,
            title: skinHairDayProtocol.morning.title,
            scheduled_time: skinHairDayProtocol.morning.start,
            duration: skinHairDayProtocol.morning.duration,
            category: skinHairDayProtocol.morning.category,
            priority: 'High',
            notes: skinHairDayProtocol.morning.notes + (skinHairDayProtocol.morning.ingredients ? `\n\n*Products/Ingredients Needed:* ${skinHairDayProtocol.morning.ingredients.join(', ')}` : ''),
            completed: false,
          });
        }

        if (skinHairDayProtocol.night) {
          payload.push({
            user_id: userId,
            item_type: 'routine',
            date: selectedDate,
            due_date: selectedDate,
            title: skinHairDayProtocol.night.title,
            scheduled_time: skinHairDayProtocol.night.start,
            duration: skinHairDayProtocol.night.duration,
            category: skinHairDayProtocol.night.category,
            priority: 'High',
            notes: skinHairDayProtocol.night.notes + (skinHairDayProtocol.night.ingredients ? `\n\n*Products/Ingredients Needed:* ${skinHairDayProtocol.night.ingredients.join(', ')}` : ''),
            completed: false,
          });
        }
      }

      await client.from('schedule').insert(payload);
    }
  } catch (err) {
    console.error('Error auto-populating daily routines:', err);
  }
};

// ─── Hydration / Water Tracker API ────────────────────────────────────────────

export const fetchTodayWater = async (dateStr) => {
  try {
    const key = `water_${dateStr}`;
    const item = await db.settings.get(key);
    return item?.value || 0;
  } catch {
    return 0;
  }
};

export const addWaterIntake = async (amountMl, dateStr) => {
  try {
    const key = `water_${dateStr}`;
    const current = await fetchTodayWater(dateStr);
    const updated = current + amountMl;
    await db.settings.put({ key, value: updated });
    return updated;
  } catch {
    return 0;
  }
};
