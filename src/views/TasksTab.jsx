import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData } from '../db/database';

const PRIORITY_BORDER = {
  high:   'border-error',
  medium: 'border-tertiary-fixed-dim',
  low:    'border-outline-variant/30',
};

const PRIORITY_ICON_COLOR = {
  high:   'text-error',
  medium: 'text-tertiary',
  low:    'text-outline-variant',
};

const EMPTY_FORM = { title: '', duration: 30, priority: 'medium', scheduledTime: '' };

function TaskCard({ task, onToggle, onDelete, onPostpone }) {
  return (
    <div className={cn(
      'bg-surface-container-lowest rounded-2xl p-5 border-l-4 shadow-card transition-all duration-300',
      PRIORITY_BORDER[task.priority] || 'border-outline-variant/30',
      task.completed && 'opacity-50'
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={cn(
            'mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200',
            task.completed
              ? 'bg-primary border-primary text-white'
              : 'border-outline-variant hover:border-primary'
          )}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Icon name="check" size={13} filled className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon
              name="flag"
              size={14}
              filled={task.priority === 'high'}
              className={PRIORITY_ICON_COLOR[task.priority] || 'text-outline-variant'}
            />
            <p className={cn(
              'font-semibold text-sm text-on-surface',
              task.completed && 'line-through text-outline'
            )}>
              {task.title}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-outline bg-surface-container px-2.5 py-0.5 rounded-full">
              {task.duration}m
            </span>
            {task.scheduledTime && (
              <span className="text-[11px] font-medium text-outline bg-surface-container px-2.5 py-0.5 rounded-full">
                {task.scheduledTime}
              </span>
            )}
            {task.postponeCount >= 3 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-on-tertiary-fixed bg-tertiary-fixed px-2 py-0.5 rounded-full">
                <Icon name="warning" size={10} />
                {task.postponeCount}x postponed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!task.completed && onPostpone && (
            <button
              onClick={onPostpone}
              className="text-outline-variant hover:text-outline transition-colors p-1"
              aria-label="Postpone task"
            >
              <Icon name="schedule" size={18} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-outline-variant hover:text-error transition-colors p-1"
            aria-label="Delete task"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const today = getTodayStr();
    await db.tasks.add({
      date: today,
      title: form.title.trim(),
      duration: Number(form.duration),
      priority: form.priority,
      scheduledTime: form.scheduledTime,
      postponeCount: 0,
      completed: false,
    });
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Task Name</label>
        <input
          className="input-pill w-full text-sm"
          placeholder="e.g. Deep work session"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Duration + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (min)</label>
          <input
            type="number"
            min="5" max="480" step="5"
            className="input-pill w-full text-sm"
            value={form.duration}
            onChange={e => set('duration', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Scheduled Time</label>
          <input
            type="time"
            className="input-pill w-full text-sm"
            value={form.scheduledTime}
            onChange={e => set('scheduledTime', e.target.value)}
          />
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Priority</label>
        <div className="flex gap-2">
          {['high', 'medium', 'low'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => set('priority', p)}
              className={cn(
                'flex-1 py-2.5 rounded-full text-sm font-semibold capitalize transition-all active:scale-95',
                form.priority === p
                  ? p === 'high'   ? 'bg-error text-white'
                  : p === 'medium' ? 'bg-tertiary text-white'
                  :                  'bg-surface-container-highest text-on-surface'
                  : 'bg-surface-container text-outline hover:bg-surface-container-high'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full text-center">
        Add Task
      </button>
    </form>
  );
}

export default function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const today = getTodayStr();

  const loadTasks = async () => {
    const data = await db.tasks.where('date').equals(today).toArray();
    data.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    });
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    seedTodayData().then(loadTasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
    loadTasks();
  };

  const handlePostpone = async (task) => {
    await db.tasks.update(task.id, { postponeCount: task.postponeCount + 1 });
    loadTasks();
  };

  const handleDelete = async (task) => {
    await db.tasks.delete(task.id);
    loadTasks();
  };

  const incomplete = tasks.filter(t => !t.completed);
  const done       = tasks.filter(t => t.completed);
  const focusTask  = incomplete[0] || null;
  const queued     = incomplete.slice(1);

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-6 bg-surface-container-low">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Productivity</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Tasks</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="add" size={14} className="text-white" />
            Add Task
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="bg-primary text-white text-xs font-semibold rounded-full px-3 py-1">Today</span>
          <span className="bg-surface-container text-outline text-xs font-semibold rounded-full px-3 py-1">Time Blocking</span>
        </div>
      </div>

      {/* Do It Now gradient card */}
      {!loading && focusTask && (
        <div className="mx-4 mt-4 primary-gradient rounded-2xl p-6 text-white shadow-gradient">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Do It Now</p>
          <h3 className="text-xl font-headline font-bold mb-1">{focusTask.title}</h3>
          <p className="text-sm text-white/70 mb-4">{focusTask.duration}m &bull; {focusTask.priority} priority</p>
          <button
            onClick={() => handleToggle(focusTask)}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-sm font-semibold rounded-full px-5 py-2"
          >
            Mark Done
          </button>
        </div>
      )}

      {/* Progress bento */}
      <div className="mx-4 mt-4 flex gap-3">
        <div className="flex-1 bg-secondary-container/30 rounded-2xl p-4">
          <Icon name="check_circle" size={20} filled className="text-secondary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{done.length}</p>
          <p className="text-xs text-outline">completed</p>
        </div>
        <div className="flex-1 bg-primary/5 rounded-2xl p-4">
          <Icon name="pending" size={20} className="text-primary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{incomplete.length}</p>
          <p className="text-xs text-outline">remaining</p>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 px-4 pt-4 pb-4 space-y-6">
        {loading && <p className="text-center text-outline text-sm pt-8">Loading...</p>}

        {!loading && queued.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">Queued</p>
            <div className="space-y-3">
              {queued.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={() => handleToggle(t)}
                  onPostpone={() => handlePostpone(t)}
                  onDelete={() => handleDelete(t)}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && done.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">Done</p>
            <div className="space-y-3">
              {done.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={() => handleToggle(t)}
                  onDelete={() => handleDelete(t)}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="check_circle" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No tasks yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary text-sm font-semibold flex items-center gap-1"
            >
              <Icon name="add_circle" size={16} className="text-primary" /> Add your first task
            </button>
          </div>
        )}
      </div>

      {/* Bottom sheet form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Task">
        <TaskForm onSave={loadTasks} onClose={() => setShowForm(false)} />
      </BottomSheet>
    </div>
  );
}
