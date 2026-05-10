import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { db, getTodayStr, seedTodayData, computeStreak, getVictory, saveVictory } from '../db/database';
import { askGemini } from '../lib/ai';
import { cn } from '../lib/utils';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

const MEAL_ORDER = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

const getPhase = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'ZEN';
  if (h >= 10 && h < 18) return 'HUSTLE';
  return 'REFLECT';
};

export default function DashboardTab() {
  const [stats, setStats] = useState({ routines: 0, routinesDone: 0, tasks: 0, tasksDone: 0, spent: 0, fuelAdherence: 0 });
  const [focusTask, setFocusTask] = useState(null);
  const [streak, setStreak] = useState(null);
  const [nextMeal, setNextMeal] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [phase, setPhase] = useState(getPhase());
  const [victory, setVictory] = useState('');
  const [savedVictory, setSavedVictory] = useState(null);
  const navigate = useNavigate();
  const today = getTodayStr();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    seedTodayData().then(async () => {
      const [routines, tasks, expenses, meals, streakVal] = await Promise.all([
        db.routines.where('date').equals(today).toArray(),
        db.tasks.where('date').equals(today).toArray(),
        db.expenses.where('date').equals(today).toArray(),
        db.meals.where('date').equals(today).toArray(),
        computeStreak(),
      ]);

      const routinesDone  = routines.filter(r => r.completed).length;
      const tasksDone     = tasks.filter(t => t.completed).length;
      const spent         = expenses.reduce((s, e) => s + e.amount, 0);
      const mealsDone     = meals.filter(m => m.completed).length;
      const fuelAdherence = meals.length ? Math.round((mealsDone / meals.length) * 100) : 0;

      setStats({ routines: routines.length, routinesDone, tasks: tasks.length, tasksDone, spent, fuelAdherence });

      const incomplete = tasks.filter(t => !t.completed);
      incomplete.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
      setFocusTask(incomplete[0] || null);
      setStreak(streakVal);

      const incompleteMeals = meals.filter(m => !m.completed);
      incompleteMeals.sort((a, b) => (MEAL_ORDER[a.mealType] ?? 4) - (MEAL_ORDER[b.mealType] ?? 4));
      setNextMeal(incompleteMeals[0] || null);

      // Daily AI insight — cached per day
      const vict = await getVictory(today);
      setSavedVictory(vict);

      // Daily AI insight — phase aware
      const insightKey = `aiInsight_${today}_${phase}`;
      const cached = await db.settings.get(insightKey);
      if (cached) {
        setAiInsight(cached.value);
      } else {
        const prompts = {
          ZEN: `Concise morning coach. Specific actionable tip for routine/intention. Context: ${routinesDone}/${routines.length} routines done. Max 18 words.`,
          HUSTLE: `Concise focus coach. Actionable tip for task momentum & energy. Context: ${tasksDone}/${tasks.length} tasks done. Max 18 words.`,
          REFLECT: `Concise evening coach. Tip for reflection or financial boundary. Context: ₹${spent} spent, ${mealsDone} meals logged. Max 18 words.`
        };
        const tip = await askGemini(prompts[phase] || prompts.HUSTLE);
        if (tip) {
          const clean = tip.trim().replace(/^["']|["']$/g, '');
          await db.settings.put({ key: insightKey, value: clean });
          setAiInsight(clean);
        }
      }
    });

    const interval = setInterval(() => setPhase(getPhase()), 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleSaveVictory = async () => {
    if (!victory.trim()) return;
    await saveVictory(victory.trim());
    setSavedVictory(victory.trim());
    setVictory('');
  };

  const taskPct = stats.tasks ? Math.round((stats.tasksDone / stats.tasks) * 100) : 0;

  return (
    <div className={cn("min-h-screen flex flex-col pb-20 transition-colors duration-1000", 
      phase === 'ZEN' ? 'bg-orange-50/30' : phase === 'HUSTLE' ? 'bg-blue-50/30' : 'bg-purple-50/30'
    )}>
      <div className="px-4 pt-4 space-y-6">
        {/* Header Section */}
        <div className="px-2 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-headline font-bold text-on-surface">
              {getGreeting()}, Anudeep
            </h1>
            <p className="text-sm text-outline mt-1">{dateStr}</p>
          </div>
          <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
             phase === 'ZEN' ? 'bg-orange-100 text-orange-700' : phase === 'HUSTLE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          )}>
            {phase} Phase
          </span>
        </div>

        {/* Dynamic Hero Card */}
        {phase === 'ZEN' && (
           <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <Icon name="wb_sunny" size={48} className="text-white/20 absolute -bottom-4 -right-4 rotate-12" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Morning Routine</p>
              <h2 className="text-3xl font-headline font-black mb-1">{stats.routinesDone}/{stats.routines} done</h2>
              <p className="text-sm text-white/80 mb-6">You're buildling a powerful momentum today.</p>
              <button onClick={() => navigate('/morning')} className="bg-white text-orange-600 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-all">
                 Finish Routine
              </button>
           </div>
        )}

        {phase === 'HUSTLE' && (
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <Icon name="bolt" size={48} className="text-white/20 absolute -bottom-4 -right-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Next Mission</p>
              <h2 className="text-3xl font-headline font-black mb-1 truncate">
                 {focusTask ? focusTask.title : "Queue Empty"}
              </h2>
              <p className="text-sm text-white/80 mb-6">
                 {focusTask ? `${focusTask.duration} mins • ${focusTask.priority} priority` : "Time to plan your next win."}
              </p>
              <button onClick={() => navigate('/tasks')} className="bg-white text-blue-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-all">
                 {focusTask ? "Start Task" : "Add Task"}
              </button>
           </div>
        )}

        {phase === 'REFLECT' && (
           <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <Icon name="history_edu" size={48} className="text-white/20 absolute -bottom-4 -right-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Daily Review</p>
              
              {savedVictory ? (
                 <div className="mb-4">
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Today's Victory</p>
                    <p className="text-lg font-headline font-bold italic">"{savedVictory}"</p>
                 </div>
              ) : (
                <div className="mb-4">
                   <p className="text-sm text-white/80 mb-2">What's one thing that went well today?</p>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={victory} 
                        onChange={e => setVictory(e.target.value)}
                        placeholder="e.g. Finished that report..."
                        className="bg-white/20 border border-white/30 rounded-full px-4 py-2 text-sm placeholder:text-white/40 focus:outline-none flex-1"
                      />
                      <button onClick={handleSaveVictory} className="bg-white text-purple-700 p-2 rounded-full active:scale-95 transition-all">
                         <Icon name="check" size={20} />
                      </button>
                   </div>
                </div>
              )}
              
              <div className="flex gap-4 mt-2">
                 <div>
                    <p className="text-[10px] font-bold text-white/50">SPENT</p>
                    <p className="text-lg font-bold">₹{stats.spent.toLocaleString()}</p>
                 </div>
                 <div className="w-px h-8 bg-white/20" />
                 <div>
                    <p className="text-[10px] font-bold text-white/50">FUEL</p>
                    <p className="text-lg font-bold">{stats.fuelAdherence}%</p>
                 </div>
              </div>
           </div>
        )}

        {/* Bento Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-floating p-5 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center gap-2 relative z-10">
              <span className="w-8 h-8 rounded-xl bg-tertiary-fixed/60 flex items-center justify-center">
                <Icon name="local_fire_department" size={18} className="text-tertiary" />
              </span>
              <span className="text-xs font-semibold text-outline">Streak</span>
            </div>
            <span className="text-3xl font-headline font-black text-on-surface relative z-10">
              {streak === null ? '—' : streak}
            </span>
          </div>

          <div className="card-floating p-5 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center gap-2 relative z-10">
              <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="check_circle" size={18} className="text-primary" />
              </span>
              <span className="text-xs font-semibold text-outline">Today</span>
            </div>
            <span className="text-3xl font-headline font-black text-on-surface relative z-10">
              {stats.tasksDone}/{stats.tasks}
            </span>
            <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${taskPct}%` }} />
            </div>
          </div>
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div className="card-floating p-4 bg-white/40 backdrop-blur-md border border-white/20 flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
               <Icon name="auto_awesome" size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Morning Insight</p>
              <p className="text-sm text-on-surface leading-relaxed font-medium">
                {aiInsight}
              </p>
            </div>
          </div>
        )}

        {/* Info Row */}
        <div className="grid grid-cols-2 gap-3 pb-8">
          <button onClick={() => navigate('/nutrition')} className="card-floating p-4 text-left hover:bg-surface-container transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="restaurant" size={16} className="text-tertiary" />
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Fuel</span>
            </div>
            {nextMeal ? (
              <p className="text-sm font-bold text-on-surface truncate">{nextMeal.title}</p>
            ) : (
              <p className="text-sm text-outline">All clear</p>
            )}
          </button>

          <button onClick={() => navigate('/money')} className="card-floating p-4 text-left hover:bg-surface-container transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="payments" size={16} className="text-primary" />
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Money</span>
            </div>
            <p className="text-sm font-bold text-on-surface">₹{stats.spent.toLocaleString()}</p>
          </button>
        </div>
      </div>
    </div>
  );
}
