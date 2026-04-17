import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData, rolloverRecurringTasks } from '../db/database';

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

const RECURRING_LABELS = {
  none:     'Once',
  daily:    'Daily',
  weekly:   'Weekly',
  weekdays: 'Weekdays',
};

const EMPTY_FORM = { title: '', duration: 30, priority: 'medium', scheduledTime: '', recurring: 'none', dueDate: getTodayStr() };

function TaskCard({ task, onToggle, onDelete, onPostpone, onEdit }) {
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
            task.completed ? 'bg-primary border-primary text-white' : 'border-outline-variant hover:border-primary'
          )}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Icon name="check" size={13} filled className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="flag" size={14} filled={task.priority === 'high'}
              className={PRIORITY_ICON_COLOR[task.priority] || 'text-outline-variant'} />
            <p className={cn('font-semibold text-sm text-on-surface', task.completed && 'line-through text-outline')}>
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
            {task.recurring && task.recurring !== 'none' && (
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="repeat" size={10} />
                {RECURRING_LABELS[task.recurring]}
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
          {!task.completed && (
            <button
              onClick={() => onEdit(task, true)}
              className="text-outline-variant hover:text-primary transition-colors p-1"
              aria-label="Schedule to routine"
              title="Schedule to routine"
            >
              <Icon name="event_repeat" size={18} />
            </button>
          )}
          <button onClick={() => onEdit(task)} className="text-outline-variant hover:text-primary transition-colors p-1" aria-label="Edit task">
            <Icon name="edit" size={16} />
          </button>
          {!task.completed && onPostpone && (
            <button onClick={onPostpone} className="text-outline-variant hover:text-outline transition-colors p-1" aria-label="Postpone task">
              <Icon name="schedule" size={18} />
            </button>
          )}
          <button onClick={onDelete} className="text-outline-variant hover:text-error transition-colors p-1" aria-label="Delete task">
            <Icon name="delete" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ onSave, onClose, initialData, editId }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const today = getTodayStr();
    if (editId) {
      await db.tasks.update(editId, {
        title: form.title.trim(),
        duration: Number(form.duration),
        priority: form.priority,
        scheduledTime: form.scheduledTime,
        recurring: form.recurring,
        dueDate: form.dueDate,
      });
    } else {
      await db.tasks.add({
        date: today,
        dueDate: form.dueDate || today,
        title: form.title.trim(),
        duration: Number(form.duration),
        priority: form.priority,
        scheduledTime: form.scheduledTime,
        postponeCount: 0,
        completed: false,
        recurring: form.recurring,
      });
    }
    onSave();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Task Name</label>
        <input className="input-pill w-full text-sm" placeholder="e.g. Deep work session"
          value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Duration (min)</label>
          <input type="number" min="5" max="480" step="5" className="input-pill w-full text-sm"
            value={form.duration} onChange={e => set('duration', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Scheduled Time</label>
          <input type="time" className="input-pill w-full text-sm"
            value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Due Date</label>
        <input type="date" className="input-pill w-full text-sm"
          value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Priority</label>
        <div className="flex gap-2">
          {['high', 'medium', 'low'].map(p => (
            <button key={p} type="button" onClick={() => set('priority', p)}
              className={cn('flex-1 py-2.5 rounded-full text-sm font-semibold capitalize transition-all active:scale-95',
                form.priority === p ? (p === 'high' ? 'bg-error text-white' : p === 'medium' ? 'bg-tertiary text-white' : 'bg-surface-container-highest text-on-surface') : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Repeat</label>
        <div className="flex gap-2">
          {Object.entries(RECURRING_LABELS).map(([val, label]) => (
            <button key={val} type="button" onClick={() => set('recurring', val)}
              className={cn('flex-1 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95',
                form.recurring === val ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:bg-surface-container-high')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full text-center">
        {editId ? 'Save Changes' : 'Add Task'}
      </button>
    </form>
  );
}

export default function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [carriedForward, setCarriedForward] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const today = getTodayStr();

  const loadTasks = async () => {
    setLoading(true);
    const [todayTasks, cfTasks] = await Promise.all([
      db.tasks.where('date').equals(today).toArray(),
      db.tasks.where('completed').equals(0).and(t => t.dueDate && t.dueDate < today && t.date !== today).toArray()
    ]);

    const sortFn = (a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    };

    setTasks(todayTasks.sort(sortFn));
    setCarriedForward(cfTasks.sort(sortFn));
    setLoading(false);
  };

  useEffect(() => {
    seedTodayData().then(async () => {
      await rolloverRecurringTasks(today);
      loadTasks();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
    loadTasks();
  };

  const handleDelete = async (task) => {
    await db.tasks.delete(task.id);
    loadTasks();
  };

  const handlePostpone = async (task) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await db.tasks.update(task.id, { 
      date: tomorrowStr,
      dueDate: tomorrowStr,
      postponeCount: (task.postponeCount || 0) + 1 
    });
    loadTasks();
  };

  const handleScheduleToRoutine = async () => {
    if (!taskToSchedule) return;
    await db.routines.add({
      date: today,
      title: taskToSchedule.title,
      start: scheduleTime,
      duration: taskToSchedule.duration,
      type: 'morning',
      completed: false,
      taskId: taskToSchedule.id,
    });
    await db.tasks.update(taskToSchedule.id, { scheduledTime: scheduleTime });
    setShowScheduleSheet(false);
    setTaskToSchedule(null);
    loadTasks();
  };

  const handleEdit = (task, scheduleDirectly = false) => {
    if (scheduleDirectly) {
      setTaskToSchedule(task);
      setShowScheduleSheet(true);
    } else {
      setEditTask(task);
    }
  };

  const incompleteToday = tasks.filter(t => !t.completed);
  const doneToday       = tasks.filter(t => t.completed);
  const focusTask       = incompleteToday[0] || carriedForward[0] || null;
  const queuedToday     = incompleteToday.slice(focusTask === incompleteToday[0] ? 1 : 0);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="pt-6 px-6 pb-6 bg-surface-container-low">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Productivity</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Tasks</h1>
          </div>
          <button onClick={() => setShowForm(true)}
            className="primary-gradient text-white text-xs font-bold rounded-full px-4 py-2 shadow-gradient active:scale-95 transition-all flex items-center gap-1.5">
            <Icon name="add" size={14} /> Add Task
          </button>
        </div>
      </div>

      {!loading && focusTask && (
        <div className="mx-4 mt-4 primary-gradient rounded-2xl p-6 text-white shadow-gradient">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Do It Now</p>
          <h3 className="text-xl font-headline font-bold mb-1">{focusTask.title}</h3>
          <p className="text-sm text-white/70 mb-4">{focusTask.duration}m &bull; {focusTask.priority} priority</p>
          <button onClick={() => handleToggle(focusTask)}
            className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-sm font-semibold rounded-full px-5 py-2">
            Mark Done
          </button>
        </div>
      )}

      <div className="mx-4 mt-4 flex gap-3">
        <div className="flex-1 bg-secondary-container/30 rounded-2xl p-4">
          <Icon name="check_circle" size={20} filled className="text-secondary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{doneToday.length}</p>
          <p className="text-xs text-outline">completed</p>
        </div>
        <div className="flex-1 bg-primary/5 rounded-2xl p-4">
          <Icon name="pending" size={20} className="text-primary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{incompleteToday.length + carriedForward.length}</p>
          <p className="text-xs text-outline">remaining</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24 space-y-6">
        {loading && <p className="text-center text-outline text-sm pt-8 animate-pulse">Loading...</p>}
        {!loading && carriedForward.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3 px-1 flex items-center gap-2">
              <Icon name="history" size={14} /> Brought Forward
            </p>
            <div className="space-y-3">
              {carriedForward.map(t => (
                <TaskCard key={t.id} task={t} onToggle={() => handleToggle(t)} onPostpone={() => handlePostpone(t)} onDelete={() => handleDelete(t)} onEdit={handleEdit} />
              ))}
            </div>
          </section>
        )}
        {!loading && (focusTask || queuedToday.length > 0) && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">Today's Queue</p>
            <div className="space-y-3">
              {focusTask && focusTask.date === today && (
                <TaskCard task={focusTask} onToggle={() => handleToggle(focusTask)} onPostpone={() => handlePostpone(focusTask)} onDelete={() => handleDelete(focusTask)} onEdit={handleEdit} />
              )}
              {queuedToday.map(t => (
                <TaskCard key={t.id} task={t} onToggle={() => handleToggle(t)} onPostpone={() => handlePostpone(t)} onDelete={() => handleDelete(t)} onEdit={handleEdit} />
              ))}
            </div>
          </section>
        )}
        {!loading && doneToday.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3 px-1">Done</p>
            <div className="space-y-3">
              {doneToday.map(t => (
                <TaskCard key={t.id} task={t} onToggle={() => handleToggle(t)} onDelete={() => handleDelete(t)} onEdit={handleEdit} />
              ))}
            </div>
          </section>
        )}
        {!loading && tasks.length === 0 && carriedForward.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-outline">
            <Icon name="check_circle" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No tasks yet.</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-primary text-sm font-semibold flex items-center gap-1">
              <Icon name="add_circle" size={16} /> Add your first task
            </button>
          </div>
        )}
      </div>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Task">
        <TaskForm onSave={loadTasks} onClose={() => setShowForm(false)} />
      </BottomSheet>

      <BottomSheet isOpen={!!editTask} onClose={() => setEditTask(null)} title="Edit Task">
        {editTask && (
          <TaskForm
            initialData={{ 
              title: editTask.title, duration: editTask.duration, priority: editTask.priority, 
              scheduledTime: editTask.scheduledTime || '', recurring: editTask.recurring || 'none',
              dueDate: editTask.dueDate || editTask.date 
            }}
            editId={editTask.id} onSave={loadTasks} onClose={() => setEditTask(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet isOpen={showScheduleSheet} onClose={() => setShowScheduleSheet(false)} title="Schedule to Routine">
        <div className="space-y-4">
          <p className="text-sm text-outline">
            Pick a time to add <strong>{taskToSchedule?.title}</strong> to today's morning routine.
          </p>
          <input type="time" className="input-pill w-full text-sm" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
          <button onClick={handleScheduleToRoutine} className="btn-primary w-full py-4 shadow-gradient font-bold">
            Confirm Schedule
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
