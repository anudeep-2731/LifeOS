import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../ui/Icon';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const isTodayActive = path === '/today' || path === '/dashboard' || path === '/';
  const isGangActive = path === '/gang' || path === '/circles';
  const isMoneyActive = path === '/money' || path === '/expenses' || path === '/portfolio';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#f8f9fc]/95 backdrop-blur-xl rounded-t-[2rem] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-outline-variant/20">
      <div className="flex items-center justify-around h-20 px-4 relative">
        {/* Today Tab */}
        <NavLink
          to="/today"
          className={`group flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            isTodayActive ? 'text-primary font-bold' : 'text-on-surface-variant'
          }`}
        >
          <motion.div whileTap={{ scale: 0.92 }} className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
                isTodayActive ? 'bg-primary/10 text-primary' : 'text-inherit group-hover:bg-surface-container'
              }`}
            >
              <Icon name="wb_sunny" size={22} filled={isTodayActive} />
            </div>
            <span className="text-[11px] font-label-sm mt-0.5 tracking-tight text-inherit">
              Today
            </span>
          </motion.div>
        </NavLink>

        {/* Gang Center FAB */}
        <NavLink
          to="/gang"
          className="group flex flex-col items-center justify-center min-w-[56px] min-h-[44px] -mt-5 transition-colors"
        >
          <motion.div whileTap={{ scale: 0.92 }} className="relative flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(15,23,42,0.25)] transition-transform duration-150 ${
                  isGangActive
                    ? 'bg-gradient-to-b from-primary via-indigo-600 to-slate-900 ring-4 ring-primary/20 scale-105'
                    : 'bg-gradient-to-b from-slate-800 to-slate-900'
                }`}
              >
                <Icon name="groups" size={24} className="text-white" filled={isGangActive} />
              </div>

              {/* Pulsing Unread Activity Indicator */}
              <span className="absolute top-0 right-0 flex h-3 w-3 -mt-0.5 -mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 ring-2 ring-white"></span>
              </span>
            </div>

            <span
              className={`text-[11px] font-label-sm mt-1 tracking-tight transition-colors ${
                isGangActive ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
              }`}
            >
              Gang
            </span>
          </motion.div>
        </NavLink>

        {/* Money Tab */}
        <NavLink
          to="/money"
          className={`group flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            isMoneyActive ? 'text-primary font-bold' : 'text-on-surface-variant'
          }`}
        >
          <motion.div whileTap={{ scale: 0.92 }} className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
                isMoneyActive ? 'bg-primary/10 text-primary' : 'text-inherit group-hover:bg-surface-container'
              }`}
            >
              <Icon name="payments" size={22} filled={isMoneyActive} />
            </div>
            <span className="text-[11px] font-label-sm mt-0.5 tracking-tight text-inherit">
              Money
            </span>
          </motion.div>
        </NavLink>
      </div>
    </nav>
  );
}
