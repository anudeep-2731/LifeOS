import React, { useState } from 'react';
import Icon from '../ui/Icon';
import { leaveCircle, deleteCircle } from '../../lib/supabase';

export default function CircleSettingsSheet({ isOpen, onClose, circle, members = [], currentUserId, onCircleUpdated }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !circle) return null;

  const isAdmin = circle.userRole === 'admin' || circle.created_by === currentUserId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(circle.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (!window.confirm(`Are you sure you want to leave ${circle.name}?`)) return;
    setLoading(true);
    try {
      await leaveCircle(circle.id);
      onCircleUpdated();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to leave circle');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${circle.name}? This will remove all posts and members.`)) return;
    setLoading(true);
    try {
      await deleteCircle(circle.id);
      onCircleUpdated();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="settings" className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-headline font-bold text-on-surface">{circle.name}</h3>
              <p className="text-xs text-on-surface-variant">Circle Settings & Invite Code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Invite Code Box */}
        <div className="p-4 mb-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-0.5">
              Circle Invite Code
            </span>
            <span className="text-xl font-mono font-bold text-on-surface tracking-widest">
              {circle.invite_code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <Icon name={copied ? 'check' : 'content_copy'} className="text-sm" />
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Members List */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-on-surface-variant mb-2.5 flex items-center justify-between">
            <span>Members ({members.length}/8)</span>
            <span className="text-[10px] text-outline">Cap: 8 squad mates</span>
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary font-bold text-xs flex items-center justify-center">
                    {m.user_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-medium text-on-surface">
                    {m.user_name} {m.user_id === currentUserId && '(You)'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
          <button
            onClick={handleLeave}
            disabled={loading}
            className="w-full py-2.5 rounded-2xl border border-error/30 text-error text-xs font-semibold hover:bg-error/5 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="logout" className="text-sm" />
            <span>Leave Circle</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="delete" className="text-sm" />
              <span>Delete Circle (Admin)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
