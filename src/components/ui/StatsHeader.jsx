import { useState, useEffect } from 'react';
import Icon from './Icon';
import { db } from '../../db/database';
import { cn } from '../../lib/utils';

export default function StatsHeader({ className }) {
  const [stats, setStats] = useState({ xp: 0, level: 1, rank: 'Initiate' });
  const [hasSynergy, setHasSynergy] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const xp = await db.userStats.get('xp');
      const level = await db.userStats.get('level');
      const rank = await db.userStats.get('rank');
      const lastRoutine = await db.userStats.get('lastRoutineCompletion');
      
      let synergyActive = false;
      if (lastRoutine) {
        const diff = (new Date().getTime() - new Date(lastRoutine.value).getTime()) / (1000 * 60);
        synergyActive = diff <= 20;
      }

      setStats({
        xp: xp?.value || 0,
        level: level?.value || 1,
        rank: rank?.value || 'Initiate'
      });
      setHasSynergy(synergyActive);
    };

    loadStats();

    // Polling or listener for updates (since we update DB directly)
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const xpInLevel = stats.xp % 1000;
  const progress = (xpInLevel / 1000) * 100;

  return (
    <div className={cn("px-6 py-4 bg-surface-container-low border-b border-outline-variant/10", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden group">
            <Icon name="military_tech" size={28} filled className="relative z-10" />
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          </div>
          <div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface uppercase tracking-tighter">Level {stats.level}</span>
                <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">{stats.rank}</span>
             </div>
             <p className="text-[11px] text-outline font-medium mt-0.5">{1000 - xpInLevel} XP to Level UP</p>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          {hasSynergy && (
             <div className="flex items-center gap-1 text-[9px] font-black text-secondary bg-secondary/10 px-2 py-0.5 rounded-full mb-1 animate-bounce">
                <Icon name="bolt" size={10} filled /> SYNERGY BOOST
             </div>
          )}
          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-0.5">Total Momentum</p>
          <p className="text-xl font-headline font-black text-primary leading-none">{stats.xp.toLocaleString()}</p>
        </div>
      </div>

      <div className="relative h-2.5 w-full bg-outline-variant/20 rounded-full overflow-hidden shadow-inner">
        <div 
          className="absolute top-0 left-0 h-full primary-gradient rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
