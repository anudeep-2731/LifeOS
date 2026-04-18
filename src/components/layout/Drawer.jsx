import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { db } from '../../db/database';
import FinanceSettingsSheet from '../ui/FinanceSettingsSheet';
import AppSettingsSheet from '../ui/AppSettingsSheet';

export default function Drawer({ isOpen, onClose }) {
  const [showFinanceSettings, setShowFinanceSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const load = async () => {
      const c = await db.settings.get('gmailClientId');
      if (c) setClientId(c.value);
    };
    load();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="fixed top-0 left-0 h-full w-80 bg-surface-container-low z-[70] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

        {/* Header */}
        <div className="p-6 pt-12 flex items-center justify-between border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-lg">
              A
            </div>
            <div>
              <h2 className="font-headline font-bold text-on-surface">Anudeep</h2>
              <p className="text-xs text-outline">LifeOS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-outline hover:text-on-surface">
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Links / Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          <p className="text-[10px] font-bold text-outline uppercase tracking-widest ml-2 mb-2 pt-4">Settings</p>

          <button
            onClick={() => setShowAppSettings(true)}
            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container-high transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="tune" size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-on-surface">App Settings</p>
              <p className="text-[10px] text-outline">AI keys, Gmail, Notifications</p>
            </div>
          </button>

          <button
            onClick={() => setShowFinanceSettings(true)}
            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container-high transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <Icon name="payments" size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-on-surface">Finance Settings</p>
              <p className="text-[10px] text-outline">Budget & Categories</p>
            </div>
          </button>

          <div className="w-full flex items-center gap-4 p-3 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <Icon name="mail" size={20} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface">Gmail Connection</p>
              <p className="text-[10px] text-outline truncate">{clientId ? 'Connected' : 'Not setup — configure in App Settings'}</p>
            </div>
          </div>

          <div className="pt-8 border-t border-outline-variant/10 mt-4">
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest ml-2 mb-2">App Info</p>
            <div className="p-3 bg-surface-container rounded-2xl">
              <p className="text-xs text-on-surface font-semibold">Version 1.3.0</p>
              <p className="text-[10px] text-outline mt-1 leading-relaxed">
                Your local-first companion for mental, physical, and financial wellbeing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center">
          <p className="text-[10px] text-outline-variant font-medium uppercase tracking-widest">
            Made with ❤️ for Peace
          </p>
        </div>
      </div>

      <AppSettingsSheet
        isOpen={showAppSettings}
        onClose={() => setShowAppSettings(false)}
      />

      <FinanceSettingsSheet
        isOpen={showFinanceSettings}
        onClose={() => setShowFinanceSettings(false)}
        onSave={() => {}}
      />
    </>
  );
}
