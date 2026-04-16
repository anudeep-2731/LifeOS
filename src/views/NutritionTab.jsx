import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import {
  db, getTodayStr, seedTodayData,
  getWeekStart, getWeekDates, getTodayWeekIndex,
  generateWeeklySchedule,
} from '../db/database';

// ─── Color palette (6 keys cycling across categories) ────────────────────────
const COLORS = [
  { bg: 'bg-primary/10',              text: 'text-primary',   ring: 'ring-primary',   fill: 'bg-primary'   },
  { bg: 'bg-secondary/10',            text: 'text-secondary', ring: 'ring-secondary', fill: 'bg-secondary' },
  { bg: 'bg-tertiary/10',             text: 'text-tertiary',  ring: 'ring-tertiary',  fill: 'bg-tertiary'  },
  { bg: 'bg-primary/10',              text: 'text-primary',   ring: 'ring-primary',   fill: 'bg-primary'   },
  { bg: 'bg-tertiary-fixed/40',       text: 'text-tertiary',  ring: 'ring-tertiary',  fill: 'bg-tertiary-fixed-dim' },
  { bg: 'bg-secondary-container/40',  text: 'text-secondary', ring: 'ring-secondary', fill: 'bg-secondary' },
];
const color = (key) => COLORS[(key || 0) % COLORS.length];

const FREQ_LABELS = { daily: 'Daily', '5x': '5×/wk', '4x': '4×/wk', '3x': '3×/wk', '2x': '2×/wk', '1x': '1×/wk' };
const FREQ_OPTIONS = ['daily', '5x', '4x', '3x', '2x', '1x'];

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── NutritionCard ────────────────────────────────────────────────────────────
function NutritionCard({ category, checked, onCheck }) {
  const c = color(category.colorKey);
  const foods = category.userFoods || category.examples;

  return (
    <button
      onClick={onCheck}
      className={cn(
        'w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98]',
        checked
          ? 'bg-surface-container opacity-60'
          : 'bg-surface-container-lowest shadow-card'
      )}
    >
      {/* Color dot / check */}
      <div className={cn(
        'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
        checked ? 'bg-secondary/20' : c.bg
      )}>
        {checked
          ? <Icon name="check_circle" size={22} filled className="text-secondary" />
          : <Icon name="nutrition" size={22} className={c.text} />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn('font-semibold text-sm text-on-surface', checked && 'line-through text-outline')}>
            {category.name}
          </p>
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            checked ? 'bg-secondary/10 text-secondary' : `${c.bg} ${c.text}`
          )}>
            {FREQ_LABELS[category.userFrequency || category.frequency]}
          </span>
        </div>
        <p className="text-xs text-outline truncate">{foods}</p>
        {category.portion && (
          <p className="text-[10px] text-outline-variant mt-0.5">{category.portion}</p>
        )}
      </div>

      {/* Check indicator */}
      <div className={cn(
        'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
        checked ? 'bg-secondary border-secondary' : 'border-outline-variant'
      )}>
        {checked && <Icon name="check" size={13} className="text-white" />}
      </div>
    </button>
  );
}

// ─── EditCategorySheet ────────────────────────────────────────────────────────
function EditCategorySheet({ category, onSave, onClose }) {
  const [userFoods, setUserFoods] = useState(category?.userFoods || '');
  const [userFrequency, setUserFrequency] = useState(category?.userFrequency || category?.frequency || 'daily');

  useEffect(() => {
    if (category) {
      setUserFoods(category.userFoods || '');
      setUserFrequency(category.userFrequency || category.frequency || 'daily');
    }
  }, [category]);

  const handleSave = async () => {
    await db.nutritionCategories.update(category.id, { userFoods, userFrequency });
    onSave();
    onClose();
  };

  if (!category) return null;

  return (
    <div className="space-y-5">
      {/* Why this matters */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
        <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5">
          <Icon name="science" size={13} /> Why this matters
        </p>
        <p className="text-xs text-outline leading-relaxed">{category.why}</p>
      </div>

      {/* My foods */}
      <div>
        <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-1.5">
          My foods for this group
        </label>
        <textarea
          className="input-pill w-full text-sm resize-none"
          rows={2}
          placeholder={category.examples}
          value={userFoods}
          onChange={e => setUserFoods(e.target.value)}
        />
        <p className="text-[11px] text-outline mt-1 ml-1">
          These appear as your daily reminder. Leave blank to use defaults.
        </p>
      </div>

      {/* Frequency */}
      <div>
        <label className="text-xs font-bold text-outline uppercase tracking-wider block mb-2">
          Realistic for me
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FREQ_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setUserFrequency(f)}
              className={cn(
                'py-2.5 rounded-full text-xs font-bold transition-all active:scale-95',
                userFrequency === f ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high'
              )}
            >
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-outline mt-2 ml-1">
          Default: {FREQ_LABELS[category.frequency]} — adjust to what you'll actually stick to.
        </p>
      </div>

      <button onClick={handleSave} className="btn-primary w-full">Save</button>
    </div>
  );
}

