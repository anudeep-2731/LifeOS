import React, { useState } from 'react';
import Icon from '../ui/Icon';
import { createCircle } from '../../lib/supabase';

export default function CreateCircleModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const circle = await createCircle({ name, description });
      setName('');
      setDescription('');
      onCreated(circle);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="groups" className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-headline font-bold text-on-surface">Create a Circle</h3>
              <p className="text-xs text-on-surface-variant">Build your 8-member goal squad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <Icon name="error" className="text-base" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Circle Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Fitness & Finance Fam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
              required
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Goal / Purpose (Optional)
            </label>
            <textarea
              placeholder="e.g. Daily workout snaps & staying under budget together!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              maxLength={120}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-outline-variant/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 rounded-2xl bg-primary text-on-primary text-xs font-semibold shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="sync" className="animate-spin text-sm" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Icon name="add" className="text-sm" />
                  <span>Create Circle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
