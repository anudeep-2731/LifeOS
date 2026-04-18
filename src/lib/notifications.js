import { db } from '../db/database';

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function scheduleNotifications(routines) {
  if (!('serviceWorker' in navigator)) return;
  const enabled = await db.settings.get('notificationsEnabled');
  if (!enabled?.value) return;
  if (Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;

  const items = buildSchedule(routines);
  reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', items });
}

export async function cancelNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if (reg.active) reg.active.postMessage({ type: 'CANCEL_NOTIFICATIONS' });
}

function buildSchedule(routines) {
  const items = [];
  const now = new Date();

  for (const r of routines) {
    if (r.completed) continue;
    const [h, m] = r.start.split(':').map(Number);
    const fireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m - 5, 0, 0);
    if (fireTime.getTime() > now.getTime()) {
      items.push({
        title: `\u23F0 ${r.title}`,
        body: `Starting in 5 minutes at ${r.start}`,
        fireAt: fireTime.getTime(),
        tag: `routine-${r.id}`,
      });
    }
  }

  // Water reminder every 2 hours from 8:00 to 22:00
  for (let hour = 8; hour <= 22; hour += 2) {
    const fireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (fireTime.getTime() > now.getTime()) {
      items.push({
        title: '\uD83D\uDCA7 Hydration Check',
        body: 'Time to drink water!',
        fireAt: fireTime.getTime(),
        tag: `water-${hour}`,
      });
    }
  }

  return items;
}
