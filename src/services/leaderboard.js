// Leaderboard API. With VITE_API_BASE_URL set it calls the real endpoint;
// otherwise it returns deterministic mock data after a simulated delay.
//
// Contract (for the future backend):
//   GET {base}/leaderboard?anonId=USER%20AB12&streak=12
//   → 200 { entries: [{ name: string, streak: number, you?: boolean }] }

import { CONFIG } from '../config/app.js';

const FAIL_FLAG = 'vow_mock_api_fail';

export function newAnonId() {
  return 'User ' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Seeded PRNG so the mock board doesn't reshuffle on every render. */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mockEntries(anonId, streak) {
  const seed = [...anonId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rand = mulberry32(seed);
  const others = Array.from({ length: 9 }, () => {
    const name = 'User ' + Math.floor(rand() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
    const spread = Math.round((rand() - 0.45) * 30);
    return { name, streak: Math.max(0, streak + spread) };
  });
  return [...others, { name: anonId, streak, you: true }].sort((a, b) => b.streak - a.streak || (a.you ? -1 : 1));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchLeaderboard({ anonId, streak }) {
  if (CONFIG.apiBaseUrl) {
    const url = `${CONFIG.apiBaseUrl.replace(/\/$/, '')}/leaderboard?anonId=${encodeURIComponent(anonId)}&streak=${streak}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
    const body = await res.json();
    return body.entries;
  }
  await sleep(CONFIG.mockLatencyMs);
  if (sessionStorage.getItem(FAIL_FLAG) === '1') throw new Error('Simulated network error');
  return mockEntries(anonId, streak);
}

/** Developer tool: make the mock API fail so the error state can be demoed. */
export function setMockFailure(on) {
  if (on) sessionStorage.setItem(FAIL_FLAG, '1');
  else sessionStorage.removeItem(FAIL_FLAG);
}

export function isMockFailureOn() {
  return sessionStorage.getItem(FAIL_FLAG) === '1';
}
