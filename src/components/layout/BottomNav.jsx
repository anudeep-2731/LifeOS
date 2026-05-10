import { NavLink, useMatch } from 'react-router-dom';
import Icon from '../ui/Icon';
import VoiceCapture from '../ui/VoiceCapture';

const NAV_ITEMS_LEFT  = [
  { to: '/dashboard', icon: 'home',         label: 'Home'      },
  { to: '/morning',   icon: 'wb_sunny',     label: 'Morning'   },
];
const NAV_ITEMS_RIGHT = [
  { to: '/tasks',     icon: 'check_circle', label: 'Tasks'     },
  { to: '/money',     icon: 'payments',     label: 'Money'     },
];

function NavigationItem({ to, icon, label }) {
  const isActive = !!useMatch(to);
  return (
    <NavLink
      to={to}
      className={
        isActive
          ? 'flex flex-col items-center justify-center bg-[#d1e4ff] text-[#001d3d] rounded-full px-4 py-2.5 transition-all duration-200'
          : 'flex flex-col items-center justify-center text-[#44474e] px-4 py-2.5 hover:bg-surface-container-high rounded-full transition-all duration-200'
      }
    >
      <Icon name={icon} size={22} filled={isActive} />
      {isActive && <span className="text-[10px] font-semibold tracking-wide mt-0.5">{label}</span>}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-[#f8f9ff]/80 backdrop-blur-xl z-50 rounded-t-[3rem] shadow-[0_-12px_32px_rgba(0,93,167,0.08)]">
      {NAV_ITEMS_LEFT.map(item => <NavigationItem key={item.to} {...item} />)}

      {/* Centre mic — elevated above the bar */}
      <div className="flex flex-col items-center -mt-7">
        <VoiceCapture className="w-14 h-14" />
        <span className="text-[10px] font-semibold text-outline mt-1.5">Speak</span>
      </div>

      {NAV_ITEMS_RIGHT.map(item => <NavigationItem key={item.to} {...item} />)}
    </nav>
  );
}
