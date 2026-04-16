import { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { cn } from '../lib/utils';
import { db, getTodayStr, seedTodayData } from '../db/database';

const ENERGY_EMOJIS = [
  { level: 1, emoji: '😫', label: 'Drained'  },
  { level: 2, emoji: '😴', label: 'Tired'    },
  { level: 3, emoji: '😐', label: 'Neutral'  },
  { level: 4, emoji: '😊', label: 'Good'     },
  { level: 5, emoji: '⚡', label: 'Charged'  },
];

const QUICK_TAGS = ['Focused', 'Tired', 'Anxious', 'Flow', 'Motivated', 'Stressed'];

const WEEKLY_BARS = [
  { day: 'M', value: 3 },
  { day: 'T', value: 4 },
  { day: 'W', value: 2 },
  { day: 'T', value: 5 },
  { day: 'F', value: 4 },
  { day: 'S', value: 3 },
  { day: 'S', value: 4 },
];

export default function EnergyTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [screenTime, setScreenTime] = useState(4);
  const today = getTodayStr();

  const loadLogs = async () => {
    const data = await db.energyLogs.where('date').equals(today).toArray();
    data.sort((a, b) => a.time.localeCompare(b.time));
    setLogs(data);
    setLoading(false);

    // Seed selected level from latest log
    if (data.length > 0) {
      setSelectedLevel(data[data.length - 1].level);
      setSelectedTag(data[data.length - 1].tag || null);
    }
  };

  useEffect(() => {
    seedTodayData().then(loadLogs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmojiTap = async (level) => {
    setSelectedLevel(level);
    const tag = selectedTag || 'Neutral';
    await db.energyLogs.add({ date: today, time: new Date().toTimeString().slice(0, 5), level, tag, note: '' });
    loadLogs();
  };

  const handleTagTap = (tag) => {
    setSelectedTag(prev => prev === tag ? null : tag);
  };

  const latestLog = logs[logs.length - 1];
  const avgLevel  = logs.length ? Math.round(logs.reduce((s, l) => s + l.level, 0) / logs.length) : 0;

  // SVG daily rhythm path — simple 3-point curve through logged levels
  const svgPoints = logs.slice(-3).map((l, i, arr) => {
    const x = arr.length === 1 ? 100 : (i / (arr.length - 1)) * 200;
    const y = 60 - (l.level / 5) * 50;
    return `${x},${y}`;
  });
  const svgPath = svgPoints.length >= 2
    ? `M ${svgPoints.join(' L ')}`
    : null;

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="pt-6 px-6 pb-6 bg-surface-container-low">
        <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">Wellness</p>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Energy &amp; Focus</h1>
        <p className="text-sm text-outline mt-1">Tune into your rhythm</p>
      </div>

      {/* Motivating card */}
      <div className="mx-4 mt-4 bg-primary-container/10 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0">
          <Icon name="bolt" size={24} filled className="text-on-tertiary-fixed" />
        </div>
        <div>
          {latestLog ? (
            <>
              <p className="font-semibold text-sm text-on-surface">Feeling {ENERGY_EMOJIS.find(e => e.level === latestLog.level)?.label || 'ok'}</p>
              <p className="text-xs text-outline mt-0.5">Last logged at {latestLog.time} &bull; tag: {latestLog.tag}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm text-on-surface">How&apos;s your energy right now?</p>
              <p className="text-xs text-outline mt-0.5">Track it to spot your patterns</p>
            </>
          )}
        </div>
      </div>

      {/* Emoji picker check-in */}
      <div className="mx-4 mt-4 card-floating p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-4">Log Energy Level</p>
        <div className="flex justify-around mb-4">
          {ENERGY_EMOJIS.map(({ level, emoji, label }) => (
            <button
              key={level}
              onClick={() => handleEmojiTap(level)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-full transition-all duration-200',
                selectedLevel === level
                  ? 'ring-4 ring-primary-fixed scale-125 bg-primary-fixed/30'
                  : 'hover:bg-surface-container-high'
              )}
              aria-label={label}
            >
              <span className="text-2xl leading-none">{emoji}</span>
            </button>
          ))}
        </div>
        {selectedLevel && (
          <p className="text-sm font-semibold text-on-surface mb-3">
            {ENERGY_EMOJIS.find(e => e.level === selectedLevel)?.label}
          </p>
        )}

        {/* Quick tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagTap(tag)}
              className={cn(
                'text-xs font-medium rounded-full px-3 py-1.5 transition-all active:scale-95',
                selectedTag === tag
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-outline hover:bg-surface-container-high'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-4 mt-4 flex gap-3">
        <div className="flex-1 card-floating p-4">
          <Icon name="trending_up" size={18} className="text-primary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{avgLevel > 0 ? `${avgLevel}/5` : '—'}</p>
          <p className="text-xs text-outline">avg today</p>
        </div>
        <div className="flex-1 card-floating p-4">
          <Icon name="history" size={18} className="text-secondary mb-2" />
          <p className="text-2xl font-headline font-bold text-on-surface">{logs.length}</p>
          <p className="text-xs text-outline">check-ins today</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-4 space-y-4">

        {/* Daily rhythm SVG chart */}
        {!loading && svgPath && (
          <div className="card-floating p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-3">Daily Rhythm</p>
            <svg viewBox="0 0 200 70" className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#005da7" />
                  <stop offset="100%" stopColor="#2976c7" />
                </linearGradient>
              </defs>
              <path d={svgPath} stroke="url(#energyGrad)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {svgPoints.map((pt, i) => {
                const [x, y] = pt.split(',').map(Number);
                return <circle key={i} cx={x} cy={y} r="4" fill="#005da7" />;
              })}
            </svg>
          </div>
        )}

        {/* Screen time slider */}
        <div className="card-floating p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">Screen Time</p>
            <span className="text-sm font-semibold text-on-surface">{screenTime}h today</span>
          </div>
          <input
            type="range"
            min="0" max="12" step="0.5"
            value={screenTime}
            onChange={e => setScreenTime(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-outline mt-1">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
          </div>
          <p className="text-xs text-outline mt-2">
            {screenTime <= 2 ? 'Great digital balance today! 🌿' :
             screenTime <= 5 ? 'Moderate screen usage — take a short break.' :
             'High screen time. Try stepping away for 10 minutes.'}
          </p>
        </div>

        {/* Weekly trends */}
        <div className="card-floating p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-4">Weekly Trends</p>
          <div className="flex items-end justify-between gap-1 h-20">
            {WEEKLY_BARS.map(({ day, value }, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full rounded-t-lg bg-primary/70 transition-all"
                  style={{ height: `${(value / 5) * 64}px` }}
                />
                <span className="text-[10px] text-outline">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
