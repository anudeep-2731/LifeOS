import Icon from '../ui/Icon';
import BottomSheet from '../ui/BottomSheet';

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function DailyFocusBriefingModal({
  isOpen,
  onClose,
  pendingItems = [],
  monthSpent = 0,
  monthlyBudget = 30000,
  streak = 0,
}) {
  const remainingBudget = Math.max(0, monthlyBudget - monthSpent);
  
  // Calculate remaining days in month
  const now = new Date();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, totalDaysInMonth - now.getDate() + 1);
  const dailySafeLimit = Math.round(remainingBudget / daysLeft);

  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="🎯 Today's Focus & Financial Briefing">
      <div className="space-y-4 pb-6">
        <p className="text-xs text-outline">
          Executive summary for <span className="font-bold text-on-surface">{todayStr}</span>. Focus on what matters today!
        </p>

        {/* 1. Monthly Expense & Safe Pace Card */}
        <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="account_balance_wallet" size={16} /> Budget & Expense Pace
            </span>
            <span className="text-[11px] font-extrabold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">
              {daysLeft} Days Left in Month
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-surface-container-lowest/80 rounded-xl p-3 border border-outline-variant/15">
              <p className="text-[10px] text-outline font-semibold uppercase">Remaining Budget</p>
              <p className="font-headline font-black text-lg text-emerald-400 mt-0.5">{formatINR(remainingBudget)}</p>
              <p className="text-[10px] text-outline mt-0.5">of {formatINR(monthlyBudget)} limit</p>
            </div>

            <div className="bg-surface-container-lowest/80 rounded-xl p-3 border border-outline-variant/15">
              <p className="text-[10px] text-outline font-semibold uppercase">Daily Safe Pace</p>
              <p className="font-headline font-black text-lg text-primary mt-0.5">{formatINR(dailySafeLimit)} <span className="text-[10px] font-normal text-outline">/day</span></p>
              <p className="text-[10px] text-outline mt-0.5">To stay under budget</p>
            </div>
          </div>
        </div>

        {/* 2. Today's Top Agenda Items as Clean Focus Points */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/25 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="checklist" size={16} className="text-amber-500" />
              Focus Points for Today ({pendingItems.length} Remaining)
            </h4>
            {streak > 0 && (
              <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="local_fire_department" size={14} /> {streak} Day Streak
              </span>
            )}
          </div>

          {pendingItems.length === 0 ? (
            <div className="py-4 text-center text-emerald-400 font-bold text-xs bg-emerald-500/10 rounded-xl">
              ✨ All focus tasks and routines for today are completed!
            </div>
          ) : (
            <div className="relative pl-3 space-y-3 border-l-2 border-primary/20 my-1">
              {pendingItems.map((item, idx) => (
                <div key={item.id || idx} className="relative flex items-start justify-between gap-3 text-xs group">
                  {/* Bullet point marker dot */}
                  <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform" />

                  <div className="min-w-0 flex-1 pl-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-xs leading-snug">{item.title}</span>
                      {item.tag && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary uppercase tracking-tight flex-shrink-0">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    
                    {/* Full Description / Routine Details */}
                    {(item.description || item.notes) ? (
                      <p className="text-[11px] text-outline leading-relaxed font-normal whitespace-pre-line pt-0.5">
                        {item.description || item.notes}
                      </p>
                    ) : null}
                  </div>

                  {/* Scheduled Time at the end */}
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md flex-shrink-0 self-start">
                    <Icon name="schedule" size={11} />
                    <span>{item.time || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Close / Let's Crush Today Action Button */}
        <button
          onClick={onClose}
          className="btn-primary w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 primary-gradient shadow-gradient hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span>Let's Crush Today! 🚀</span>
        </button>
      </div>
    </BottomSheet>
  );
}
