import Icon from '../ui/Icon';

export default function LifeHealthDiagnosticCard({ 
  routinesCompleted = 0, 
  totalRoutines = 0, 
  todaySpent = 0, 
  monthSpent = 0, 
  streak = 0, 
  pendingCount = 0,
  expiringPerksCount = 0
}) {
  const routinePct = totalRoutines > 0 ? Math.round((routinesCompleted / totalRoutines) * 100) : 100;
  
  // What's Going Well criteria
  const goingWell = [];
  if (streak > 0) {
    goingWell.push({ id: 'streak', icon: 'local_fire_department', text: `${streak} Day Active Habit Streak!`, color: 'text-amber-400 bg-amber-500/10' });
  }
  if (routinePct >= 60) {
    goingWell.push({ id: 'routines', icon: 'task_alt', text: `${routinePct}% Daily Routines Completed (${routinesCompleted}/${totalRoutines})`, color: 'text-emerald-400 bg-emerald-500/10' });
  } else if (routinesCompleted > 0) {
    goingWell.push({ id: 'routines-partial', icon: 'check_circle', text: `Completed ${routinesCompleted} routine habits today`, color: 'text-emerald-400 bg-emerald-500/10' });
  }
  if (todaySpent < 1500) {
    goingWell.push({ id: 'expense-pace', icon: 'trending_down', text: 'Daily spending pace remains under budget threshold', color: 'text-emerald-400 bg-emerald-500/10' });
  }

  // Fallback for going well if empty
  if (goingWell.length === 0) {
    goingWell.push({ id: 'start-day', icon: 'wb_sunny', text: 'Ready to crush today\'s routine habits', color: 'text-emerald-400 bg-emerald-500/10' });
  }

  // Needs Attention criteria
  const needsAttention = [];
  if (pendingCount > 0) {
    needsAttention.push({ id: 'pending-tasks', icon: 'error_outline', text: `${pendingCount} agenda tasks/routines pending for today`, color: 'text-amber-400 bg-amber-500/10' });
  }
  if (routinePct < 60 && totalRoutines > 0) {
    needsAttention.push({ id: 'routine-behind', icon: 'schedule', text: `Behind on daily habits (${totalRoutines - routinesCompleted} remaining)`, color: 'text-amber-400 bg-amber-500/10' });
  }
  if (expiringPerksCount > 0) {
    needsAttention.push({ id: 'perks', icon: 'card_giftcard', text: `${expiringPerksCount} reward perks expiring in 30 days`, color: 'text-rose-400 bg-rose-500/10' });
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="insights" size={18} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm text-on-surface">Daily Strategy & Health Diagnostic</h3>
            <p className="text-[11px] text-outline">Real-time performance check</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {routinePct}% Routine Score
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Going Well */}
        <div className="bg-emerald-500/5 rounded-2xl p-3.5 border border-emerald-500/15 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Icon name="verified" size={16} />
            <span>What's Going Well</span>
          </div>
          <div className="space-y-1.5">
            {goingWell.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs font-medium text-on-surface bg-surface-container/30 rounded-xl p-2">
                <Icon name={item.icon} size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="truncate">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-amber-500/5 rounded-2xl p-3.5 border border-amber-500/15 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Icon name="warning" size={16} />
            <span>Needs Attention</span>
          </div>
          <div className="space-y-1.5">
            {needsAttention.length === 0 ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-surface-container/30 rounded-xl p-2">
                <Icon name="check_circle" size={16} className="flex-shrink-0" />
                <span>Everything is running smoothly!</span>
              </div>
            ) : (
              needsAttention.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs font-medium text-on-surface bg-surface-container/30 rounded-xl p-2">
                  <Icon name={item.icon} size={16} className="text-amber-400 flex-shrink-0" />
                  <span className="truncate">{item.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
