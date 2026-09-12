/**
 * Transforms routines and tasks arrays into structured Morning, Afternoon, and Evening time blocks.
 */
export function groupItemsByTimeBlock(routines = [], tasks = []) {
  const blocks = {
    morning: { id: 'morning', label: 'Morning', icon: '🌅', color: 'from-amber-500 to-orange-500', items: [] },
    afternoon: { id: 'afternoon', label: 'Afternoon', icon: '⚡', color: 'from-blue-600 to-cyan-500', items: [] },
    evening: { id: 'evening', label: 'Evening', icon: '🌙', color: 'from-purple-600 to-indigo-500', items: [] },
  };

  const getBlock = (timeStr) => {
    if (!timeStr) return 'morning';
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (isNaN(hour)) return 'morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  routines.forEach((r) => {
    const time = r.start || r.time || '08:00';
    const slot = getBlock(time);
    blocks[slot].items.push({
      ...r,
      itemType: 'routine',
      displayTime: time,
    });
  });

  tasks.forEach((t) => {
    const time = t.time || t.scheduledTime || '10:30';
    const slot = getBlock(time);
    blocks[slot].items.push({
      ...t,
      itemType: 'task',
      displayTime: time,
    });
  });

  // Sort items in each block by time
  Object.keys(blocks).forEach((key) => {
    blocks[key].items.sort((a, b) => (a.displayTime || '').localeCompare(b.displayTime || ''));
  });

  return blocks;
}
