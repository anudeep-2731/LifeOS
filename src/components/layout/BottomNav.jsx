import { NavLink, useMatch } from 'react-router-dom';
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
    <NavLink
      to={to}
      className={
        isActive
          ? 'flex flex-col items-center justify-center bg-[#d1e4ff] text-[#001d3d] rounded-full px-3.5 py-2 transition-all duration-200 shadow-sm font-bold'
          : 'flex flex-col items-center justify-center text-[#44474e] px-3 py-2 hover:bg-surface-container-high rounded-full transition-all duration-200'
      }
    >
      <Icon name={icon} size={20} filled={isActive} />
      {isActive && <span className="text-[10px] font-bold tracking-wide mt-0.5">{label}</span>}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center px-4 pb-5 pt-3 bg-[#f8f9ff]/90 backdrop-blur-xl z-50 rounded-t-[2.5rem] shadow-[0_-12px_32px_rgba(0,93,167,0.08)] border-t border-outline-variant/20">
      {NAV_ITEMS_LEFT.map(item => <NavigationItem key={item.to} {...item} />)}
      {NAV_ITEMS_RIGHT.map(item => <NavigationItem key={item.to} {...item} />)}
    </nav>
  );
}
