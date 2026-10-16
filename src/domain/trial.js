// Free-trial rules. The trial is relapse-count based (no time limit):
// it ends once TRIAL_RELAPSES relapses have been logged.

import { TRIAL_RELAPSES } from '../config/constants.js';

export function trialStatus(s) {
  if (s.isPro) return { isPro: true, active: true, ended: false, relapsesLeft: Infinity };
  // `relapsesLogged` only ever goes up, so deleting history entries can't reset the trial.
  const used = Math.max(s.relapses.length, s.relapsesLogged || 0);
  const relapsesLeft = Math.max(0, TRIAL_RELAPSES - used);
  return { isPro: false, active: relapsesLeft > 0, ended: relapsesLeft === 0, relapsesLeft, relapsesUsed: used };
}

/** Logging actions are locked once the trial has ended and the user isn't Pro. */
export function isLocked(s) {
  return trialStatus(s).ended;
}
