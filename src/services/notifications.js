// Notifications, with one API for both runtimes:
//  • Native (Capacitor): real OS-scheduled local notifications that repeat daily.
//  • Web: the Notification API can't schedule, so while the app is open we
//    check once a minute and fire the reminder when it's due.

import { isNative } from '../lib/platform.js';

const DAILY_ID = 1001;
const SMART_ID = 1002;
const ICON = 'icons/vow-logo.svg';

let nativePlugin = null;
async function native() {
  if (!nativePlugin) nativePlugin = (await import('@capacitor/local-notifications')).LocalNotifications;
  return nativePlugin;
}

export function isSupported() {
  return isNative() || 'Notification' in globalThis;
}

export function isGranted() {
  if (isNative()) return true; // checked when scheduling
  return 'Notification' in globalThis && Notification.permission === 'granted';
}

/** Ask for permission. Resolves to true when granted. */
export async function requestPermission() {
  if (isNative()) {
    const LN = await native();
    const { display } = await LN.requestPermissions();
    return display === 'granted';
  }
  if (!('Notification' in globalThis)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function notifyNow(title, body) {
  if (isNative()) {
    const LN = await native();
    await LN.schedule({ notifications: [{ id: Date.now() % 100000, title, body }] });
    return;
  }
  if (isGranted()) new Notification(title, { body, icon: ICON });
}

async function scheduleNative(id, hour, title, body) {
  const LN = await native();
  await LN.cancel({ notifications: [{ id }] });
  await LN.schedule({
    notifications: [{ id, title, body, schedule: { on: { hour, minute: 0 }, allowWhileIdle: true } }],
  });
}

async function cancelNative(id) {
  const LN = await native();
  await LN.cancel({ notifications: [{ id }] });
}

export const REMINDER_COPY = {
  daily: ['🌿 Time for your pledge', 'Take ten seconds to commit to today.'],
  smart: ['🧠 Heads up', 'This is usually a tough hour for you. You know what to do.'],
};

/**
 * Keep scheduled reminders in sync with settings. Call after any change.
 * `getState` is read lazily by the web ticker so it always sees fresh state.
 */
export async function syncReminders({ dailyHour, smartHour, getState, markReminded }) {
  const s = getState();
  if (isNative()) {
    if (s.notifEnabled) await scheduleNative(DAILY_ID, dailyHour, ...REMINDER_COPY.daily);
    else await cancelNative(DAILY_ID);
    if (s.smartNotif && smartHour !== null) await scheduleNative(SMART_ID, smartHour, ...REMINDER_COPY.smart);
    else await cancelNative(SMART_ID);
    return;
  }
  startWebTicker({ dailyHour, getState, markReminded });
}

let ticker = null;
function startWebTicker({ dailyHour, getState, markReminded }) {
  if (ticker) clearInterval(ticker);
  const tick = () => {
    const s = getState();
    if (!s.notifEnabled || !isGranted()) return;
    const now = new Date();
    const todayKey = now.toDateString();
    const pledged = s.lastPledgeDate && new Date(s.lastPledgeDate + 'T00:00:00').toDateString() === todayKey;
    if (now.getHours() >= dailyHour && !pledged && s.lastReminderDate !== todayKey) {
      notifyNow(...REMINDER_COPY.daily);
      markReminded(todayKey);
    }
  };
  ticker = setInterval(tick, 60_000);
  tick();
}
