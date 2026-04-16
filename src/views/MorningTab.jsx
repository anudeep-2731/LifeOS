import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData } from '../db/database';

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
    return { label, isToday, isPast };
  });
};

const WEEK_DAYS = getWeekDays();
const EMPTY_FORM = { title: '', start: '07:00', duration: 30, type: 'routine' };

function RoutineCard({ routine, onToggle, onDelete }) {
  const endTime = getEndTime(routine.start, routine.duration);
  return (
    <div className={cn(
      'card-floating p-4 flex items-center gap-4 transition-all duration-300',
      routine.completed && 'opacity-50'
    )}>
      <div className={cn(
        'w-1 self-stretch rounded-full flex-shrink-0',
        routine.type === 'meal'    ? 'bg-tertiary' :
        routine.type === 'energy'  ? 'bg-secondary' : 'bg-primary',
        routine.completed && 'opacity-40'
      )} />

      <div className={cn(
        'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0',
        routine.type === 'meal'    ? 'bg-tertiary/10 text-tertiary' :
        routine.type === 'energy'  ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
      )}>
        <Icon
          name={routine.type === 'meal' ? 'restaurant' : routine.type === 'energy' ? 'bolt' : 'self_improvement'}
          size={20}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm text-on-surface truncate', routine.completed && 'line-through text-outline')}>
          {routine.title}
        </p>
        <p className="text-xs text-outline mt-0.5">
          {routine.start} &ndash; {endTime} &bull; {routine.duration}m
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            routine.completed
              ? 'bg-primary border-primary text-white'
              : 'border-outline-variant hover:border-primary'
          )}
          aria-label={routine.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {routine.completed && <Icon name="check" size={14} filled className="text-white" />}
        </button>
        <button
          onClick={onDelete}
          className="text-outline-variant hover:text-error transition-colors p-1"
          aria-label="Delete routine"
        >
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

function RoutineForm({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const today = getTodayStr();
    await db.routines.add({
      date: today,
      title: form.title.trim(),
      start: form.start,
      duration: Number(form.duration),
      type: form.type,
      completed: false,
    });
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
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

      {/* Start time + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Start Time</label>
          <input
            type="time"
            className="input-pill w-full text-sm"
            value={form.start}
            onChange={e => set('start', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (min)</label>
          <input
            type="number"
            min="5" max="240" step="5"
            className="input-pill w-full text-sm"
            value={form.duration}
            onChange={e => set('duration', e.target.value)}
          />
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Type</label>
        <div className="flex gap-2">
          {[
            { value: 'routine', label: 'Routine', icon: 'self_improvement' },
            { value: 'meal',    label: 'Meal',    icon: 'restaurant'       },
            { value: 'energy',  label: 'Energy',  icon: 'bolt'             },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('type', value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95',
                form.type === value
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-outline hover:bg-surface-container-high'
              )}
            >
              <Icon name={icon} size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full text-center">
        Add Routine
      </button>
    </form>
  );
}

export default function MorningTab() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const today = getTodayStr();

  const loadRoutines = async () => {
    const data = await db.routines.where('date').equals(today).toArray();
    data.sort((a, b) => a.start.localeCompare(b.start));
    setRoutines(data);
    setLoading(false);
  };

  useEffect(() => {
    seedTodayData().then(loadRoutines);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (routine) => {
    await db.routines.update(routine.id, { completed: !routine.completed });
    loadRoutines();
  };

  const handleDelete = async (routine) => {
    await db.routines.delete(routine.id);
    loadRoutines();
  };

  const completedCount = routines.filter(r => r.completed).length;
  const streak = 12;

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-6 bg-surface-container-low">
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
            <p className="text-6xl font-headline font-black leading-none">{streak}</p>
            <p className="text-sm font-semibold text-white/80 mt-1">DAYS &bull; STREAK ALIVE 🔥</p>
            <p className="text-xs text-white/60 mt-1">Keep going — you&apos;re on fire!</p>
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
          {WEEK_DAYS.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-semibold text-outline">{day.label}</span>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                day.isToday ? 'bg-primary text-white ring-2 ring-primary/30' :
                day.isPast  ? 'bg-secondary text-white' :
                              'bg-surface-container text-outline-variant'
              )}>
                {day.isPast ? <Icon name="check" size={14} className="text-white" /> : (day.isToday ? '●' : '')}
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
          <p className="text-2xl font-headline font-bold text-on-surface">07:00</p>
          <span className="inline-block text-[10px] font-bold text-secondary bg-secondary/10 rounded-full px-2 py-0.5 mt-1">On time</span>
        </div>
      </div>

      {/* Routine checklist */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant px-1 mb-3">Morning Checklist</p>

        {loading && <p className="text-center text-outline text-sm pt-8">Loading...</p>}

        <div className="space-y-3">
          {routines.map(r => (
            <RoutineCard key={r.id} routine={r} onToggle={() => handleToggle(r)} onDelete={() => handleDelete(r)} />
          ))}
        </div>

        {!loading && routines.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="self_improvement" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No routines yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary text-sm font-semibold flex items-center gap-1"
            >
              <Icon name="add_circle" size={16} className="text-primary" /> Add your first routine
            </button>
          </div>
        )}
      </div>

      {/* Bottom sheet form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Routine">
        <RoutineForm onSave={loadRoutines} onClose={() => setShowForm(false)} />
      </BottomSheet>
    </div>
  );
}
