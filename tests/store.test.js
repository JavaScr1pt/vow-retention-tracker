import { describe, expect, it } from 'vitest';
import { defaultState, migrate, SCHEMA_VERSION } from '../src/state/store.js';
import { legacyHash, verifyPin } from '../src/lib/pin.js';
import { mockEntries } from '../src/services/leaderboard.js';
import { buildDemoState } from '../src/services/demo-data.js';

describe('state migration', () => {
  it('upgrades v3.0 (schema 1) data without losing anything', () => {
    const v1 = {
      startDate: '2026-05-01',
      relapses: [{ date: '2026-04-20', streakAtTime: 9 }],
      milestoneXP_7: true,
      milestoneXP_14: true,
      lastPledgeDate: '2026-05-31',
      earnedBadges: ['share'],
      pinHash: legacyHash('1234'),
      _pendingRelapse: { date: 'x' },
      xp: 120,
    };
    const s = migrate(v1);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.milestonesAwarded.sort()).toEqual([14, 7]);
    expect(s.milestoneXP_7).toBeUndefined();
    expect(s.pledgeDates).toEqual(['2026-05-31']);
    expect(s.hasShared).toBe(true);
    expect(s.pinAlgo).toBe('djb2');
    expect(s.relapsesLogged).toBe(1);
    expect(s._pendingRelapse).toBeUndefined();
    expect(s.xp).toBe(120);
    expect(s.urges).toEqual([]); // filled from defaults
  });

  it('repairs wrong types from hand-edited imports', () => {
    const s = migrate({ relapses: 'oops', questsClaimed: null, schemaVersion: 2 });
    expect(s.relapses).toEqual([]);
    expect(s.questsClaimed).toEqual({});
  });

  it('verifies legacy PINs so existing locks keep working', async () => {
    expect(await verifyPin('1234', { pinHash: legacyHash('1234'), pinAlgo: 'djb2' })).toBe(true);
    expect(await verifyPin('0000', { pinHash: legacyHash('1234'), pinAlgo: 'djb2' })).toBe(false);
  });
});

describe('mock services', () => {
  it('returns a stable, sorted leaderboard that includes the user', () => {
    const a = mockEntries('User AB12', 10);
    expect(a).toEqual(mockEntries('User AB12', 10));
    expect(a.filter((e) => e.you)).toHaveLength(1);
    expect([...a].sort((x, y) => y.streak - x.streak).map((e) => e.streak)).toEqual(a.map((e) => e.streak));
  });

  it('demo data is a valid, current-schema state', () => {
    const demo = buildDemoState(new Date(2026, 9, 16));
    expect(Object.keys(defaultState()).every((k) => k in demo)).toBe(true);
    expect(migrate(demo)).toEqual(demo);
  });
});