// ─── ManageCategoriesSheet ────────────────────────────────────────────────────
function ManageCategoriesSheet({ categories, onRefresh, onClose }) {
  const [editTarget, setEditTarget] = useState(null);

  const handleToggle = async (cat) => {
    await db.nutritionCategories.update(cat.id, { active: cat.active ? 0 : 1 });
    onRefresh();
  };

  const handleEditSave = async () => {
    await onRefresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-outline leading-relaxed">
        Toggle groups on/off, and tap edit to set your personal foods &amp; realistic frequency.
        The weekly schedule regenerates whenever you change these.
      </p>

      {categories.map(cat => {
        const c = color(cat.colorKey);
        return (
          <div key={cat.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', c.bg)}>
              <Icon name="nutrition" size={18} className={c.text} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold text-on-surface', !cat.active && 'text-outline line-through')}>
                {cat.name}
              </p>
              <p className="text-[10px] text-outline">
                {FREQ_LABELS[cat.userFrequency || cat.frequency]}
                {cat.userFoods && ' · personalised'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setEditTarget(cat)}
                className="text-outline-variant hover:text-primary p-1.5 transition-colors"
                aria-label="Edit"
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                onClick={() => handleToggle(cat)}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-full transition-all',
                  cat.active
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-surface-container-high text-outline'
                )}
              >
                {cat.active ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        );
      })}

      {/* Edit sheet stacked inside manage sheet */}
      <BottomSheet
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit · ${editTarget?.name}`}
      >
        <EditCategorySheet
          category={editTarget}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      </BottomSheet>
    </div>
  );
}

// ─── NutritionTab ─────────────────────────────────────────────────────────────
export default function NutritionTab() {
  const [categories, setCategories] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({}); // categoryId → assignedDays[]
  const [logs, setLogs] = useState(new Set());         // Set of categoryIds logged on selectedDay
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getTodayStr());
  const [weeklyLogCount, setWeeklyLogCount] = useState(0);
  const [weeklySlotCount, setWeeklySlotCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);

  const today = getTodayStr();
  const weekStart = getWeekStart(today);

  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async (regenerate = false) => {
    setLoading(true);
    await seedTodayData();

    if (regenerate) {
      await generateWeeklySchedule(weekStart, { reshuffle: true });
    } else {
      await generateWeeklySchedule(weekStart);
    }

    const [cats, scheduleRows] = await Promise.all([
      db.nutritionCategories.orderBy('order').toArray(),
      db.weeklySchedule.where('weekStart').equals(weekStart).toArray(),
    ]);

    setCategories(cats);
    setWeekDates(getWeekDates(today));

    // Build scheduleMap: categoryId → assignedDays[]
    const sm = {};
    for (const row of scheduleRows) sm[row.categoryId] = row.assignedDays || [];
    setScheduleMap(sm);

    await loadDayLogs(selectedDay);
    await loadWeeklyStats(cats, sm);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, selectedDay]);

  const loadDayLogs = async (dateStr) => {
    const dayLogs = await db.nutritionLogs.where('date').equals(dateStr).toArray();
    setLogs(new Set(dayLogs.map(l => l.categoryId)));
  };

  const loadWeeklyStats = async (cats, sm) => {
    const dates = getWeekDates(today);
    const todayIdx = getTodayWeekIndex(today);

    // Count scheduled slots up to today (inclusive)
    let slots = 0;
    for (const cat of cats) {
      if (!cat.active) continue;
      const days = sm[cat.id] || [];
      slots += days.filter(d => d <= todayIdx).length;
    }

    // Count all logs this week up to today
    const weekLogs = await db.nutritionLogs
      .filter(l => dates.slice(0, todayIdx + 1).includes(l.date))
      .count();

    setWeeklySlotCount(slots);
    setWeeklyLogCount(weekLogs);
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDayLogs(selectedDay); }, [selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check-in toggle ──────────────────────────────────────────────────────
  const handleCheck = async (categoryId) => {
    const already = logs.has(categoryId);
    if (already) {
      await db.nutritionLogs
        .filter(l => l.date === selectedDay && l.categoryId === categoryId)
        .delete();
    } else {
      await db.nutritionLogs.add({ date: selectedDay, categoryId });
    }
    await loadDayLogs(selectedDay);
    await loadWeeklyStats(categories, scheduleMap);
  };

  // ── Derive today's checklist ─────────────────────────────────────────────
  const selectedDayIdx = getTodayWeekIndex(selectedDay);
  const isSelectedToday = selectedDay === today;

  const assignedCategories = categories.filter(cat => {
    if (!cat.active) return false;
    const days = scheduleMap[cat.id] || [];
    return days.includes(selectedDayIdx);
  });

  const notAssignedActive = categories.filter(cat => {
    if (!cat.active) return false;
    const days = scheduleMap[cat.id] || [];
    return !days.includes(selectedDayIdx);
  });

  const checkedToday = assignedCategories.filter(c => logs.has(c.id)).length;
  const todayPct = assignedCategories.length
    ? Math.round((checkedToday / assignedCategories.length) * 100)
    : 0;

  const weeklyPct = weeklySlotCount > 0
    ? Math.round((weeklyLogCount / weeklySlotCount) * 100)
    : 0;

  // ── Manage sheet handlers ────────────────────────────────────────────────
  const handleManageClose = async () => {
    setShowManage(false);
    // Regenerate schedule since frequencies/active state may have changed
    await generateWeeklySchedule(weekStart, { reshuffle: false });
    await loadAll();
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-4 bg-surface-container-low">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Nutrition</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Food Groups</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAll(true)}
              className="flex items-center gap-1.5 bg-surface-container text-outline text-xs font-semibold rounded-full px-3 py-2 hover:bg-surface-container-high transition-all active:scale-95"
              title="Reshuffle this week's schedule"
            >
              <Icon name="shuffle" size={14} />
              Reshuffle
            </button>
            <button
              onClick={() => setShowManage(true)}
              className="flex items-center gap-1.5 primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all"
            >
              <Icon name="tune" size={14} />
              Manage
            </button>
          </div>
        </div>

        {/* Week day chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {weekDates.map((date, i) => {
            const isActive = date === selectedDay;
            const isTodayDate = date === today;
            const dayIdx = i; // 0=Mon
            const dayLogs = categories.filter(c => {
              const days = scheduleMap[c.id] || [];
              return c.active && days.includes(dayIdx);
            });
            const isPast = date < today;
            return (
              <button
                key={date}
                onClick={() => setSelectedDay(date)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[10px] font-bold transition-all flex-shrink-0',
                  isActive
                    ? 'bg-primary text-white'
                    : isTodayDate
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container text-outline hover:bg-surface-container-high'
                )}
              >
                <span>{SHORT_DAYS[i]}</span>
                <span className={cn('text-[9px]', isActive ? 'opacity-80' : 'opacity-60')}>
                  {dayLogs.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Score cards */}
      <div className="mx-4 mt-4 flex gap-3">
        {/* Today progress */}
        <div className="flex-1 card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="today" size={16} className="text-primary" />
            <span className="text-xs font-semibold text-outline">
              {isSelectedToday ? 'Today' : selectedDay.slice(5)}
            </span>
          </div>
          <p className="text-3xl font-headline font-bold text-on-surface">
            {checkedToday}<span className="text-lg text-outline">/{assignedCategories.length}</span>
          </p>
          <div className="w-full h-1.5 bg-outline-variant/20 rounded-full overflow-hidden mt-2">
            <div
              className={cn('h-full rounded-full transition-all', todayPct === 100 ? 'bg-secondary' : 'bg-primary')}
              style={{ width: `${todayPct}%` }}
            />
          </div>
        </div>

        {/* Week progress */}
        <div className="flex-1 card-floating p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="calendar_month" size={16} className="text-secondary" />
            <span className="text-xs font-semibold text-outline">This Week</span>
          </div>
          <p className="text-3xl font-headline font-bold text-on-surface">
            {weeklyPct}<span className="text-lg text-outline">%</span>
          </p>
          <p className="text-xs text-outline mt-1">
            {weeklyLogCount} of {weeklySlotCount} slots done
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex-1 px-4 pt-4 pb-28 space-y-3">
        {loading && (
          <p className="text-center text-outline text-sm pt-12 animate-pulse">Building your board…</p>
        )}

        {!loading && assignedCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="event_available" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Nothing scheduled for this day.</p>
            <p className="text-xs mt-1 text-center">
              Tap <strong>Manage</strong> to adjust your categories and frequencies.
            </p>
          </div>
        )}

        {/* Assigned items */}
        {!loading && assignedCategories.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant px-1">
              {isSelectedToday ? "Today's groups" : SHORT_DAYS[getTodayWeekIndex(selectedDay)] + "'s groups"}
              {todayPct === 100 && (
                <span className="ml-2 text-secondary normal-case font-semibold">All done!</span>
              )}
            </p>

            {/* Sort: unchecked first */}
            {[...assignedCategories]
              .sort((a, b) => {
                const aC = logs.has(a.id) ? 1 : 0;
                const bC = logs.has(b.id) ? 1 : 0;
                return aC - bC;
              })
              .map(cat => (
                <NutritionCard
                  key={cat.id}
                  category={cat}
                  checked={logs.has(cat.id)}
                  onCheck={() => handleCheck(cat.id)}
                />
              ))}
          </>
        )}

        {/* Not today — collapsed list */}
        {!loading && notAssignedActive.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant px-1 mb-2">
              Not scheduled today
            </p>
            <div className="flex flex-wrap gap-2">
              {notAssignedActive.map(cat => {
                const c = color(cat.colorKey);
                return (
                  <span
                    key={cat.id}
                    className={cn('text-xs font-medium px-3 py-1.5 rounded-full opacity-60', c.bg, c.text)}
                  >
                    {cat.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manage sheet */}
      <BottomSheet isOpen={showManage} onClose={handleManageClose} title="Manage Food Groups">
        <ManageCategoriesSheet
          categories={categories}
          onRefresh={loadAll}
          onClose={handleManageClose}
        />
      </BottomSheet>
    </div>
  );
}
