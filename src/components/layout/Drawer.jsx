import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { db } from '../../db/database';
import FinanceSettingsSheet from '../ui/FinanceSettingsSheet';
import { getSupabase } from '../../lib/supabase';

export default function Drawer({ isOpen, onClose }) {
  const [showFinanceSettings, setShowFinanceSettings] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const client = await getSupabase();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUserEmail(session.user.email || '');
          const metaName = session.user.user_metadata?.full_name;
          if (metaName) {
            setUserName(metaName);
          } else {
            const cachedName = await db.settings.get('user_full_name');
            setUserName(cachedName?.value || session.user.email?.split('@')[0] || 'User');
          }
        } else {
          setUser(null);
          setUserEmail('');
          setUserName('');
        }
      }
    };
    if (isOpen) loadUser();
  }, [isOpen]);

  const handleLogOut = async () => {
    const client = await getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    await db.settings.delete('user_full_name');
    await db.settings.delete('user_email');
    setUser(null);
    setUserName('');
    setUserEmail('');
    onClose();
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  const initialLetter = userName ? userName[0].toUpperCase() : userEmail ? userEmail[0].toUpperCase() : 'G';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="fixed top-0 left-0 h-full w-80 bg-surface-container-low z-[70] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

        {/* Header User Profile */}
        <div className="p-6 pt-12 flex items-center justify-between border-b border-outline-variant/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full primary-gradient text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
              {initialLetter}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-headline font-bold text-base text-on-surface truncate">
                {userName || (user ? 'Account User' : 'Guest User')}
              </h2>
              <p className="text-xs text-outline truncate">
                {userEmail || 'Local Mode'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-outline hover:text-on-surface flex-shrink-0">
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Links / Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          <p className="text-[10px] font-bold text-outline uppercase tracking-widest ml-2 mb-2 pt-2">Menu & Preferences</p>

          <button
            onClick={() => {
              onClose();
              setShowFinanceSettings(true);
            }}
            className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-surface-container/60 hover:bg-surface-container-high transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Icon name="tune" size={20} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface">Finance Settings</p>
              <p className="text-[10px] text-outline">Target budget & categories</p>
            </div>
          </button>

          <div className="pt-6 border-t border-outline-variant/10 mt-4 space-y-3">
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest ml-2">Account Session</p>

            {user ? (
              <button
                onClick={handleLogOut}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-error/10 text-error hover:bg-error/20 font-bold text-xs transition-all border border-error/20"
              >
                <Icon name="logout" size={18} />
                <span>Log Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl primary-gradient text-white font-bold text-xs transition-all shadow-sm"
              >
                <Icon name="login" size={18} />
                <span>Log In / Create Account</span>
              </button>
            )}

            <div className="p-3 bg-surface-container rounded-2xl mt-4">
              <p className="text-xs text-on-surface font-semibold">Version 1.5.0 (LifeOS Cloud)</p>
              <p className="text-[10px] text-outline mt-1 leading-relaxed">
                Your local-first companion for mental, physical, and financial wellbeing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center border-t border-outline-variant/10">
          <p className="text-[10px] text-outline-variant font-medium uppercase tracking-widest">
            Made with ❤️ for Peace
          </p>
        </div>
      </div>

      <FinanceSettingsSheet
        isOpen={showFinanceSettings}
        onClose={() => setShowFinanceSettings(false)}
        onSave={() => {}}
      />
    </>
  );
}
