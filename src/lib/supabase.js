import { createClient } from '@supabase/supabase-js';
import { db } from '../db/database';

// Defaults or user-configured Supabase settings in localStorage/IndexedDB
const DEFAULT_SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

export const getSupabaseConfig = async () => {
  const [urlObj, keyObj] = await Promise.all([
    db.settings.get('supabase_url'),
    db.settings.get('supabase_anon_key')
  ]);
  
  const url = urlObj?.value || import.meta.env.VITE_SUPABASE_URL || '';
  const key = keyObj?.value || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
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

// ─── Realtime Cloud Sync Engine ────────────────────────────────────────────────
export const syncWithSupabase = async () => {
  const client = await getSupabase();
  if (!client) return { success: false, reason: 'Supabase not configured' };

  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return { success: false, reason: 'User not logged in' };

  const userId = session.user.id;

  try {
    // 1. Sync Holdings (Cloud -> Local Dexie & Local -> Cloud)
    const { data: cloudHoldings, error: hErr } = await client.from('holdings').select('*');
    if (!hErr && cloudHoldings && cloudHoldings.length > 0) {
      const formatted = cloudHoldings.map(h => ({
        group: h.group_name,
        type: h.type,
        platform: h.platform,
        amount: Number(h.amount) || 0,
        date: h.date || '',
        expiry: h.expiry || '',
      }));
      await db.holdings.clear();
      await db.holdings.bulkAdd(formatted);
    } else {
      // Push local holdings to cloud if cloud is empty
      const localHoldings = await db.holdings.toArray();
      if (localHoldings.length > 0) {
        const payload = localHoldings.map(h => ({
          user_id: userId,
          group_name: h.group,
          type: h.type,
          platform: h.platform,
          amount: h.amount,
          date: h.date || '',
          expiry: h.expiry || '',
        }));
        await client.from('holdings').insert(payload);
      }
    }

    // 2. Sync Expenses
    const { data: cloudExpenses, error: eErr } = await client.from('expenses').select('*');
    if (!eErr && cloudExpenses && cloudExpenses.length > 0) {
      const formattedExp = cloudExpenses.map(e => ({
        date: e.date,
        timestamp: e.timestamp || '08:00',
        amount: Number(e.amount) || 0,
        category: e.category,
        description: e.description,
        paymentSource: e.payment_source || 'HDFC Bank',
        notes: e.notes || '',
      }));
      await db.expenses.clear();
      await db.expenses.bulkAdd(formattedExp);
    } else {
      const localExp = await db.expenses.toArray();
      if (localExp.length > 0) {
        const payloadExp = localExp.map(e => ({
          user_id: userId,
          date: e.date,
          timestamp: e.timestamp || '08:00',
          amount: e.amount,
          category: e.category,
          description: e.description,
          payment_source: e.paymentSource || 'HDFC Bank',
          notes: e.notes || '',
        }));
        await client.from('expenses').insert(payloadExp);
      }
    }

    return { success: true, count: cloudHoldings?.length || 0 };
  } catch (err) {
    console.error('Supabase Sync Error:', err);
    return { success: false, reason: err.message };
  }
};
