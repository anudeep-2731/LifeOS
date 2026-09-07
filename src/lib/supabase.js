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

export const fetchUserProfileName = async () => {
  try {
    const client = await getSupabase();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
        if (metaName) return metaName;
        if (session.user.email) {
          const raw = session.user.email.split('@')[0];
          return raw.charAt(0).toUpperCase() + raw.slice(1);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching user profile name:', err);
  }
  const cached = await db.settings.get('user_full_name');
  return cached?.value || 'User';
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

-- 4. Social Circles Tables Creation
create table if not exists public.circles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  invite_code text unique not null,
  created_by uuid references auth.users not null default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.circle_members (
  id uuid default gen_random_uuid() primary key,
  circle_id uuid references public.circles on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  user_name text not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (circle_id, user_id)
);

create table if not exists public.circle_daily_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  user_name text not null,
  date text not null,
  routine_score numeric default 0,
  task_score numeric default 0,
  financial_status text default 'On Track',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

create table if not exists public.circle_posts (
  id uuid default gen_random_uuid() primary key,
  circle_id uuid references public.circles on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  user_name text not null,
  photo_url text,
  caption text,
  post_type text default 'photo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.circle_reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.circle_posts on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  user_name text not null,
  emoji text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (post_id, user_id, emoji)
);

-- Enable RLS
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_daily_snapshots enable row level security;
alter table public.circle_posts enable row level security;
alter table public.circle_reactions enable row level security;

-- Policies for circles
create policy "Authenticated users can view circles" on public.circles
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create circles" on public.circles
  for insert with check (auth.role() = 'authenticated');

create policy "Creator can delete circle" on public.circles
  for delete using (auth.uid() = created_by);

-- Policies for circle_members
create policy "Authenticated users can view circle members" on public.circle_members
  for select using (auth.role() = 'authenticated');

create policy "Users can join circles" on public.circle_members
  for insert with check (auth.uid() = user_id);

create policy "Users can leave circles" on public.circle_members
  for delete using (auth.uid() = user_id);

-- Policies for circle_daily_snapshots
create policy "Authenticated users can view snapshots" on public.circle_daily_snapshots
  for select using (auth.role() = 'authenticated');

create policy "Users can upsert own snapshots" on public.circle_daily_snapshots
  for insert with check (auth.uid() = user_id);

create policy "Users can update own snapshots" on public.circle_daily_snapshots
  for update using (auth.uid() = user_id);

-- Policies for circle_posts
create policy "Authenticated users can view posts" on public.circle_posts
  for select using (auth.role() = 'authenticated');

create policy "Circle members can create posts" on public.circle_posts
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update own posts" on public.circle_posts
  for update using (auth.uid() = user_id);

create policy "Users can delete own posts" on public.circle_posts
  for delete using (auth.uid() = user_id);

-- Policies for circle_reactions
create policy "Authenticated users can view reactions" on public.circle_reactions
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can add reactions" on public.circle_reactions
  for insert with check (auth.uid() = user_id);

create policy "Users can remove reactions" on public.circle_reactions
  for delete using (auth.uid() = user_id);

-- Storage Bucket & Storage RLS Policies
insert into storage.buckets (id, name, public) 
values ('circle-photos', 'circle-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload circle photos" on storage.objects;
drop policy if exists "Public can view circle photos" on storage.objects;
drop policy if exists "Users can delete own circle photos" on storage.objects;

create policy "Authenticated users can upload circle photos" on storage.objects
  for insert with check (
    bucket_id = 'circle-photos' and auth.role() = 'authenticated'
  );

create policy "Public can view circle photos" on storage.objects
  for select using (
    bucket_id = 'circle-photos'
  );

create policy "Users can delete own circle photos" on storage.objects
  for delete using (
    bucket_id = 'circle-photos' and auth.uid() = owner
  );
`;

// ─── Direct Cloud CRUD API (Single Source of Truth) ───────────────────────────

// 0. CLOUD SETTINGS SYNC (Synced via Supabase User Metadata + Dexie cache)
export const fetchCloudSetting = async (key, defaultValue = null) => {
  try {
    const client = await getSupabase();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user?.user_metadata && session.user.user_metadata[key] !== undefined) {
        const cloudVal = session.user.user_metadata[key];
        await db.settings.put({ key, value: cloudVal });
        return cloudVal;
      }
    }
  } catch (err) {
    console.error(`Error fetching cloud setting ${key}:`, err);
  }
  const cached = await db.settings.get(key);
  return cached?.value !== undefined ? cached.value : defaultValue;
};

export const saveCloudSetting = async (key, value) => {
  try {
    await db.settings.put({ key, value });
    const client = await getSupabase();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const currentMeta = session.user.user_metadata || {};
        await client.auth.updateUser({
          data: { ...currentMeta, [key]: value }
        });
      }
    }
  } catch (err) {
    console.error(`Error saving cloud setting ${key}:`, err);
  }
  return value;
};

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

    // 3. Clear local legacy routines & tasks cache to avoid cross-user contamination
    await db.routines.clear();
    await db.tasks.clear();

    await db.settings.put({ key: 'data_migrated_v1', value: true });
  } catch (err) {
    console.error('Data migration error:', err);
  }
};

// ─── Master Daily Routine Blueprint & Auto-Population Engine ─────────────────

// Clean basic starter routines for all new users (5 basic daily habits)
export const DEFAULT_STARTER_ROUTINES = [
  { start: '08:00', duration: 15, category: 'Morning Routine', title: 'Morning Hydration', notes: 'Drink 2 glasses of room-temperature water', days: ['Everyday'] },
  { start: '08:30', duration: 30, category: 'Hygiene', title: 'Morning Hygiene & Refresh', notes: 'Shower, refresh, and get ready for the day', days: ['Everyday'] },
  { start: '09:00', duration: 30, category: 'Nutrition', title: 'Healthy Breakfast & Beverage', notes: 'Nutritious breakfast and morning tea/coffee', days: ['Everyday'] },
  { start: '10:00', duration: 180, category: 'Work', title: 'Focus Work Block 1', notes: 'Deep work block on priority tasks and goals', days: ['Everyday'] },
  { start: '19:00', duration: 45, category: 'Health', title: 'Evening Walk & Wind Down', notes: '30-minute brisk walk and evening relaxation', days: ['Everyday'] },
];

export const fetchCloudMasterRoutines = async () => {
  try {
    // 1. Fetch user's custom saved master routines from cloud settings metadata
    const customSaved = await fetchCloudSetting('master_routines', null);
    if (customSaved && Array.isArray(customSaved) && customSaved.length > 0) {
      return customSaved;
    }
  } catch (err) {
    console.error('Error fetching master routines:', err);
  }
  return DEFAULT_STARTER_ROUTINES;
};

export const saveCloudMasterRoutines = async (routinesList) => {
  try {
    await saveCloudSetting('master_routines', routinesList);
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

      // Fetch master routines blueprint
      const baseMasterList = await fetchCloudMasterRoutines();
      
      // Filter routines applicable to today
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

// ─── Social Circles API ────────────────────────────────────────────────────────

/** Helper to generate 6-char alphanumeric invite code */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createCircle = async ({ name, description }) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const userName = await fetchUserProfileName();
  const inviteCode = generateInviteCode();
  
  // 1. Insert circle
  const { data: circle, error: circleErr } = await client
    .from('circles')
    .insert([{ name, description, invite_code: inviteCode, created_by: session.user.id }])
    .select()
    .single();
    
  if (circleErr) throw circleErr;
  
  // 2. Add creator as admin member
  const { error: memberErr } = await client
    .from('circle_members')
    .insert([{ circle_id: circle.id, user_id: session.user.id, user_name: userName, role: 'admin' }]);
    
  if (memberErr) console.error('Error adding creator to circle members:', memberErr);
  
  return circle;
};

export const joinCircleByCode = async (inviteCode) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const codeFormatted = inviteCode.trim().toUpperCase();
  
  // 1. Find circle by invite code
  const { data: circle, error: findErr } = await client
    .from('circles')
    .select('*, circle_members(count)')
    .eq('invite_code', codeFormatted)
    .single();
    
  if (findErr || !circle) throw new Error('Invalid invite code. Circle not found.');
  
  // 2. Check 8 member cap limit
  const count = circle.circle_members?.[0]?.count || 0;
  if (count >= 8) {
    throw new Error('This circle has reached the maximum cap of 8 members.');
  }
  
  const userName = await fetchUserProfileName();
  
  // 3. Join circle
  const { error: joinErr } = await client
    .from('circle_members')
    .insert([{ circle_id: circle.id, user_id: session.user.id, user_name: userName, role: 'member' }]);
    
  if (joinErr) {
    if (joinErr.code === '23505') throw new Error('You are already a member of this circle.');
    throw joinErr;
  }
  
  return circle;
};

export const fetchMyCircles = async () => {
  const client = await getSupabase();
  if (!client) return [];
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return [];
  
  const { data, error } = await client
    .from('circle_members')
    .select('circle_id, role, circles(*)')
    .eq('user_id', session.user.id);
    
  if (error) {
    console.error('Error fetching my circles:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    ...item.circles,
    userRole: item.role
  }));
};

export const fetchCircleMembers = async (circleId) => {
  const client = await getSupabase();
  if (!client) return [];
  
  const { data, error } = await client
    .from('circle_members')
    .select('*')
    .eq('circle_id', circleId)
    .order('joined_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching circle members:', error);
    return [];
  }
  return data || [];
};

export const fetchCircleDailySnapshots = async (dateStr) => {
  const client = await getSupabase();
  if (!client) return [];
  
  const { data, error } = await client
    .from('circle_daily_snapshots')
    .select('*')
    .eq('date', dateStr);
    
  if (error) {
    console.error('Error fetching daily snapshots:', error);
    return [];
  }
  return data || [];
};

export const publishDailySnapshot = async (todayDateStr) => {
  const client = await getSupabase();
  if (!client) return null;
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return null;
  
  const userId = session.user.id;
  const userName = await fetchUserProfileName();
  const dateStr = todayDateStr || new Date().toISOString().split('T')[0];
  
  try {
    // Calculate routine score for today
    const { data: routines } = await client
      .from('schedule')
      .select('completed')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .eq('item_type', 'routine');
      
    let routineScore = 0;
    if (routines && routines.length > 0) {
      const done = routines.filter(r => r.completed).length;
      routineScore = Math.round((done / routines.length) * 100);
    }
    
    // Calculate task score for today
    const { data: tasks } = await client
      .from('schedule')
      .select('completed')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .eq('item_type', 'task');
      
    let taskScore = 0;
    if (tasks && tasks.length > 0) {
      const done = tasks.filter(t => t.completed).length;
      taskScore = Math.round((done / tasks.length) * 100);
    }
    
    // Calculate financial consistency
    let finStatus = 'On Track';
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const currentDay = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const monthlyBudget = Number(await fetchCloudSetting('monthly_budget', 30000));
    
    const { data: expenses } = await client
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('date', `${currentMonth}-01`)
      .lte('date', `${currentMonth}-31`);
      
    const totalSpent = (expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const expectedMaxSpent = (monthlyBudget / totalDays) * currentDay;
    
    if (totalSpent > monthlyBudget) {
      finStatus = 'Over Budget';
    } else if (totalSpent > expectedMaxSpent * 1.15) {
      finStatus = 'Warning';
    } else {
      finStatus = 'On Track';
    }
    
    // Upsert snapshot
    const payload = {
      user_id: userId,
      user_name: userName,
      date: dateStr,
      routine_score: routineScore,
      task_score: taskScore,
      financial_status: finStatus,
      updated_at: new Date().toISOString()
    };
    
    const { data: existing } = await client
      .from('circle_daily_snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();
      
    if (existing) {
      await client.from('circle_daily_snapshots').update(payload).eq('id', existing.id);
    } else {
      await client.from('circle_daily_snapshots').insert([payload]);
    }
    
    return payload;
  } catch (err) {
    console.error('Error publishing daily snapshot:', err);
    return null;
  }
};

export const uploadCirclePhoto = async (imageBlobOrFile) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const fileExt = 'jpg';
  const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error: uploadErr } = await client
    .storage
    .from('circle-photos')
    .upload(fileName, imageBlobOrFile, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
  if (uploadErr) {
    console.error('Photo upload error:', uploadErr);
    throw new Error('Failed to upload photo. Please check storage bucket configuration.');
  }
  
  const { data: publicUrlData } = client
    .storage
    .from('circle-photos')
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
};

export const createCirclePost = async ({ circleId, photoUrl, caption, postType = 'photo' }) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const userName = await fetchUserProfileName();
  
  const { data, error } = await client
    .from('circle_posts')
    .insert([{
      circle_id: circleId,
      user_id: session.user.id,
      user_name: userName,
      photo_url: photoUrl || null,
      caption: caption || '',
      post_type: postType
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const fetchCirclePosts = async (circleId) => {
  const client = await getSupabase();
  if (!client) return [];
  
  const { data: posts, error: postsErr } = await client
    .from('circle_posts')
    .select('*, circle_reactions(*)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
    
  if (postsErr) {
    console.error('Error fetching circle posts:', postsErr);
    return [];
  }
  return posts || [];
};

export const toggleReaction = async ({ postId, emoji }) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const userId = session.user.id;
  const userName = await fetchUserProfileName();
  
  // Check if reaction exists
  const { data: existing } = await client
    .from('circle_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .single();
    
  if (existing) {
    // Remove reaction
    await client.from('circle_reactions').delete().eq('id', existing.id);
    return { action: 'removed' };
  } else {
    // Add reaction
    await client.from('circle_reactions').insert([{
      post_id: postId,
      user_id: userId,
      user_name: userName,
      emoji: emoji
    }]);
    return { action: 'added' };
  }
};

export const leaveCircle = async (circleId) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const { error } = await client
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', session.user.id);
    
  if (error) throw error;
};

export const deleteCircle = async (circleId) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { error } = await client
    .from('circles')
    .delete()
    .eq('id', circleId);
    
  if (error) throw error;
};

export const updateCirclePost = async ({ postId, caption }) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  const { data, error } = await client
    .from('circle_posts')
    .update({ caption })
    .eq('id', postId)
    .eq('user_id', session.user.id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteCirclePost = async (post) => {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  
  // 1. Delete image from storage if present
  if (post.photo_url) {
    try {
      const urlParts = post.photo_url.split('/circle-photos/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await client.storage.from('circle-photos').remove([filePath]);
      }
    } catch (storageErr) {
      console.error('Error deleting photo from storage:', storageErr);
    }
  }
  
  // 2. Delete post row from table
  const { error } = await client
    .from('circle_posts')
    .delete()
    .eq('id', post.id)
    .eq('user_id', session.user.id);
    
  if (error) throw error;
};

