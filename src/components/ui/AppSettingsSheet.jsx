import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { cn } from '../../lib/utils';
import { db } from '../../db/database';
import { requestPermission } from '../../lib/notifications';

export default function AppSettingsSheet({ isOpen, onClose }) {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [gmailClientId, setGmailClientId] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus, setNotifStatus] = useState('default');

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  const loadSettings = async () => {
    const [ai, g, enabled, notif] = await Promise.all([
      db.settings.get('geminiApiKey'),
      db.settings.get('gmailClientId'),
      db.settings.get('aiEnabled'),
      db.settings.get('notificationsEnabled'),
    ]);
    if (ai) setGeminiApiKey(ai.value);
    if (g) setGmailClientId(g.value);
    setAiEnabled(enabled?.value !== false);
    setNotifEnabled(notif?.value === true);
    setNotifStatus('Notification' in window ? Notification.permission : 'unsupported');
  };

  const handleSave = async () => {
    await Promise.all([
      db.settings.put({ key: 'geminiApiKey', value: geminiApiKey }),
      db.settings.put({ key: 'gmailClientId', value: gmailClientId }),
      db.settings.put({ key: 'aiEnabled', value: aiEnabled }),
      db.settings.put({ key: 'notificationsEnabled', value: notifEnabled }),
    ]);
    window.dispatchEvent(new CustomEvent('life-os:settings-saved'));
    onClose();
  };

  const handleNotifToggle = async () => {
    if (!notifEnabled) {
      const perm = await requestPermission();
      if (perm === 'granted') {
        setNotifEnabled(true);
        setNotifStatus('granted');
      } else {
        setNotifStatus(perm);
      }
    } else {
      setNotifEnabled(false);
    }
  };

  const notifStatusLabel = () => {
    if (notifStatus === 'granted') return 'Permission granted';
    if (notifStatus === 'denied') return 'Denied — check browser settings';
    if (notifStatus === 'unsupported') return 'Not supported in this browser';
    return 'Fires when app is open or installed as PWA';
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="App Settings">
      <div className="space-y-6">

        {/* AI & Integrations */}
        <section className="bg-primary/5 rounded-3xl p-5 border border-primary/10">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Icon name="auto_awesome" size={14} /> AI & Integrations
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-on-surface">Enable AI Features</p>
                <p className="text-xs text-outline">Task prioritize, meal suggestions, insights</p>
              </div>
              <button
                onClick={() => setAiEnabled(v => !v)}
                className={cn('w-12 h-6 rounded-full transition-all relative flex-shrink-0', aiEnabled ? 'bg-primary' : 'bg-surface-container-highest')}
              >
                <div className={cn('w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all', aiEnabled ? 'right-0.5' : 'left-0.5')} />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-bold text-outline uppercase block mb-1.5 ml-1">Gemini API Key</label>
              <input
                type="password"
                placeholder="Enter API Key"
                className="input-pill w-full text-xs"
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-outline uppercase block mb-1.5 ml-1">Gmail Client ID</label>
              <input
                type="text"
                placeholder="Enter Client ID"
                className="input-pill w-full text-xs"
                value={gmailClientId}
                onChange={e => setGmailClientId(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[9px] text-outline mt-3 ml-1 italic leading-relaxed">
            Keys stored locally in your browser — never sent to any server.
          </p>
        </section>

        {/* Notifications */}
        <section className="bg-secondary/5 rounded-3xl p-5 border border-secondary/10">
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Icon name="notifications" size={14} /> Notifications
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface">Routine & Water Reminders</p>
              <p className="text-xs text-outline leading-relaxed mt-0.5">{notifStatusLabel()}</p>
            </div>
            <button
              onClick={handleNotifToggle}
              disabled={notifStatus === 'denied' || notifStatus === 'unsupported'}
              className={cn('w-12 h-6 rounded-full transition-all relative flex-shrink-0 disabled:opacity-40', notifEnabled ? 'bg-secondary' : 'bg-surface-container-highest')}
            >
              <div className={cn('w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all', notifEnabled ? 'right-0.5' : 'left-0.5')} />
            </button>
          </div>
        </section>

        <button onClick={handleSave} className="btn-primary w-full py-4 font-bold shadow-gradient">
          Save Settings
        </button>
      </div>
    </BottomSheet>
  );
}
