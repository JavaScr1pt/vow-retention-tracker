// App state: one plain object, persisted to localStorage, with change
// subscribers. Features mutate through `update()` so every change is saved
// and the UI re-renders in one place.

import { STORAGE_KEYS } from '../config/app.js';

export const SCHEMA_VERSION = 2;

export function defaultState(now = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    // Streak
    startDate: null, // YYYY-MM-DD, null when no streak is running
    relapses: [], // { date, streakAtTime, reflection? }
    relapsesLogged: 0, // lifetime count, used by the trial (history can be edited)
    longestStreak: 0,
    installDate: now.toISOString(),
    isPro: false,
    // Daily rituals
    pledgeStreak: 0,
    lastPledgeDate: null,
    pledgeDates: [],
    reviews: [], // { date, rating 1-5, note }
    urges: [], // { date, at (ISO timestamp), hadUrge, trigger }
    shownDay3Trial: false,
    // Profile from onboarding
    userName: '',
    userChallenge: '',
    userWhy: '',
    // Notifications
    notifEnabled: false,
    smartNotif: false,
    smartNotifHour: null,
    lastReminderDate: null,
    // Gamification
    xp: 0,
    questsClaimed: {},
    totalQuestsClaimed: 0,
    earnedBadges: [],
    milestonesAwarded: [],
    hasShared: false,
    // Streak freezes
    streakFreezes: 0,
    freezesUsed: 0,
    freezeStreakStart: null, // startDate the earned count below belongs to
    freezesEarnedInStreak: 0,
    // Leaderboard
    leaderboardOptIn: false,
    anonId: null,
    // Security
    pinEnabled: false,
    pinHash: null,
    pinAlgo: null,
    pinSalt: null,
  };
}

/** Upgrade data saved by older versions. Pure: returns a new object. */
export function migrate(raw, now = new Date()) {
  const base = defaultState(now);
  const s = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) };

  // Guard against wrong types from hand-edited or partial imports.
  for (const key of ['relapses', 'reviews', 'urges', 'earnedBadges', 'pledgeDates', 'milestonesAwarded']) {
    if (!Array.isArray(s[key])) s[key] = [];
  }
  if (!s.questsClaimed || typeof s.questsClaimed !== 'object') s.questsClaimed = {};

  if ((raw?.schemaVersion ?? 1) < 2) {
    // v1 stored milestone XP flags as loose keys: milestoneXP_7 = true
    for (const key of Object.keys(s)) {
      const m = /^milestoneXP_(\d+)$/.exec(key);
      if (m) {
        if (s[key] && !s.milestonesAwarded.includes(+m[1])) s.milestonesAwarded.push(+m[1]);
        delete s[key];
      }
    }
    if (s.lastPledgeDate && !s.pledgeDates.includes(s.lastPledgeDate)) s.pledgeDates.push(s.lastPledgeDate);
    if (s.earnedBadges.includes('share')) s.hasShared = true;
    s.relapsesLogged = Math.max(s.relapsesLogged || 0, s.relapses.length);
    // v1 PINs used the djb2 hash
    if (s.pinHash && !s.pinAlgo) s.pinAlgo = 'djb2';
    delete s._pendingRelapse;
    s.schemaVersion = SCHEMA_VERSION;
  }
  return s;
}

// ── Persistence ────────────────────────────────────────────────

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access can throw when site data is blocked
  }
}

export function readKey(key) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeKey(key, value) {
  try {
    if (value === null) storage()?.removeItem(key);
    else storage()?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Load saved state. Corrupt JSON is set aside (not lost) and defaults are used. */
export function loadState() {
  const raw = readKey(STORAGE_KEYS.state);
  if (!raw) return { state: defaultState(), recovered: false };
  try {
    return { state: migrate(JSON.parse(raw)), recovered: false };
  } catch {
    writeKey(STORAGE_KEYS.corruptBackup, raw);
    return { state: defaultState(), recovered: true };
  }
}

// ── Store ──────────────────────────────────────────────────────

let state = defaultState();
const listeners = new Set();
let onSaveError = () => {};

export const store = {
  init({ onError } = {}) {
    if (onError) onSaveError = onError;
    const result = loadState();
    state = result.state;
    return result;
  },
  get() {
    return state;
  },
  /** Mutate state via `fn(state)`, persist, and notify subscribers. */
  update(fn) {
    const result = fn(state);
    this.save();
    listeners.forEach((l) => l(state));
    return result;
  },
  replace(next) {
    state = migrate(next);
    this.save();
    listeners.forEach((l) => l(state));
  },
  save() {
    const ok = writeKey(STORAGE_KEYS.state, JSON.stringify(state));
    if (!ok) onSaveError();
    return ok;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
