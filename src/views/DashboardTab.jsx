import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { db, getTodayStr, getMonthStr, seedTodayData, computeStreak, getExpiringPerks, computePortfolioNetWorth } from '../db/database';
import { askGemini } from '../lib/ai';
import { cn } from '../lib/utils';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function DashboardTab() {
  const [monthSpent, setMonthSpent] = useState(0);
  const [todaySpent, setTodaySpent] = useState(0);
  const [pendingItems, setPendingItems] = useState([]);
  const [expiringPerks, setExpiringPerks] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [streak, setStreak] = useState(null);
  const [netWorth, setNetWorth] = useState(0);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const today = getTodayStr();
  const currentMonth = getMonthStr();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const loadHomeData = async () => {
    setLoading(true);
    await seedTodayData();

    // 1. Fetch Month Expenses & Today Expenses
    const monthExpenses = await db.expenses.filter(e => e.date.startsWith(currentMonth)).toArray();
    const mSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const tSpent = monthExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    setMonthSpent(mSpent);
    setTodaySpent(tSpent);

    // 2. Fetch Today's Uncompleted Tasks & Routines
    const [routines, tasks, streakVal, perks, nwData] = await Promise.all([
      db.routines.where('date').equals(today).toArray(),
      db.tasks.where('date').equals(today).toArray(),
      computeStreak(),
      getExpiringPerks(30),
      computePortfolioNetWorth(),
    ]);

    const uncompletedRoutines = routines
      .filter(r => !r.completed)
      .map(r => ({ id: r.id, itemType: 'routine', title: r.title, time: r.start || '08:00', tag: 'Habit Routine', color: 'text-emerald-400 bg-emerald-500/10' }));

    const uncompletedTasks = tasks
      .filter(t => !t.completed)
      .map(t => ({ id: t.id, itemType: 'task', title: t.title, time: t.scheduledTime || '10:00', tag: `${t.priority || 'Medium'} Priority`, color: 'text-primary bg-primary/10' }));

    const mergedPending = [...uncompletedRoutines, ...uncompletedTasks];
    mergedPending.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    setPendingItems(mergedPending);
    setStreak(streakVal);
    setExpiringPerks(perks);
    setNetWorth(nwData.combinedNetWorth);

    // 3. AI Insight
    const insightKey = `aiInsight_${today}`;
    const cached = await db.settings.get(insightKey);
    if (cached) {
      setAiInsight(cached.value);
    } else {
      const tip = await askGemini(`Concise daily coach for productivity & money. Context: ₹${mSpent} spent this month, ${mergedPending.length} pending tasks today. Max 18 words.`);
      if (tip) {
        const clean = tip.trim().replace(/^["']|["']$/g, '');
        await db.settings.put({ key: insightKey, value: clean });
        setAiInsight(clean);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const handleToggleItem = async (item) => {
    if (item.itemType === 'routine') {
      await db.routines.update(item.id, { completed: true });
    } else {
      await db.tasks.update(item.id, { completed: true });
    }
    loadHomeData();
  };

  return (
    <div className="min-h-screen flex flex-col pb-28">
      <div className="px-4 sm:px-6 pt-5 space-y-6">

        {/* Greeting Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-headline font-extrabold text-on-surface">
              {getGreeting()}, Anudeep
            </h1>
            <p className="text-xs text-outline mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1.5 rounded-full text-xs font-bold text-primary">
            <Icon name="local_fire_department" size={16} className="text-amber-500" />
            <span>{streak || 0} Day Streak</span>
          </div>
        </div>

        {/* Card 1: Total Expense This Month */}
        <div
          onClick={() => navigate('/expenses')}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-card hover:border-primary/40 cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div>
              <p className="text-xs text-outline uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Icon name="receipt_long" size={16} className="text-primary" /> Total Expense This Month
              </p>
              <h2 className="text-4xl font-headline font-black text-on-surface">{formatINR(monthSpent)}</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="arrow_forward" size={20} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-outline-variant/15 text-xs relative z-10">
            <div>
              <span className="text-outline">Spent Today: </span>
              <span className="font-bold text-on-surface">{formatINR(todaySpent)}</span>
            </div>
            <div className="w-px h-3 bg-outline-variant/30" />
            <div>
              <span className="text-outline">Combined Net Worth: </span>
              <span className="font-bold text-emerald-400">{formatINR(netWorth)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Pending Tasks & Events */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Icon name="checklist" size={18} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-sm text-on-surface">Today's Pending Tasks</h3>
                <p className="text-[11px] text-outline">{pendingItems.length} items remaining for today</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/schedule')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Full Schedule <Icon name="chevron_right" size={16} />
            </button>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <p className="text-xs text-outline text-center py-6 animate-pulse">Loading today's agenda...</p>
            ) : pendingItems.length === 0 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center text-emerald-400 space-y-1">
                <Icon name="task_alt" size={28} className="mx-auto" />
                <p className="font-bold text-sm">All Clear for Today!</p>
                <p className="text-xs text-emerald-400/80">Every routine and task for today is completed.</p>
              </div>
            ) : (
              pendingItems.slice(0, 5).map((item) => (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className="bg-surface-container/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-outline-variant/20 hover:bg-surface-container/80 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleItem(item)}
                      className="w-5 h-5 rounded-full border-2 border-outline hover:border-primary flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <Icon name="check" size={12} className="opacity-0 hover:opacity-100 text-primary" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-on-surface truncate">{item.title}</p>
                      <p className="text-[10px] text-outline mt-0.5 flex items-center gap-1">
                        <Icon name="schedule" size={10} /> {item.time}
                      </p>
                    </div>
                  </div>

                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', item.color)}>
                    {item.tag}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Notifications & AI Coach Insights */}
        <div className="space-y-3">
          <h3 className="text-xs font-headline font-bold uppercase tracking-wider text-outline px-1">
            Notifications & Daily Insights
          </h3>

          {/* Perk Expiry Notification Banner */}
          {expiringPerks && expiringPerks.length > 0 && (
            <div
              onClick={() => navigate('/portfolio')}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 animate-pulse">
                  <Icon name="warning" size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-amber-400">Expiring Reward Perks</h4>
                  <p className="text-[11px] text-outline mt-0.5">
                    {expiringPerks.map(p => `${p.type} (${p.platform}) in ${p.diffDays}d`).join(' • ')}
                  </p>
                </div>
              </div>
              <Icon name="chevron_right" size={18} className="text-amber-400" />
            </div>
          )}

          {/* AI Daily Coach Insight */}
          {aiInsight && (
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Icon name="auto_awesome" size={18} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-0.5">Daily Coach Insight</p>
                <p className="text-xs text-on-surface leading-relaxed font-medium">"{aiInsight}"</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
