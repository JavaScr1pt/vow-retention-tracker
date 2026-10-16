// Rewards: XP, milestone bonuses, streak freezes and badges.
// `syncProgress()` is idempotent. main.js runs it after every state change,
// so features never need to remember to "check badges".

import { BADGES, MILESTONES, XP } from '../config/constants.js';
import { store } from '../state/store.js';
import { freezesDue, unrewardedMilestones } from '../domain/streak.js';
import { levelInfo, newBadges } from '../domain/progression.js';
import { toast, xpToast } from '../ui/toast.js';

export function awardXP(amount, label) {
  const before = levelInfo(store.get().xp).level;
  store.update((s) => {
    s.xp = (s.xp || 0) + amount;
  });
  xpToast(`+${amount} XP · ${label}`);
  const after = levelInfo(store.get().xp);
  if (after.level > before) setTimeout(() => toast(`${after.avatar} Level up! You're now a ${after.name}`), 900);
}

let syncing = false;
export function syncProgress(now = new Date()) {
  if (syncing) return;
  syncing = true;
  try {
    const s = store.get();
    const milestones = unrewardedMilestones(s, now);
    const freezes = freezesDue(s, now);
    const badges = newBadges(s, now);
    if (!milestones.length && !freezes && !badges.length) return;

    store.update((st) => {
      st.milestonesAwarded.push(...milestones);
      st.xp = (st.xp || 0) + milestones.length * XP.milestone;
      if (freezes) {
        if (st.freezeStreakStart !== st.startDate) {
          st.freezeStreakStart = st.startDate;
          st.freezesEarnedInStreak = 0;
        }
        st.freezesEarnedInStreak += freezes;
        st.streakFreezes = (st.streakFreezes || 0) + freezes;
      }
      st.earnedBadges.push(...badges);
    });

    // Stagger the celebrations so they don't overwrite each other.
    const messages = [
      ...milestones.map((m) => `🏆 ${MILESTONES[m]}! +${XP.milestone} XP`),
      ...(freezes ? [`🧊 You earned ${freezes > 1 ? `${freezes} streak freezes` : 'a streak freeze'}!`] : []),
      ...badges.map((id) => `🏅 Badge unlocked: ${BADGES.find((b) => b.id === id)?.label}`),
    ];
    messages.forEach((m, i) => setTimeout(() => toast(m), 600 + i * 3000));
  } finally {
    syncing = false;
  }
}
