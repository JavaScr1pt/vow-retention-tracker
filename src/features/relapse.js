// Relapse flow: confirm (optionally spend a streak freeze), then reflect.

import { TRIAL_RELAPSES } from '../config/constants.js';
import { $, setText, show } from '../lib/dom.js';
import { today } from '../lib/dates.js';
import { store } from '../state/store.js';
import { currentStreak } from '../domain/streak.js';
import { trialStatus } from '../domain/trial.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { guardLocked, showPaywall } from './paywall.js';

let pending = null;

export function relapseTemplate() {
  return `
  <div class="modal" id="relapseConfirm" role="alertdialog" aria-modal="true" aria-labelledby="relapseTitle" aria-describedby="relapseSub" hidden>
    <div class="modal-box">
      <div class="modal-icon" aria-hidden="true">⚡</div>
      <h2 class="modal-title" id="relapseTitle">Log a relapse?</h2>
      <p class="modal-sub" id="relapseSub">This resets your current streak to zero.</p>
      <p class="freeze-offer" id="freezeOffer" hidden></p>
      <p class="trial-warning" id="relapseTrialWarning" hidden></p>
      <div class="modal-btns">
        <button type="button" class="btn-secondary" data-action="relapse-cancel">Cancel</button>
        <button type="button" class="btn-danger-solid" data-action="relapse-confirm">Reset streak</button>
      </div>
      <button type="button" class="btn-freeze" id="useFreezeBtn" data-action="relapse-freeze" hidden>🧊 Use a freeze instead</button>
    </div>
  </div>

  <div class="modal" id="reflection" role="dialog" aria-modal="true" aria-labelledby="reflectTitle" data-dismissible="false" hidden>
    <div class="modal-box modal-left">
      <div class="modal-icon" aria-hidden="true">💭</div>
      <h2 class="modal-title" id="reflectTitle">What led to it?</h2>
      <p class="modal-sub">A one-line note helps you spot the pattern next time.</p>
      <label class="visually-hidden" for="reflectionText">Reflection</label>
      <textarea class="text-input reflection-textarea" id="reflectionText" placeholder="Optional: triggers, feelings, context…" maxlength="300"></textarea>
      <div class="modal-btns">
        <button type="button" class="btn-secondary" data-action="reflection-skip">Skip</button>
        <button type="button" class="btn-accent" data-action="reflection-save">Save</button>
      </div>
    </div>
  </div>`;
}

function openRelapse() {
  if (guardLocked()) return;
  const s = store.get();
  if (!s.startDate) {
    toast('Start a streak first. There\'s nothing to reset yet.');
    return;
  }
  const fc = s.streakFreezes || 0;
  setText('#freezeOffer', `🧊 You have ${fc} streak freeze${fc === 1 ? '' : 's'}. Use one to protect your ${currentStreak(s)}-day streak?`);
  show('#freezeOffer', fc > 0);
  show('#useFreezeBtn', fc > 0);
  const t = trialStatus(s);
  const warn = !t.isPro && t.relapsesLeft === 1;
  setText('#relapseTrialWarning', `This is the last of your ${TRIAL_RELAPSES} free relapse logs. After it, logging needs Vow Pro.`);
  show('#relapseTrialWarning', warn);
  openModal('relapseConfirm', { focus: '[data-action="relapse-cancel"]' });
}

function finishRelapse(reflection) {
  closeModal('reflection');
  const entry = pending;
  pending = null;
  if (!entry) return;
  if (reflection) entry.reflection = reflection;
  store.update((s) => {
    s.longestStreak = Math.max(s.longestStreak || 0, entry.streakAtTime);
    s.relapses.push(entry);
    s.relapsesLogged = Math.max(s.relapsesLogged || 0, s.relapses.length - 1) + 1;
    s.startDate = null;
  });
  toast('⚡ Logged. Tomorrow is a fresh start, and so is right now.');
  if (trialStatus(store.get()).ended) setTimeout(showPaywall, 1200);
}

registerActions({
  'log-relapse': openRelapse,
  'relapse-cancel': () => closeModal('relapseConfirm'),
  'relapse-freeze'() {
    closeModal('relapseConfirm');
    store.update((s) => {
      if ((s.streakFreezes || 0) < 1) return;
      s.streakFreezes -= 1;
      s.freezesUsed = (s.freezesUsed || 0) + 1;
    });
    toast('🧊 Freeze used. Your streak is protected.');
  },
  'relapse-confirm'() {
    closeModal('relapseConfirm');
    pending = { date: today(), streakAtTime: currentStreak(store.get()) };
    $('#reflectionText').value = '';
    openModal('reflection', { focus: '#reflectionText' });
  },
  'reflection-skip': () => finishRelapse(''),
  'reflection-save': () => finishRelapse($('#reflectionText').value.trim()),
});
