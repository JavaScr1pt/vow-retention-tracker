// Urge stats, heatmap data, the difficulty forecast and rule-based insights.
// Everything runs on-device from the user's own logs. There's no model or server.

import { CHALLENGES } from '../config/constants.js';
import { daysBetween, isoDateOffset, parseISODate, today } from '../lib/dates.js';
import { currentStreak } from './streak.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function urgeStats(s, now = new Date()) {
  const td = today(now);
  const had = s.urges.filter((u) => u.hadUrge);
  return {
    total: had.length,
    thisWeek: had.filter((u) => daysBetween(u.date, td) < 7).length,
    resisted: s.urges.filter((u) => !u.hadUrge).length,
  };
}

/** Last `days` days, oldest first, with an intensity level 0–4. */
export function heatmap(s, now = new Date(), days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = isoDateOffset(days - 1 - i, now);
    const count = s.urges.filter((u) => u.date === date && u.hadUrge).length;
    return { date, count, level: Math.min(count, 4) };
  });
}

export function triggerCounts(s) {
  const counts = {};
  for (const u of s.urges) {
    if (u.hadUrge && u.trigger) counts[u.trigger] = (counts[u.trigger] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

/** Evening-review difficulty for the last `days` days (null where missing). */
export function difficultySeries(s, now = new Date(), days = 10) {
  return Array.from({ length: days }, (_, i) => {
    const date = isoDateOffset(days - 1 - i, now);
    const review = s.reviews.find((r) => r.date === date);
    return { date, value: review ? review.rating : null };
  });
}

/**
 * Project the next `steps` values with a least-squares line through the last
 * (up to) 7 points, clamped to the 1–5 scale. Deterministic, unlike v3.0,
 * which added random jitter on every render.
 */
export function forecast(values, steps = 3) {
  const pts = values.slice(-7);
  const n = pts.length;
  if (n === 0) return [];
  if (n === 1) return Array(steps).fill(pts[0]);
  const xs = pts.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = pts.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (pts[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const clamp = (v) => Math.round(Math.min(5, Math.max(1, v)) * 10) / 10;
  return Array.from({ length: steps }, (_, k) => clamp(my + slope * (n + k - mx)));
}

/** Most common hour (0–23) of logged urges, or null without timestamped data. */
export function peakUrgeHour(s) {
  const hours = s.urges.filter((u) => u.hadUrge && u.at).map((u) => new Date(u.at).getHours());
  if (!hours.length) return null;
  const counts = {};
  for (const h of hours) counts[h] = (counts[h] || 0) + 1;
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
}

/** Up to five plain-language observations as { kind, text }. Text is plain
 *  (the renderer escapes it), and the user's challenge tip comes first. */
export function generateInsights(s, now = new Date()) {
  const out = [];
  const challenge = CHALLENGES.find((c) => c.id === s.userChallenge);
  if (challenge) out.push({ kind: 'tip', text: challenge.tip });

  const urges = s.urges.filter((u) => u.hadUrge);
  if (urges.length >= 3) {
    const byDay = Array(7).fill(0);
    for (const u of urges) byDay[parseISODate(u.date).getDay()]++;
    const max = Math.max(...byDay);
    if (max > 1) out.push({ kind: 'pattern', text: `Urges show up most on ${DAY_NAMES[byDay.indexOf(max)]}s. Plan something for that day.` });

    const top = triggerCounts(s)[0];
    if (top && top.count >= 2) out.push({ kind: 'pattern', text: `${top.name} is behind ${top.count} of your urges. Have a go-to response ready for it.` });

    const hour = peakUrgeHour(s);
    if (hour !== null) {
      const label = new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' });
      out.push({ kind: 'pattern', text: `Your riskiest hour is around ${label}. A reminder just before it can help.` });
    }
  }

  const streak = currentStreak(s, now);
  if (streak >= 8 && streak <= 14) out.push({ kind: 'streak', text: "Days 10–12 are hard for a lot of people, and you're in that window now. Lean on your reason." });

  const resisted = s.urges.filter((u) => !u.hadUrge).length;
  if (urges.length + resisted > 5) {
    const ratio = Math.round((resisted / (urges.length + resisted)) * 100);
    out.push({ kind: 'win', text: `${ratio}% of your check-ins were urge-free. That counts.` });
  }

  if (s.reviews.length >= 3) {
    const avg = s.reviews.reduce((sum, r) => sum + r.rating, 0) / s.reviews.length;
    const verdict = avg < 2.5 ? "You're handling things well." : avg < 3.5 ? 'Steady progress. Keep going.' : "It's been tough lately. Lean on your tools.";
    out.push({ kind: 'review', text: `Average day difficulty: ${avg.toFixed(1)}/5. ${verdict}` });
  }
  return out.slice(0, 5);
}
