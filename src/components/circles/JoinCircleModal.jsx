import React, { useState } from 'react';
import Icon from '../ui/Icon';
import { joinCircleByCode } from '../../lib/supabase';

export default function JoinCircleModal({ isOpen, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const circle = await joinCircleByCode(code);
      setCode('');
      onJoined(circle);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to join circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Icon name="group_add" className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-headline font-bold text-on-surface">Join Circle</h3>
              <p className="text-xs text-on-surface-variant">Enter a 6-character invite code</p>
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
              Invite Code
            </label>
            <input
              type="text"
              placeholder="e.g. X7K9P2"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-primary transition-colors"
              required
              maxLength={6}
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
              disabled={loading || code.trim().length !== 6}
              className="px-6 py-2.5 rounded-2xl bg-primary text-on-primary text-xs font-semibold shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="sync" className="animate-spin text-sm" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Icon name="login" className="text-sm" />
                  <span>Join Squad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
