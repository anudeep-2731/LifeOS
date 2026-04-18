import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData, computeStreak, rolloverHabitTemplates, giftXP, updateLastRoutineCompletion } from '../db/database';
import { scheduleNotifications } from '../lib/notifications';
import StatsHeader from '../components/ui/StatsHeader';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
};

const getEndTime = (start, durationMins) => {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const getWeekDays = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const label = ['M','T','W','T','F','S','S'][i];
    const isToday = d.toDateString() === today.toDateString();
    const isPast  = d < today && !isToday;
    return { label, isToday, isPast, dateStr: toDateStr(d) };
  });
};

const EMPTY_FORM = { title: '', start: '07:00', duration: 30, type: 'routine' };
const EMPTY_TEMPLATE_FORM = { title: '', startTime: '07:00', duration: 30, type: 'routine' };

// ─── RoutineForm ──────────────────────────────────────────────────────────────

function RoutineForm({ onSave, onClose, initialData, editId }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const today = getTodayStr();
    if (editId) {
      await db.routines.update(editId, {
        title: form.title.trim(),
        start: form.start,
        duration: Number(form.duration),
        type: form.type,
      });
    } else {
      await db.routines.add({
        date: today,
        title: form.title.trim(),
        start: form.start,
        duration: Number(form.duration),
        type: form.type,
        completed: false,
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Routine Name</label>
        <input
          className="input-pill w-full text-sm"
          placeholder="e.g. Meditate, Gym, Morning walk"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Start Time</label>
          <input type="time" className="input-pill w-full text-sm" value={form.start} onChange={e => set('start', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (min)</label>
          <input type="number" min="5" max="240" step="5" className="input-pill w-full text-sm" value={form.duration} onChange={e => set('duration', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Type</label>
        <div className="flex gap-2">
          {[
            { value: 'routine', label: 'Routine', icon: 'self_improvement' },
            { value: 'meal',    label: 'Meal',    icon: 'restaurant'       },
            { value: 'energy',  label: 'Energy',  icon: 'bolt'             },
          ].map(({ value, label, icon }) => (
            <button key={value} type="button" onClick={() => set('type', value)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95',
                form.type === value ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
              <Icon name={icon} size={18} />{label}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full text-center">
        {editId ? 'Save Changes' : 'Add Routine'}
      </button>
    </form>
  );
}

// ─── TemplateForm ─────────────────────────────────────────────────────────────

function TemplateForm({ onSave, onClose, initialData, editId }) {
  const [form, setForm] = useState(initialData || EMPTY_TEMPLATE_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editId) {
      await db.habitTemplates.update(editId, {
        title: form.title.trim(),
        startTime: form.startTime,
        duration: Number(form.duration),
        type: form.type,
      });
    } else {
      await db.habitTemplates.add({
        title: form.title.trim(),
        startTime: form.startTime,
        duration: Number(form.duration),
        type: form.type,
        active: 1,
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-secondary/5 rounded-2xl p-3 border border-secondary/20">
        <p className="text-xs text-secondary font-semibold flex items-center gap-1.5">
          <Icon name="info" size={14} />
          Templates auto-create routines every morning
        </p>
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Habit Name</label>
        <input className="input-pill w-full text-sm" placeholder="e.g. Meditate, Gym, Journaling"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Start Time</label>
          <input type="time" className="input-pill w-full text-sm" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (min)</label>
          <input type="number" min="5" max="240" step="5" className="input-pill w-full text-sm" value={form.duration} onChange={e => set('duration', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Type</label>
        <div className="flex gap-2">
          {[
            { value: 'routine', label: 'Routine', icon: 'self_improvement' },
            { value: 'meal',    label: 'Meal',    icon: 'restaurant'       },
            { value: 'energy',  label: 'Energy',  icon: 'bolt'             },
          ].map(({ value, label, icon }) => (
            <button key={value} type="button" onClick={() => set('type', value)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95',
                form.type === value ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
              <Icon name={icon} size={18} />{label}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full text-center">
        {editId ? 'Save Changes' : 'Add Template'}
      </button>
    </form>
  );
}

// ─── RoutineCard ──────────────────────────────────────────────────────────────

function RoutineCard({ routine, onToggle, onDelete, onEdit }) {
  const endTime = getEndTime(routine.start, routine.duration);
  return (
    <div className={cn('card-floating p-4 flex items-center gap-4 transition-all duration-300', routine.completed && 'opacity-50')}>
      <div className={cn('w-1 self-stretch rounded-full flex-shrink-0',
        routine.type === 'meal' ? 'bg-tertiary' : routine.type === 'energy' ? 'bg-secondary' : 'bg-primary',
        routine.completed && 'opacity-40'
      )} />
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0',
        routine.type === 'meal' ? 'bg-tertiary/10 text-tertiary' :
        routine.type === 'energy' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary')}>
        <Icon name={routine.type === 'meal' ? 'restaurant' : routine.type === 'energy' ? 'bolt' : 'self_improvement'} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm text-on-surface truncate', routine.completed && 'line-through text-outline')}>
          {routine.title}
        </p>
        <p className="text-xs text-outline mt-0.5">{routine.start} &ndash; {endTime} &bull; {routine.duration}m</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="text-outline-variant hover:text-primary transition-colors p-1" aria-label="Edit routine">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={onToggle}
          className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            routine.completed ? 'bg-primary border-primary text-white' : 'border-outline-variant hover:border-primary')}
          aria-label={routine.completed ? 'Mark incomplete' : 'Mark complete'}>
          {routine.completed && <Icon name="check" size={14} filled className="text-white" />}
        </button>
        <button onClick={onDelete} className="text-outline-variant hover:text-error transition-colors p-1" aria-label="Delete routine">
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── MorningTab ───────────────────────────────────────────────────────────────

export default function MorningTab() {
  const [routines, setRoutines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editRoutine, setEditRoutine] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [streak, setStreak] = useState(null);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [weekDays, setWeekDays] = useState([]);
  const today = getTodayStr();

  const loadWeekDays = async () => {
    const days = getWeekDays();
    const pastDates = days.filter(d => d.isPast).map(d => d.dateStr);
    const completionMap = {};
    if (pastDates.length) {
      const recs = await db.routines.where('date').anyOf(pastDates).toArray();
      for (const date of pastDates) {
        const dayRecs = recs.filter(r => r.date === date);
        completionMap[date] = dayRecs.length > 0 && dayRecs.every(r => r.completed);
      }
    }
    setWeekDays(days.map(d => ({ ...d, allDone: completionMap[d.dateStr] || false })));
  };

  const loadRoutines = async () => {
    const data = await db.routines.where('date').equals(today).toArray();
    data.sort((a, b) => a.start.localeCompare(b.start));
    setRoutines(data);
    setLoading(false);
    scheduleNotifications(data);
  };

  const loadTemplates = async () => {
    const data = await db.habitTemplates.toArray();
    setTemplates(data);
  };

  const loadStreak = async () => {
    const s = await computeStreak();
    setStreak(s);
  };

  const loadWakeTime = async () => {
    const saved = await db.settings.get('wakeTime');
    if (saved) setWakeTime(saved.value);
  };

  useEffect(() => {
    seedTodayData().then(async () => {
      await rolloverHabitTemplates(today);
      await Promise.all([loadRoutines(), loadTemplates(), loadStreak(), loadWakeTime(), loadWeekDays()]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (routine) => {
    const isCompleting = !routine.completed;
    await db.routines.update(routine.id, { completed: isCompleting });
    
    if (isCompleting) {
      await giftXP(25, `Routine: ${routine.title}`);
      await updateLastRoutineCompletion(); // Start synergy window
    }
    
    loadRoutines();
    loadStreak();
  };

  const handleDelete = async (routine) => {
    await db.routines.delete(routine.id);
    loadRoutines();
  };

  const handleDeleteTemplate = async (tmpl) => {
    await db.habitTemplates.delete(tmpl.id);
    loadTemplates();
  };

  const handleToggleTemplate = async (tmpl) => {
    await db.habitTemplates.update(tmpl.id, { active: tmpl.active ? 0 : 1 });
    loadTemplates();
  };

  const handleWakeTimeSave = async (val) => {
    setWakeTime(val);
    await db.settings.put({ key: 'wakeTime', value: val });
  };

  const completedCount = routines.filter(r => r.completed).length;

  return (
    <div className="flex flex-col min-h-screen">
      <StatsHeader />

      {/* Header */}
      <div className="pt-4 px-6 pb-6 bg-surface-container-low">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Morning Routine</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">{getGreeting()}</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="add" size={14} className="text-white" />
            Add
          </button>
        </div>
      </div>

      {/* Streak card */}
      <div className="mx-4 mt-4 primary-gradient rounded-2xl p-6 text-white shadow-gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Current Streak</p>
            <p className="text-6xl font-headline font-black leading-none">{streak === null ? '—' : streak}</p>
            <p className="text-sm font-semibold text-white/80 mt-1">DAYS {streak > 0 ? '• STREAK ALIVE 🔥' : '• START TODAY'}</p>
            <p className="text-xs text-white/60 mt-1">{streak > 0 ? "Keep going — you're on fire!" : 'Complete all routines to start your streak.'}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Icon name="local_fire_department" size={36} filled className="text-tertiary-fixed-dim" />
          </div>
        </div>
      </div>

      {/* 7-day calendar */}
      <div className="mx-4 mt-4 card-floating p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3">This Week</p>
        <div className="flex justify-between">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-semibold text-outline">{day.label}</span>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                day.isToday ? 'bg-primary text-white ring-2 ring-primary/30' :
                day.allDone ? 'bg-secondary text-white' :
                day.isPast  ? 'bg-surface-container-high text-outline-variant' :
                              'bg-surface-container text-outline-variant'
              )}>
                {day.allDone ? <Icon name="check" size={14} className="text-white" /> : (day.isToday ? '●' : '')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress summary */}
      <div className="mx-4 mt-4 flex gap-3">
        <div className="flex-1 card-floating p-4">
          <p className="text-xs text-outline mb-1">Completed</p>
          <p className="text-2xl font-headline font-bold text-secondary">{completedCount}</p>
          <p className="text-xs text-outline">of {routines.length} routines</p>
        </div>
        <div className="flex-1 card-floating p-4">
          <p className="text-xs text-outline mb-1">Wake Time</p>
          <input
            type="time"
            value={wakeTime}
            onChange={e => handleWakeTimeSave(e.target.value)}
            className="text-2xl font-headline font-bold text-on-surface bg-transparent focus:outline-none w-full"
          />
          <span className="inline-block text-[10px] font-bold text-secondary bg-secondary/10 rounded-full px-2 py-0.5 mt-1">
            Tap to edit
          </span>
        </div>
      </div>

      {/* Routine checklist */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant px-1 mb-3">Morning Checklist</p>

        {loading && <p className="text-center text-outline text-sm pt-8">Loading...</p>}

        <div className="space-y-3">
          {routines.map(r => (
            <RoutineCard
              key={r.id}
              routine={r}
              onToggle={() => handleToggle(r)}
              onDelete={() => handleDelete(r)}
              onEdit={() => setEditRoutine(r)}
            />
          ))}
        </div>

        {!loading && routines.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="self_improvement" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No routines yet.</p>
            <p className="text-xs mt-1 text-center">Add a habit template below to auto-fill every morning.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary text-sm font-semibold flex items-center gap-1"
            >
              <Icon name="add_circle" size={16} className="text-primary" /> Add today's routine
            </button>
          </div>
        )}

        {/* Habit Templates section */}
        <div className="mt-8">
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="flex items-center justify-between w-full px-1 mb-3"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-outline-variant">Habit Templates</span>
            <Icon name={showTemplates ? 'expand_less' : 'expand_more'} size={18} className="text-outline-variant" />
          </button>

          {showTemplates && (
            <div className="space-y-2">
              <p className="text-[11px] text-outline px-1 mb-2">Templates are added to your checklist automatically each morning.</p>
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-3 card-floating p-3">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                    t.type === 'meal' ? 'bg-tertiary/10 text-tertiary' :
                    t.type === 'energy' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary')}>
                    <Icon name={t.type === 'meal' ? 'restaurant' : t.type === 'energy' ? 'bolt' : 'self_improvement'} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold text-on-surface truncate', !t.active && 'text-outline line-through')}>{t.title}</p>
                    <p className="text-xs text-outline">{t.startTime} &bull; {t.duration}m</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleTemplate(t)}
                      className={cn('text-xs font-bold px-2 py-1 rounded-full transition-all',
                        t.active ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-outline')}>
                      {t.active ? 'On' : 'Off'}
                    </button>
                    <button onClick={() => setEditTemplate(t)} className="text-outline-variant hover:text-primary p-1">
                      <Icon name="edit" size={15} />
                    </button>
                    <button onClick={() => handleDeleteTemplate(t)} className="text-outline-variant hover:text-error p-1">
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowTemplateForm(true)}
                className="flex items-center gap-2 w-full p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-primary text-sm font-semibold transition-all"
              >
                <Icon name="add_circle" size={16} className="text-primary" />
                Add habit template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheets */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Routine">
        <RoutineForm onSave={loadRoutines} onClose={() => setShowForm(false)} />
      </BottomSheet>

      <BottomSheet
        isOpen={!!editRoutine}
        onClose={() => setEditRoutine(null)}
        title="Edit Routine"
      >
        {editRoutine && (
          <RoutineForm
            initialData={{ title: editRoutine.title, start: editRoutine.start, duration: editRoutine.duration, type: editRoutine.type }}
            editId={editRoutine.id}
            onSave={loadRoutines}
            onClose={() => setEditRoutine(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet isOpen={showTemplateForm} onClose={() => setShowTemplateForm(false)} title="New Habit Template">
        <TemplateForm onSave={loadTemplates} onClose={() => setShowTemplateForm(false)} />
      </BottomSheet>

      <BottomSheet
        isOpen={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        title="Edit Template"
      >
        {editTemplate && (
          <TemplateForm
            initialData={{ title: editTemplate.title, startTime: editTemplate.startTime, duration: editTemplate.duration, type: editTemplate.type }}
            editId={editTemplate.id}
            onSave={loadTemplates}
            onClose={() => setEditTemplate(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
