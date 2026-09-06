import { useState, useEffect } from 'react';
import Icon from './Icon';
import BottomSheet from './BottomSheet';
import { DEFAULT_STARTER_ROUTINES, fetchCloudMasterRoutines, saveCloudMasterRoutines } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const DAYS_OF_WEEK = ['Everyday', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MasterRoutineModal({ isOpen, onClose, onRoutinesSaved }) {
  const [routines, setRoutines] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // null or index of routine
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields for editing/adding
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('08:00');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('Morning Routine');
  const [notes, setNotes] = useState('');
  const [selectedDays, setSelectedDays] = useState(['Everyday']);

  useEffect(() => {
    if (isOpen) {
      loadMasterRoutines();
    }
  }, [isOpen]);

  const loadMasterRoutines = async () => {
    const list = await fetchCloudMasterRoutines();
    setRoutines(list || DEFAULT_STARTER_ROUTINES);
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setTitle('');
    setStart('08:00');
    setDuration('30');
    setCategory('Morning Routine');
    setNotes('');
    setSelectedDays(['Everyday']);
    setShowAddForm(true);
  };

  const handleOpenEdit = (index) => {
    const item = routines[index];
    setEditingIndex(index);
    setTitle(item.title);
    setStart(item.start || '08:00');
    setDuration(String(item.duration || 30));
    setCategory(item.category || 'Morning Routine');
    setNotes(item.notes || '');
    setSelectedDays(item.days && item.days.length > 0 ? item.days : ['Everyday']);
    setShowAddForm(true);
  };

  const toggleDay = (day) => {
    if (day === 'Everyday') {
      setSelectedDays(['Everyday']);
      return;
    }
    const current = selectedDays.filter(d => d !== 'Everyday');
    if (current.includes(day)) {
      const next = current.filter(d => d !== day);
      setSelectedDays(next.length === 0 ? ['Everyday'] : next);
    } else {
      setSelectedDays([...current, day]);
    }
  };

  const handleDelete = (index) => {
    const updated = routines.filter((_, i) => i !== index);
    setRoutines(updated);
  };

  const handleSaveRoutineItem = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem = {
      title: title.trim(),
      start,
      duration: Number(duration) || 15,
      category: category.trim() || 'Routine',
      notes: notes.trim(),
      days: selectedDays.length > 0 ? selectedDays : ['Everyday'],
    };

    if (editingIndex !== null) {
      const updated = [...routines];
      updated[editingIndex] = newItem;
      setRoutines(updated);
    } else {
      setRoutines([...routines, newItem]);
    }

    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Sort routines chronologically by start time
    const sorted = [...routines].sort((a, b) => (a.start || '00:00').localeCompare(b.start || '00:00'));
    await saveCloudMasterRoutines(sorted);
    setIsSaving(false);
    if (onRoutinesSaved) onRoutinesSaved(sorted);
    onClose();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset master routines to standard daily blueprint?')) {
      setRoutines(DEFAULT_STARTER_ROUTINES);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Master Daily Routine Blueprint">
      <div className="space-y-4 pb-6">
        <p className="text-xs text-outline leading-relaxed">
          These daily habit routines automatically populate into your daily agenda. You can assign routines to specific days (e.g. Mon, Wed, Fri) or Everyday below.
        </p>

        {showAddForm ? (
          <form onSubmit={handleSaveRoutineItem} className="bg-surface-container/60 rounded-2xl p-4 border border-outline-variant/30 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                {editingIndex !== null ? 'Edit Master Routine' : 'Add New Master Routine'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-outline hover:text-on-surface"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Target Days</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all',
                        isSelected ? 'bg-primary text-white shadow-xs' : 'bg-surface-container text-outline hover:bg-surface-container-high'
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Routine Title</label>
              <input
                type="text"
                className="input-pill w-full text-xs font-semibold"
                placeholder="e.g. Morning Hydration & Stretch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-outline block mb-1">Start Time</label>
                <input
                  type="time"
                  className="input-pill w-full text-xs font-bold text-primary"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-outline block mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="input-pill w-full text-xs font-bold"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Category</label>
              <input
                type="text"
                className="input-pill w-full text-xs"
                placeholder="e.g. Fitness & Spine, Work, Nutrition, Skin Care"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Key Focus & Specific Notes</label>
              <textarea
                className="input-pill w-full text-xs rounded-2xl h-16 py-2 resize-none"
                placeholder="Specific instructions, steps, or product reminders..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold">
              {editingIndex !== null ? 'Update Routine Item' : 'Add Routine Item'}
            </button>
          </form>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-outline">
                {routines.length} Master Daily Routines Defined
              </span>
              <button
                onClick={handleOpenAdd}
                className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Icon name="add" size={14} />
                <span>+ Add Routine</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {routines.length === 0 ? (
                <div className="py-6 text-center text-outline text-xs">
                  No routines defined yet. Click "+ Add Routine" above or reset defaults.
                </div>
              ) : (
                routines.map((r, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/20 flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {r.start || '08:00'} ({r.duration || 15}m)
                        </span>
                        <span className="text-[10px] font-bold text-outline truncate">
                          {r.category || 'Routine'}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-surface-container text-primary">
                          {(r.days && r.days.length > 0) ? r.days.join(', ') : 'Everyday'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-on-surface mt-1 truncate">{r.title}</p>
                      {r.notes && (
                        <p className="text-[10px] text-outline truncate mt-0.5">{r.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(idx)}
                        className="p-1.5 text-outline hover:text-primary transition-colors"
                        title="Edit Master Routine"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(idx)}
                        className="p-1.5 text-outline hover:text-rose-400 transition-colors"
                        title="Delete Master Routine"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs font-semibold text-outline hover:text-on-surface underline"
              >
                Reset Defaults
              </button>

              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl primary-gradient text-white font-bold text-xs shadow-gradient hover:scale-105 active:scale-95 transition-all"
              >
                {isSaving ? 'Saving...' : 'Save Master Blueprint'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
