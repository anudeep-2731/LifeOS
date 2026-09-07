import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import Drawer from './Drawer';
import StreakBadge from '../ui/StreakBadge';
import { fetchUserProfileName } from '../../lib/supabase';

export default function TopBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const name = await fetchUserProfileName();
      setUserName(name);
    };
    loadProfile();
  }, []);

  const initialLetter = userName ? userName[0].toUpperCase() : 'U';

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/90 backdrop-blur-xl flex justify-between items-center px-4 sm:px-6 h-16 border-b border-outline-variant/20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-colors"
            aria-label="Open menu"
          >
            <Icon name="menu" size={24} className="text-primary" />
          </button>
          <Link to="/dashboard">
            <h1 className="font-headline font-black text-primary text-xl tracking-tight hover:opacity-80 transition-opacity">
              LifeOS
            </h1>
          </Link>
        </div>
        
        <div className="flex items-center gap-2.5">
          <StreakBadge count={5} compact={false} />
          
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-headline font-extrabold text-sm select-none hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center justify-center"
            title={`Profile (${userName})`}
          >
            {initialLetter}
          </button>
        </div>
      </header>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
