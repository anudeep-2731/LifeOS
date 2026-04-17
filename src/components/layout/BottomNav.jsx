import { NavLink, useMatch } from 'react-router-dom';
import Icon from '../ui/Icon';

const NAV_ITEMS = [
  { to: '/morning',   icon: 'wb_sunny',     label: 'Morning'   },
  { to: '/nutrition', icon: 'nutrition',    label: 'Nutrition' },
  { to: '/tasks',     icon: 'check_circle', label: 'Tasks'     },
  { to: '/money',     icon: 'payments',     label: 'Money'     },
];

function NavigationItem({ to, icon, label }) {
  const match = useMatch(to);
  const isActive = !!match;

  return (
    <NavLink
      to={to}
      className={
        isActive
          ? 'flex flex-col items-center justify-center bg-[#d1e4ff] text-[#001d3d] rounded-full px-5 py-2.5 transition-all duration-200'
          : 'flex flex-col items-center justify-center text-[#44474e] px-5 py-2.5 hover:bg-surface-container-high rounded-full transition-all duration-200'
      }
    >
      <Icon name={icon} size={22} filled={isActive} />
      {isActive && (
        <span className="text-[10px] font-semibold tracking-wide mt-0.5">{label}</span>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-[#f8f9ff]/80 backdrop-blur-xl z-50 rounded-t-[3rem] shadow-[0_-12px_32px_rgba(0,93,167,0.08)]">
      {NAV_ITEMS.map(item => (
        <NavigationItem key={item.to} {...item} />
      ))}
    </nav>
  );
}
