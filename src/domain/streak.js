// Streak, pledge, milestone and freeze rules. Pure functions of (state, now).

import { FREEZE_EVERY_DAYS, MILESTONES, RING_GOAL_DAYS } from '../config/constants.js';
import { daysBetween, isoDateOffset, today } from '../lib/dates.js';

export function currentStreak(s, now = new Date()) {
  if (!s.startDate) return 0;
  return Math.max(0, daysBetween(s.startDate, today(now)));
}

export function bestStreak(s, now = new Date()) {
  return Math.max(s.longestStreak || 0, currentStreak(s, now));
}

export function ringProgress(s, now = new Date()) {
  return Math.min(currentStreak(s, now) / RING_GOAL_DAYS, 1);
}

/** Label for the milestone reached exactly today, if any. */
export function milestoneToday(streak) {
  return MILESTONES[streak] ?? null;
}

/** Milestones reached but not yet rewarded (handles days the app wasn't opened). */
export function unrewardedMilestones(s, now = new Date()) {
  const streak = currentStreak(s, now);
  return Object.keys(MILESTONES)
    .map(Number)
    .filter((m) => m <= streak && !s.milestonesAwarded.includes(m));
}

/** One freeze per FREEZE_EVERY_DAYS consecutive days of the current streak. */
export function freezesDue(s, now = new Date()) {
  if (!s.startDate) return 0;
  const target = Math.floor(currentStreak(s, now) / FREEZE_EVERY_DAYS);
  const already = s.freezeStreakStart === s.startDate ? s.freezesEarnedInStreak || 0 : 0;
  return Math.max(0, target - already);
}

export function hasPledgedToday(s, now = new Date()) {
  return s.lastPledgeDate === today(now);
}

/** The pledge streak as it stands today: it lapses if yesterday was missed. */
export function effectivePledgeStreak(s, now = new Date()) {
  if (!s.lastPledgeDate) return 0;
  const t = today(now);
  if (s.lastPledgeDate === t || s.lastPledgeDate === isoDateOffset(1, now)) return s.pledgeStreak || 0;
  return 0;
}

/** Next pledge streak value if the user pledges now. */
export function nextPledgeStreak(s, now = new Date()) {
  return s.lastPledgeDate === isoDateOffset(1, now) ? (s.pledgeStreak || 0) + 1 : 1;
}
