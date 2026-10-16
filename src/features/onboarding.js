// First-run onboarding: name → biggest struggle → reason → reminder → done.

import { CHALLENGES } from '../config/constants.js';
import { STORAGE_KEYS } from '../config/app.js';
import { $, $$ } from '../lib/dom.js';
import { store, writeKey } from '../state/store.js';
import * as notifications from '../services/notifications.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

const TOTAL = 5;
let slide = 0;
let challenge = null;
let wantsReminder = null;
let onDone = () => {};

export function onboardingTemplate() {
  return `
  <div class="modal modal-onboarding" id="onboarding" role="dialog" aria-modal="true" aria-labelledby="obTitle-0" data-dismissible="false" hidden>
    <div class="modal-box onboarding-card">
      <button type="button" class="btn-ob-skip" data-action="ob-skip">Skip</button>

      <div class="slide" data-slide="0">
        <span class="slide-emoji" aria-hidden="true">🌿</span>
        <h2 class="slide-title" id="obTitle-0">Welcome to Vow</h2>
        <p class="slide-sub">A private space to build your streak, one day at a time. Four quick questions to set things up.</p>
        <label class="field-label" for="obName">What should we call you?</label>
        <input class="text-input" id="obName" type="text" placeholder="First name (optional)" maxlength="40" autocomplete="given-name">
      </div>

      <div class="slide" data-slide="1" hidden>
        <span class="slide-emoji" aria-hidden="true">🎯</span>
        <h2 class="slide-title" id="obTitle-1">What's your biggest struggle?</h2>
        <p class="slide-sub">We'll tailor your tips to it.</p>
        <div class="onboarding-options" role="radiogroup" aria-labelledby="obTitle-1">
          ${CHALLENGES.map((c) => `<button type="button" class="option-btn" role="radio" aria-checked="false" data-action="ob-challenge" data-value="${c.id}"><span aria-hidden="true">${c.icon}</span> ${c.label}</button>`).join('')}
        </div>
      </div>

      <div class="slide" data-slide="2" hidden>
        <span class="slide-emoji" aria-hidden="true">💬</span>
        <h2 class="slide-title" id="obTitle-2">Why are you doing this?</h2>
        <p class="slide-sub">One sentence for the hard days. We'll show it on your home screen.</p>
        <label class="visually-hidden" for="obWhy">Your reason</label>
        <textarea class="text-input" id="obWhy" placeholder="e.g. I want to feel free and proud of myself…" maxlength="120"></textarea>
      </div>

      <div class="slide" data-slide="3" hidden>
        <span class="slide-emoji" aria-hidden="true">🔔</span>
        <h2 class="slide-title" id="obTitle-3">Want a daily reminder?</h2>
        <p class="slide-sub">A gentle morning nudge to make your pledge. You can change this any time in Settings.</p>
        <div class="notif-row" role="radiogroup" aria-labelledby="obTitle-3">
          <button type="button" class="btn-notif" role="radio" aria-checked="false" data-action="ob-reminder" data-value="yes">✅ Yes, remind me</button>
          <button type="button" class="btn-notif" role="radio" aria-checked="false" data-action="ob-reminder" data-value="no">No thanks</button>
        </div>
      </div>

      <div class="slide" data-slide="4" hidden>
        <span class="slide-emoji" aria-hidden="true">🚀</span>
        <h2 class="slide-title" id="obTitle-4">You're ready</h2>
        <p class="slide-sub">Tap <strong>Start streak</strong> on the home screen when you're ready to begin. Every day is a fresh chance.</p>
      </div>

      <div class="onboarding-dots" aria-hidden="true">${'<span class="dot"></span>'.repeat(TOTAL)}</div>
      <p class="visually-hidden" id="obProgress" aria-live="polite"></p>
      <div class="onboarding-nav">
        <button type="button" class="btn-ob-back" data-action="ob-back">Back</button>
        <button type="button" class="btn-ob-next" id="obNext" data-action="ob-next">Continue →</button>
      </div>
    </div>
  </div>`;
}

function update() {
  $$('#onboarding .slide').forEach((el) => {
    el.hidden = Number(el.dataset.slide) !== slide;
  });
  $$('#onboarding .dot').forEach((d, i) => d.classList.toggle('active', i === slide));
  $('#onboarding').setAttribute('aria-labelledby', `obTitle-${slide}`);
  $('#obProgress').textContent = `Step ${slide + 1} of ${TOTAL}`;
  $('[data-action="ob-back"]').hidden = slide === 0;
  $('#obNext').textContent = slide === TOTAL - 1 ? 'Enter Vow 🌿' : 'Continue →';
  const focusTarget = slide === 0 ? '#obName' : slide === 2 ? '#obWhy' : '#obNext';
  $(focusTarget)?.focus({ preventScroll: true });
}

function selectIn(selector, value) {
  $$(selector).forEach((b) => {
    const on = b.dataset.value === value;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', String(on));
  });
}

export function showOnboarding(done) {
  if (done) onDone = done;
  slide = 0;
  challenge = null;
  wantsReminder = null;
  const s = store.get();
  $('#obName').value = s.userName || '';
  $('#obWhy').value = s.userWhy || '';
  selectIn('#onboarding .option-btn', s.userChallenge);
  challenge = s.userChallenge || null;
  selectIn('#onboarding .btn-notif', null);
  openModal('onboarding');
  update();
}

function close() {
  writeKey(STORAGE_KEYS.onboardingDone, 'true');
  closeModal('onboarding');
  onDone();
}

async function finish() {
  const name = $('#obName').value.trim();
  const why = $('#obWhy').value.trim();
  store.update((s) => {
    s.userName = name;
    s.userWhy = why;
    s.userChallenge = challenge || '';
  });
  close();
  if (wantsReminder) {
    const granted = await notifications.requestPermission().catch(() => false);
    store.update((s) => (s.notifEnabled = granted));
    if (!granted) toast('Notifications are blocked. You can enable reminders later in Settings.');
  }
  toast(`Welcome${name ? `, ${name}` : ''}! 🌿`);
}

registerActions({
  'ob-next'() {
    if (slide === TOTAL - 1) return finish();
    slide++;
    update();
  },
  'ob-back'() {
    if (slide > 0) slide--;
    update();
  },
  'ob-skip': close,
  'ob-challenge'(el) {
    challenge = el.dataset.value;
    selectIn('#onboarding .option-btn', challenge);
  },
  'ob-reminder'(el) {
    wantsReminder = el.dataset.value === 'yes';
    selectIn('#onboarding .btn-notif', el.dataset.value);
  },
});

// Enter advances (except inside the multi-line reason field).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || $('#onboarding')?.hidden !== false) return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  $('#obNext').click();
});
