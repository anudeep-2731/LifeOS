import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { db, getTodayStr, seedTodayData } from '../db/database';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

const dateStr = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
});

export default function DashboardTab() {
  const [stats, setStats] = useState({ routines: 0, routinesDone: 0, tasks: 0, tasksDone: 0, spent: 0, mealsAdherence: 0 });
  const [focusTask, setFocusTask] = useState(null);
  const [streak] = useState(12);
  const [energyLevel] = useState(4);
  const navigate = useNavigate();
  const today = getTodayStr();

  useEffect(() => {
    seedTodayData().then(async () => {
      const [routines, tasks, expenses, meals] = await Promise.all([
        db.routines.where('date').equals(today).toArray(),
        db.tasks.where('date').equals(today).toArray(),
        db.expenses.where('date').equals(today).toArray(),
        db.meals.where('date').equals(today).toArray(),
      ]);

      const routinesDone = routines.filter(r => r.completed).length;
      const tasksDone    = tasks.filter(t => t.completed).length;
      const spent        = expenses.reduce((s, e) => s + e.amount, 0);
      const mealsDone    = meals.filter(m => m.completed).length;
      const mealsAdherence = meals.length ? Math.round((mealsDone / meals.length) * 100) : 0;

      setStats({ routines: routines.length, routinesDone, tasks: tasks.length, tasksDone, spent, mealsAdherence });

      const incomplete = tasks.filter(t => !t.completed);
      incomplete.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
      setFocusTask(incomplete[0] || null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taskPct = stats.tasks ? Math.round((stats.tasksDone / stats.tasks) * 100) : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">

      {/* Greeting */}
      <div className="px-2">
        <h1 className="text-2xl font-headline font-bold text-on-surface">
          {getGreeting()}, Anudeep
        </h1>
        <p className="text-sm text-outline mt-1">{dateStr}</p>
      </div>

      {/* Bento 2×2 stats grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Morning streak */}
        <div className="card-floating p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-tertiary-fixed/60 flex items-center justify-center">
              <Icon name="local_fire_department" size={18} className="text-tertiary" />
            </span>
            <span className="text-xs font-semibold text-outline">Streak</span>
          </div>
          <span className="text-3xl font-headline font-black text-on-surface">{streak}</span>
          <span className="text-xs text-outline">days in a row</span>
        </div>

        {/* Energy */}
        <div className="card-floating p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Icon name="bolt" size={18} className="text-secondary" />
            </span>
            <span className="text-xs font-semibold text-outline">Energy</span>
          </div>
          <span className="text-3xl font-headline font-black text-on-surface">{energyLevel}/5</span>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= energyLevel ? 'bg-secondary' : 'bg-outline-variant/30'}`} />
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="card-floating p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="check_circle" size={18} className="text-primary" />
            </span>
            <span className="text-xs font-semibold text-outline">Tasks</span>
          </div>
          <span className="text-3xl font-headline font-black text-on-surface">
            {stats.tasksDone}/{stats.tasks}
          </span>
          <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${taskPct}%` }} />
          </div>
        </div>

        {/* Meals */}
        <div className="card-floating p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-tertiary/10 flex items-center justify-center">
              <Icon name="restaurant" size={18} className="text-tertiary" />
            </span>
            <span className="text-xs font-semibold text-outline">Meals</span>
          </div>
          <span className="text-3xl font-headline font-black text-on-surface">{stats.mealsAdherence}%</span>
          <span className="text-xs text-outline">adherence today</span>
        </div>
      </div>

      {/* Today's Focus hero card */}
      {focusTask && (
        <div className="primary-gradient rounded-2xl p-6 text-white shadow-gradient">
          <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
            <Icon name="target" size={14} className="text-white" />
            Focus Now
          </span>
          <h3 className="text-xl font-headline font-bold mb-1">{focusTask.title}</h3>
          <p className="text-sm text-white/70 mb-4">{focusTask.duration}m &bull; {focusTask.priority} priority</p>
          <button
            onClick={() => navigate('/tasks')}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-sm font-semibold rounded-full px-5 py-2"
          >
            Start Now
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">Quick Actions</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Log Morning', icon: 'wb_sunny',   to: '/morning'  },
            { label: 'Check Energy', icon: 'bolt',      to: '/energy'   },
            { label: 'Add Expense', icon: 'payments',   to: '/money'    },
          ].map(({ label, icon, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface text-sm font-medium rounded-full px-4 py-2.5 transition-all active:scale-95"
            >
              <Icon name={icon} size={16} className="text-primary" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Info row: next meal + budget */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="restaurant" size={16} className="text-tertiary" />
            <span className="text-xs font-semibold text-outline">Next Meal</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">Lunch</p>
          <p className="text-xs text-outline mt-0.5">Quinoa Power Bowl</p>
        </div>

        <div className="card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="account_balance_wallet" size={16} className="text-primary" />
            <span className="text-xs font-semibold text-outline">Spent Today</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">&#8377;{stats.spent.toLocaleString()}</p>
          <p className="text-xs text-outline mt-0.5">of &#8377;30,000</p>
        </div>
      </div>
    </div>
  );
}
