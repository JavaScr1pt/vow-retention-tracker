// Product constants: tuning numbers, copy tables, and catalogues.
// Pure data — no imports, no side effects.

/** Free trial ends once this many relapses have been logged (no time limit). */
export const TRIAL_RELAPSES = 3;

/** The streak ring fills over this many days. */
export const RING_GOAL_DAYS = 90;

/** A streak freeze is earned for every this-many consecutive streak days. */
export const FREEZE_EVERY_DAYS = 30;

/** Lock the app if it was in the background longer than this. */
export const PIN_TIMEOUT_MS = 30_000;

export const XP = Object.freeze({
  pledge: 10,
  eveningReview: 25,
  urgeLogged: 5,
  milestone: 50,
});

export const LEVELS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
export const LEVEL_NAMES = ['Seedling', 'Sprout', 'Sapling', 'Grove', 'Forest', 'Ancient Tree', 'Rainforest', 'Ecosystem', 'Legend', 'Enlightened'];
export const LEVEL_AVATARS = ['🌱', '🌿', '🍃', '🌲', '🌳', '🌴', '🏔️', '🌏', '⭐', '🌟'];

export const MILESTONES = Object.freeze({
  7: '7-Day Warrior',
  14: '2-Week Legend',
  21: '21-Day Master',
  30: '30-Day Champion',
  60: '60-Day Hero',
  90: '90-Day GOAT',
});

export const BADGES = [
  { id: 'first_pledge', emoji: '🌅', label: 'First Pledge', desc: 'Make your first pledge' },
  { id: 'streak_7', emoji: '🔥', label: 'Week Warrior', desc: 'Reach a 7-day streak' },
  { id: 'streak_14', emoji: '💪', label: '2-Week Titan', desc: 'Reach a 14-day streak' },
  { id: 'streak_30', emoji: '🏆', label: 'Month Master', desc: 'Reach a 30-day streak' },
  { id: 'streak_90', emoji: '👑', label: '90-Day GOAT', desc: 'Reach a 90-day streak' },
  { id: 'quests_5', emoji: '⚔️', label: 'Quest Knight', desc: 'Complete 5 quests' },
  { id: 'urge_log_10', emoji: '🎯', label: 'Self-Aware', desc: 'Log 10 urges' },
  { id: 'reviews_7', emoji: '📖', label: 'Reflector', desc: 'Complete 7 evening reviews' },
  { id: 'xp_500', emoji: '💎', label: 'XP Hunter', desc: 'Earn 500 XP' },
  { id: 'freeze_used', emoji: '🧊', label: 'Ice Cold', desc: 'Use a streak freeze' },
  { id: 'leaderboard', emoji: '🏅', label: 'Competitor', desc: 'Join the leaderboard' },
  { id: 'share', emoji: '📢', label: 'Advocate', desc: 'Share your streak card' },
];

export const MOTIVATIONAL_QUOTES = [
  'Your future self is watching. Make them proud.',
  'Every day of discipline is a vote for who you want to become.',
  'The struggle you feel today is the strength you feel tomorrow.',
  'You are stronger than your urges.',
  'Small steps forward are still steps forward.',
];

export const TRIGGERS = ['Stress', 'Boredom', 'Loneliness', 'Social media', 'Late night', 'Anxiety', 'Habit loop', 'Other'];

/** Onboarding "biggest struggle" options, each with a tip surfaced in Insights. */
export const CHALLENGES = [
  { id: 'Frequent urges', icon: '⚡', label: 'Frequent urges', tip: 'Urges peak and pass within about 15 minutes. Log it, then change rooms or move your body.' },
  { id: 'Staying consistent after relapse', icon: '🔄', label: 'Staying consistent after a relapse', tip: 'A relapse is data, not a verdict. Write one line on what led to it, then start again today.' },
  { id: 'Loneliness / emotional triggers', icon: '💙', label: 'Loneliness / emotional triggers', tip: 'When a heavy feeling hits, message one person before doing anything else.' },
  { id: 'Boredom / screen time', icon: '📱', label: 'Boredom / screen time', tip: 'Keep your phone out of the bedroom and plan one offline activity for your riskiest hour.' },
  { id: 'Other', icon: '✦', label: 'Something else', tip: 'Watch your trigger chart. Patterns usually show up after about a week of honest logs.' },
];

export const PLANS = [
  { id: 'monthly', name: 'Monthly', price: '$4.99', per: '/month' },
  { id: 'yearly', name: 'Yearly', price: '$29.99', per: '/year', badge: 'Best value' },
  { id: 'lifetime', name: 'Lifetime', price: '$59', per: 'one-time' },
];

export const PRO_FEATURES = [
  'Unlimited relapse logging & history',
  'Pattern insights & difficulty forecast',
  'Quests, XP levels & leaderboard',
  'Streak freezes & smart reminders',
  'App lock (PIN) & data export',
];
