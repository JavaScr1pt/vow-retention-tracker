import { describe, expect, it } from 'vitest';
import { defaultState } from '../src/state/store.js';
import { bestStreak, currentStreak, effectivePledgeStreak, freezesDue, nextPledgeStreak, unrewardedMilestones } from '../src/domain/streak.js';
import { isLocked, trialStatus } from '../src/domain/trial.js';
import { levelInfo, newBadges, questDefs } from '../src/domain/progression.js';
import { forecast, generateInsights, heatmap, peakUrgeHour, triggerCounts, urgeStats } from '../src/domain/insights.js';

const NOW = new Date(2026, 9, 16, 12); // Fri 16 Oct 2026, noon
const state = (patch = {}) => ({ ...defaultState(NOW), ...patch });

describe('streak', () => {
  it('is zero without a start date and counts days since start', () => {
    expect(currentStreak(state(), NOW)).toBe(0);
    expect(currentStreak(state({ startDate: '2026-10-04' }), NOW)).toBe(12);
  });

  it('best streak is the max of history and current', () => {
    expect(bestStreak(state({ startDate: '2026-10-04', longestStreak: 21 }), NOW)).toBe(21);
    expect(bestStreak(state({ startDate: '2026-09-01', longestStreak: 21 }), NOW)).toBe(45);
  });

  it('rewards every milestone passed, even on days the app was closed', () => {
    const s = state({ startDate: '2026-09-30', milestonesAwarded: [7] }); // 16 days
    expect(unrewardedMilestones(s, NOW)).toEqual([14]);
  });

  it('earns one freeze per 30 streak days, once per streak', () => {
    const s = state({ startDate: '2026-08-01' }); // 76 days
    expect(freezesDue(s, NOW)).toBe(2);
    expect(freezesDue({ ...s, freezeStreakStart: '2026-08-01', freezesEarnedInStreak: 2 }, NOW)).toBe(0);
    expect(freezesDue({ ...s, freezeStreakStart: '2025-01-01', freezesEarnedInStreak: 5 }, NOW)).toBe(2);
  });

  it('pledge streak continues from yesterday and lapses after a missed day', () => {
    expect(nextPledgeStreak(state({ lastPledgeDate: '2026-10-15', pledgeStreak: 4 }), NOW)).toBe(5);
    expect(nextPledgeStreak(state({ lastPledgeDate: '2026-10-13', pledgeStreak: 4 }), NOW)).toBe(1);
    expect(effectivePledgeStreak(state({ lastPledgeDate: '2026-10-13', pledgeStreak: 4 }), NOW)).toBe(0);
    expect(effectivePledgeStreak(state({ lastPledgeDate: '2026-10-16', pledgeStreak: 4 }), NOW)).toBe(4);
  });
});

describe('trial', () => {
  it('ends after three relapses and never for Pro', () => {
    expect(trialStatus(state()).relapsesLeft).toBe(3);
    const three = state({ relapses: [{}, {}, {}] });
    expect(isLocked(three)).toBe(true);
    expect(isLocked({ ...three, isPro: true })).toBe(false);
  });

  it('cannot be reset by deleting history entries', () => {
    expect(isLocked(state({ relapses: [], relapsesLogged: 3 }))).toBe(true);
  });
});

describe('progression', () => {
  it('maps XP to levels with progress to the next', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, name: 'Seedling', pct: 0, next: 100 });
    expect(levelInfo(175)).toMatchObject({ level: 2, name: 'Sprout', pct: 50 });
    expect(levelInfo(999999)).toMatchObject({ level: 10, pct: 100, maxed: true });
  });

  it('counts weekly pledges from actual pledge dates', () => {
    const s = state({ pledgeDates: ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-15'] });
    expect(questDefs(s, NOW).find((q) => q.id === 'weekly_pledges').progress).toBe(3);
  });

  it('only reports badges not already earned', () => {
    const s = state({ lastPledgeDate: '2026-10-16', leaderboardOptIn: true, earnedBadges: ['first_pledge'] });
    expect(newBadges(s, NOW)).toEqual(['leaderboard']);
  });
});

describe('insights', () => {
  const urges = [
    { date: '2026-10-16', at: new Date(2026, 9, 16, 22).toISOString(), hadUrge: true, trigger: 'Boredom' },
    { date: '2026-10-15', at: new Date(2026, 9, 15, 22).toISOString(), hadUrge: true, trigger: 'Boredom' },
    { date: '2026-10-12', at: new Date(2026, 9, 12, 9).toISOString(), hadUrge: true, trigger: 'Stress' },
    { date: '2026-10-01', hadUrge: false, trigger: '' },
  ];

  it('summarises urges', () => {
    expect(urgeStats(state({ urges }), NOW)).toEqual({ total: 3, thisWeek: 3, resisted: 1 });
    expect(triggerCounts(state({ urges }))[0]).toEqual({ name: 'Boredom', count: 2 });
    expect(peakUrgeHour(state({ urges }))).toBe(22);
  });

  it('builds a 14-day heatmap ending today', () => {
    const map = heatmap(state({ urges }), NOW);
    expect(map).toHaveLength(14);
    expect(map.at(-1)).toMatchObject({ date: '2026-10-16', count: 1, level: 1 });
  });

  it('forecasts deterministically and within the 1–5 scale', () => {
    expect(forecast([2, 3, 4], 3)).toEqual([5, 5, 5]);
    expect(forecast([3, 3, 3])).toEqual([3, 3, 3]);
    expect(forecast([4, 3, 2, 1])).toEqual([1, 1, 1]);
    expect(forecast([2, 4, 3])).toEqual(forecast([2, 4, 3]));
  });

  it("leads with the tip for the user's chosen challenge", () => {
    const out = generateInsights(state({ urges, userChallenge: 'Frequent urges' }), NOW);
    expect(out[0].kind).toBe('tip');
    expect(out.some((i) => i.text.includes('Boredom'))).toBe(true);
  });
});
