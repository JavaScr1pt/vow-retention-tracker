// Seed data for demos and manual QA: about two weeks of realistic history.
// Used by Settings ▸ Developer ▸ "Load demo data".

import { isoDateOffset } from '../lib/dates.js';
import { defaultState } from '../state/store.js';

export function buildDemoState(now = new Date()) {
  const s = defaultState(now);
  const at = (daysAgo, hour) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, 15);
    return d.toISOString();
  };

  Object.assign(s, {
    userName: 'Alex',
    userChallenge: 'Boredom / screen time',
    userWhy: 'I want to feel clear-headed and proud of how I spend my time.',
    installDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40).toISOString(),
    startDate: isoDateOffset(12, now),
    longestStreak: 21,
    relapses: [
      { date: isoDateOffset(34, now), streakAtTime: 4, reflection: 'Stayed up late scrolling after a stressful day.' },
      { date: isoDateOffset(12, now), streakAtTime: 21, reflection: 'Bored on a Sunday with nothing planned.' },
    ],
    pledgeStreak: 5,
    lastPledgeDate: isoDateOffset(1, now),
    pledgeDates: [1, 2, 3, 4, 5, 8, 9].map((d) => isoDateOffset(d, now)),
    reviews: [
      [9, 3], [8, 4], [7, 3], [6, 2], [5, 3], [4, 4], [3, 2], [1, 2],
    ].map(([d, rating]) => ({ date: isoDateOffset(d, now), rating, note: '' })),
    urges: [
      [13, 23, true, 'Late night'], [11, 22, true, 'Boredom'], [10, 21, false, ''],
      [9, 23, true, 'Social media'], [7, 22, true, 'Boredom'], [6, 15, false, ''],
      [5, 22, true, 'Stress'], [4, 23, true, 'Late night'], [3, 22, true, 'Boredom'],
      [2, 9, false, ''], [1, 22, true, 'Boredom'], [0, 8, false, ''],
    ].map(([d, h, hadUrge, trigger]) => ({ date: isoDateOffset(d, now), at: at(d, h), hadUrge, trigger })),
    xp: 340,
    totalQuestsClaimed: 3,
    earnedBadges: ['first_pledge', 'streak_7', 'streak_14'],
    milestonesAwarded: [7],
    streakFreezes: 1,
    leaderboardOptIn: true,
    anonId: 'User D3M0',
    shownDay3Trial: true,
  });
  return s;
}
