import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import Drawer from './Drawer';

export default function TopBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors"
            aria-label="Open menu"
          >
            <Icon name="menu" size={24} className="text-primary" />
          </button>
          <Link to="/dashboard">
            <h1 className="font-headline font-black text-primary text-xl tracking-tight hover:opacity-80 transition-opacity">
              Serene Path
            </h1>
          </Link>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm select-none">
          A
        </div>
      </header>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
