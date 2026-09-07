import { NavLink, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../ui/Icon';

const NAV_ITEMS_LEFT = [
  { to: '/dashboard', icon: 'home', label: 'Home' },
  { to: '/schedule', icon: 'calendar_month', label: 'Schedule' },
];

const NAV_ITEMS_RIGHT = [
  { to: '/expenses', icon: 'receipt_long', label: 'Expenses' },
  { to: '/portfolio', icon: 'account_balance', label: 'Portfolio' },
];

function NavigationItem({ to, icon, label }) {
  const isActive = !!useMatch(to);

  return (
    <NavLink to={to} className="flex flex-col items-center justify-center py-1">
      <motion.div
        whileTap={{ scale: 0.92 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
          isActive
            ? 'bg-[#d1e4ff] text-[#001c39] font-headline font-extrabold shadow-sm'
            : 'text-[#44474e] hover:bg-surface-container-high'
        }`}
      >
        <Icon name={icon} size={20} filled={isActive} />
        <span className={`text-[10px] font-headline font-bold transition-all ${
          isActive ? 'text-[#001c39] font-extrabold' : 'text-[#44474e]'
        }`}>
          {label}
        </span>
      </motion.div>
    </NavLink>
  );
}

function CenterCirclesItem() {
  const isActive = !!useMatch('/circles');

  return (
    <NavLink
      to="/circles"
      className="relative -top-5 flex flex-col items-center justify-center group"
    >
      <motion.div
        whileTap={{ scale: 0.92 }}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform group-hover:scale-105 ${
          isActive
            ? 'bg-gradient-to-tr from-primary via-blue-600 to-indigo-500 text-white shadow-primary/40 ring-4 ring-primary/20 scale-105'
            : 'bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-slate-900/30 hover:shadow-primary/30'
        }`}
      >
        <Icon name="groups" size={26} filled={isActive} />
        
        {/* Unread Activity Pulsing Dot */}
        <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500 border-2 border-slate-900"></span>
        </span>
      </motion.div>

      <span className={`text-[10px] font-headline font-extrabold tracking-wide mt-1 transition-colors ${
        isActive ? 'text-primary font-black' : 'text-on-surface-variant font-bold'
      }`}>
        Circles
      </span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center px-2 pb-2.5 pt-2 bg-[#f8f9ff]/95 backdrop-blur-xl z-50 rounded-t-[2.5rem] shadow-[0_-12px_32px_rgba(0,93,167,0.08)] border-t border-outline-variant/20">
      {NAV_ITEMS_LEFT.map(item => <NavigationItem key={item.to} {...item} />)}
      <CenterCirclesItem />
      {NAV_ITEMS_RIGHT.map(item => <NavigationItem key={item.to} {...item} />)}
    </nav>
  );
}
