import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import BottomSheet from '../components/ui/BottomSheet';
import MasterRoutineModal from '../components/ui/MasterRoutineModal';
import { getTodayStr, getWeekDates, seedTodayData } from '../db/database';
import {
  fetchCloudSchedule,
  addCloudScheduleItem,
  updateCloudScheduleItem,
  autoPopulateDailyRoutines,
  publishDailySnapshot
} from '../lib/supabase';

export default function RoutineStudioScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [routines, setRoutines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('morning');
  const [toastMsg, setToastMsg] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:30');
  const [priority, setPriority] = useState('High');
  const [isNonNegotiable, setIsNonNegotiable] = useState(true);
  const [notes, setNotes] = useState('');

  const navigate = useNavigate();
  const todayStr = getTodayStr();

  const loadSchedule = async () => {
    setLoading(true);
    await seedTodayData();
    await autoPopulateDailyRoutines(selectedDate);
    const data = await fetchCloudSchedule(selectedDate);
    setRoutines(data.routines || []);
    setTasks(data.tasks || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const allItems = [...routines.map(r => ({ ...r, itemType: 'routine' })), ...tasks.map(t => ({ ...t, itemType: 'task' }))];
  const totalCount = allItems.length;
  const completedCount = allItems.filter(i => i.completed).length;
  const velocityPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleItem = async (item) => {
    const willComplete = !item.completed;
    await updateCloudScheduleItem(item.id, { ...item, completed: willComplete });
    publishDailySnapshot(selectedDate).catch(console.error);
    showToast(willComplete ? 'Item marked complete' : 'Item reopened');
    loadSchedule();
  };

  const toggleNonNegotiable = async (item) => {
    const willBe = !item.non_negotiable;
    await updateCloudScheduleItem(item.id, { ...item, non_negotiable: willBe });
    showToast(willBe ? 'Set as Non-Negotiable' : 'Set as Flexible');
    loadSchedule();
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addCloudScheduleItem({
      title: title.trim(),
      date: selectedDate,
      dueDate: selectedDate,
      time: scheduledTime,
      priority: priority,
      non_negotiable: isNonNegotiable,
      notes: notes,
      completed: false,
      itemType: 'task',
      type: 'Work',
    });

    setShowAddModal(false);
    setTitle('');
    setNotes('');
    showToast('Routine Studio updated');
    loadSchedule();
  };

  const dateFormatted = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 select-none max-w-lg mx-auto gap-4">
      {/* 1. AGENDA & TIMELINE HEADER */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex flex-col">
            <span className="font-label text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              Agenda & Timeline
            </span>
            <h2 className="font-headline text-lg text-on-surface font-extrabold flex items-center gap-2">
              {dateFormatted}
              <span className="inline-flex w-2 h-2 rounded-full bg-secondary"></span>
            </h2>
          </div>

          <button
            onClick={() => setShowMasterModal(true)}
            className="px-3 py-1.5 rounded-full bg-surface-container-high flex items-center gap-1.5 text-primary text-xs font-label font-bold active:scale-95 transition-transform shadow-xs"
          >
            <Icon name="tune" size={16} />
            <span>Master Habits</span>
          </button>
        </div>

        {/* Daily Execution Velocity Bar */}
        <div className="bg-surface-container-lowest p-3.5 rounded-2xl shadow-sm flex flex-col gap-2 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="trending_up" size={18} className="text-secondary" />
              <span className="font-label text-xs text-on-surface font-semibold">Daily Execution Velocity</span>
            </div>
            <span className="font-label text-xs px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
              {velocityPct}% Done
            </span>
          </div>

          <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex p-0.5">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${velocityPct}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between font-body text-xs text-on-surface-variant">
            <span>{completedCount} of {totalCount} blocks marked complete</span>
            <span className="font-semibold text-primary">{Math.max(0, totalCount - completedCount)} remaining</span>
          </div>
        </div>
      </section>

      {/* 2. SEGMENTED TIME BLOCK SELECTOR TABS */}
      <div className="p-1 bg-surface-container-low rounded-2xl flex items-center gap-1 overflow-x-auto shadow-xs border border-outline-variant/20">
        {[
          { id: 'morning', icon: '🌅', label: 'Morning' },
          { id: 'afternoon', icon: '⚡', label: 'Afternoon' },
          { id: 'evening', icon: '🌙', label: 'Evening' },
          { id: 'all', icon: '📋', label: 'All Items' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-label text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. TIME-BLOCKED TASKS TIMELINE */}
      <section className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline text-base text-on-surface font-bold tracking-tight">Time-Blocked Tasks</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-primary font-label text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Icon name="add_circle" size={18} />
            <span>Add Block</span>
          </button>
        </div>

        {/* Timeline Wrapper with Stem */}
        <div className="relative pl-6 flex flex-col gap-4">
          <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-surface-container-high rounded-full"></div>

          {allItems.length === 0 ? (
            <div className="p-4 bg-surface-container-lowest rounded-[20px] text-xs text-on-surface-variant text-center border border-outline-variant/20">
              No routines or tasks scheduled for this day yet.
            </div>
          ) : (
            allItems
              .filter((i) => !i.completed)
              .map((item) => {
                const isHigh = item.priority === 'High';
                const isMed = item.priority === 'Medium';

                return (
                  <div key={item.id} className="relative group">
                    {/* Stem Node Dot */}
                    <div
                      className={`absolute -left-6 top-5 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest shadow-xs ${
                        isHigh ? 'bg-error' : isMed ? 'bg-tertiary-container' : 'bg-outline-variant'
                      }`}
                    ></div>

                    <div className="bg-surface-container-lowest p-4 rounded-[22px] shadow-sm flex flex-col gap-2.5 border border-outline-variant/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold tracking-wider ${
                              isHigh
                                ? 'bg-error-container text-on-error-container'
                                : isMed
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {item.priority || 'MEDIUM'}
                          </span>

                          <button
                            onClick={() => toggleNonNegotiable(item)}
                            className={`px-2 py-0.5 rounded-full font-label text-[10px] font-bold flex items-center gap-1 transition-colors ${
                              item.non_negotiable
                                ? 'bg-primary-fixed text-on-primary-fixed'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            <Icon name="lock" size={12} />
                            {item.non_negotiable ? 'Non-Negotiable' : 'Flexible'}
                          </button>

                          <span className="font-label text-xs text-on-surface-variant font-medium ml-1">
                            {item.start || item.time || '10:30 AM'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleItem(item)}
                            className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container active:scale-90 transition-all"
                            title="Mark complete"
                          >
                            <Icon name="check" size={18} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-headline text-base font-bold text-on-surface leading-snug">
                          {item.title}
                        </h4>
                        {item.notes && (
                          <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Collapsible Completed Today Drawer */}
        {completedCount > 0 && (
          <details className="group bg-surface-container-low rounded-2xl overflow-hidden transition-all mt-2 border border-outline-variant/20">
            <summary className="flex items-center justify-between p-3.5 cursor-pointer list-none select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs">
                  {completedCount}
                </div>
                <span className="font-label text-xs font-bold text-on-surface">Completed Today</span>
              </div>
              <Icon name="expand_more" size={20} className="text-on-surface-variant transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3.5 pb-3.5 space-y-2">
              {allItems
                .filter(i => i.completed)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 bg-surface-container-lowest rounded-xl opacity-80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button onClick={() => toggleItem(item)}>
                        <Icon name="check_circle" size={18} className="text-secondary" />
                      </button>
                      <span className="font-body text-xs line-through text-on-surface-variant truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="font-label text-xs text-on-surface-variant">
                      {item.start || item.time || 'Completed'}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </section>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-full shadow-xl flex items-center gap-2 font-label text-xs transition-all duration-300 z-50 animate-in fade-in slide-in-from-bottom-2">
          <Icon name="task_alt" size={18} className="text-secondary-fixed" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Add Task Modal */}
      <BottomSheet isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Routine Block">
        <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spine mobility & cold plunge"
              className="mt-1 w-full h-12 px-4 rounded-[16px] bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-xs text-on-surface-variant font-medium">Scheduled Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1 w-full h-12 px-3 rounded-[16px] bg-surface-container-low text-on-surface font-body text-sm font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="font-label text-xs text-on-surface-variant font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full h-12 px-3 rounded-[16px] bg-surface-container-low text-on-surface font-body text-sm font-semibold focus:outline-none"
              >
                <option value="High">High Urgency</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-label text-xs text-on-surface-variant font-medium">Directive / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on hydration, core stretch..."
              rows={2}
              className="mt-1 w-full p-3 rounded-[16px] bg-surface-container-low text-on-surface focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            className="mt-2 h-12 rounded-full bg-primary text-on-primary font-body text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
          >
            Save Routine Block
          </button>
        </form>
      </BottomSheet>

      {/* Master Routine Management Modal */}
      <MasterRoutineModal
        isOpen={showMasterModal}
        onClose={() => setShowMasterModal(false)}
        onSaved={() => loadSchedule()}
      />
    </div>
  );
}
