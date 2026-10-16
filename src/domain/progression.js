// XP levels, quests and badges. Pure functions of (state, now).

import { BADGES, LEVELS, LEVEL_AVATARS, LEVEL_NAMES } from '../config/constants.js';
import { today, weekStart } from '../lib/dates.js';
import { currentStreak, effectivePledgeStreak } from './streak.js';

export function levelInfo(xp = 0) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i]) idx = i;
    else break;
  }
  const maxed = idx >= LEVELS.length - 1;
  const cur = LEVELS[idx];
  const next = maxed ? cur : LEVELS[idx + 1];
  const pct = maxed ? 100 : Math.round(((xp - cur) / (next - cur)) * 100);
  return { level: idx + 1, name: LEVEL_NAMES[idx], avatar: LEVEL_AVATARS[idx], cur, next, pct, maxed };
}

export function questDefs(s, now = new Date()) {
  const wk = weekStart(now);
  const td = today(now);
  const streak = currentStreak(s, now);
  const weeklyPledges = s.pledgeDates.filter((d) => d >= wk).length;
  const weeklyUrges = s.urges.filter((u) => u.date >= wk && u.hadUrge).length;
  const weeklyReviews = s.reviews.filter((r) => r.date >= wk).length;
  return [
    { id: 'daily_pledge', type: 'Daily', icon: '🌅', label: "Today's pledge", sub: 'Make your daily pledge', xp: 10, progress: s.lastPledgeDate === td ? 1 : 0, goal: 1, resetKey: td },
    { id: 'weekly_pledges', type: 'Weekly', icon: '📿', label: '5 pledges this week', sub: 'Pledge on 5 days this week', xp: 100, progress: Math.min(weeklyPledges, 5), goal: 5, resetKey: wk },
    { id: 'weekly_urges', type: 'Weekly', icon: '🎯', label: 'Log 3 urges', sub: 'Notice and log 3 urges this week', xp: 50, progress: Math.min(weeklyUrges, 3), goal: 3, resetKey: wk },
    { id: 'weekly_reviews', type: 'Weekly', icon: '🌙', label: '3 evening reviews', sub: 'Reflect on 3 evenings this week', xp: 75, progress: Math.min(weeklyReviews, 3), goal: 3, resetKey: wk },
    { id: 'streak_7', type: 'Milestone', icon: '🔥', label: 'Reach a 7-day streak', sub: 'Seven days in a row', xp: 150, progress: Math.min(streak, 7), goal: 7, resetKey: 'milestone' },
    { id: 'streak_30', type: 'Milestone', icon: '🏆', label: 'Reach a 30-day streak', sub: 'A full month', xp: 500, progress: Math.min(streak, 30), goal: 30, resetKey: 'milestone' },
  ];
}

export const questKey = (q) => `${q.id}_${q.resetKey}`;

export function isQuestClaimed(s, q) {
  return Boolean(s.questsClaimed[questKey(q)]);
}

export function claimableQuestCount(s, now = new Date()) {
  return questDefs(s, now).filter((q) => q.progress >= q.goal && !isQuestClaimed(s, q)).length;
}

/** Badge ids the user qualifies for right now. */
export function qualifyingBadges(s, now = new Date()) {
  const streak = Math.max(currentStreak(s, now), s.longestStreak || 0);
  const checks = {
    first_pledge: Boolean(s.lastPledgeDate) || effectivePledgeStreak(s, now) > 0,
    streak_7: streak >= 7,
    streak_14: streak >= 14,
    streak_30: streak >= 30,
    streak_90: streak >= 90,
    quests_5: (s.totalQuestsClaimed || 0) >= 5,
    urge_log_10: s.urges.filter((u) => u.hadUrge).length >= 10,
    reviews_7: s.reviews.length >= 7,
    xp_500: (s.xp || 0) >= 500,
    freeze_used: (s.freezesUsed || 0) > 0,
    leaderboard: Boolean(s.leaderboardOptIn),
    share: Boolean(s.hasShared),
  };
  return BADGES.filter((b) => checks[b.id]).map((b) => b.id);
}

/** Badges the user qualifies for but hasn't been awarded yet. */
export function newBadges(s, now = new Date()) {
  return qualifyingBadges(s, now).filter((id) => !s.earnedBadges.includes(id));
}
