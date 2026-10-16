// App lock: PIN setup/change, the lock screen, and auto-lock on resume.
// Supports on-screen keypad and physical keyboard (digits, Backspace).

import { PIN_TIMEOUT_MS } from '../config/constants.js';
import { STORAGE_KEYS } from '../config/app.js';
import { $, $$, setText } from '../lib/dom.js';
import { hashPin, randomSalt, verifyPin } from '../lib/pin.js';
import { defaultState, store, writeKey } from '../state/store.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, confirmDialog, isOpen, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

let lockBuffer = '';
let setupBuffer = '';
let setupFirst = '';
let setupPhase = 0;
let backgroundedAt = null;
let busy = false;

const keypad = (prefix) => `
  <div class="pin-pad" role="group" aria-label="Keypad">
    ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<button type="button" class="pin-key" data-action="${prefix}-key" data-key="${k}">${k}</button>`).join('')}
    <span class="pin-key empty" aria-hidden="true"></span>
    <button type="button" class="pin-key" data-action="${prefix}-key" data-key="0">0</button>
    <button type="button" class="pin-key del" data-action="${prefix}-del" aria-label="Delete last digit">⌫</button>
  </div>`;

const dots = (id) => `<div class="pin-dots" id="${id}" aria-hidden="true">${'<span class="pin-dot"></span>'.repeat(4)}</div>`;

export function pinTemplate() {
  return `
  <div class="modal pin-screen" id="pinLock" role="dialog" aria-modal="true" aria-labelledby="pinLockTitle" data-dismissible="false" hidden>
    <div class="pin-inner">
      <div class="pin-lock-icon" aria-hidden="true">🔒</div>
      <h2 class="pin-title" id="pinLockTitle">Vow is locked</h2>
      <p class="pin-sub">Enter your PIN to continue</p>
      ${dots('pinLockDots')}
      ${keypad('lock')}
      <p class="pin-error" id="pinLockError" role="alert"></p>
      <button type="button" class="link-btn" data-action="pin-forgot">Forgot PIN?</button>
    </div>
  </div>

  <div class="modal" id="pinSetup" role="dialog" aria-modal="true" aria-labelledby="pinSetupTitle" hidden>
    <div class="modal-box">
      <div class="modal-icon" aria-hidden="true">🔐</div>
      <h2 class="modal-title" id="pinSetupTitle">Set a 4-digit PIN</h2>
      <p class="modal-sub" id="pinSetupSub" aria-live="polite">Enter a new 4-digit PIN</p>
      ${dots('pinSetupDots')}
      ${keypad('setup')}
      <p class="pin-error" id="pinSetupError" role="alert"></p>
      <button type="button" class="btn-secondary btn-block" data-action="setup-cancel">Cancel</button>
    </div>
  </div>`;
}

function paintDots(id, n) {
  $$(`#${id} .pin-dot`).forEach((d, i) => d.classList.toggle('filled', i < n));
}

// ── Lock screen ───────────────────────────────────────────────

export function lockNow() {
  const s = store.get();
  if (!s.pinEnabled || !s.pinHash || isOpen('pinLock')) return;
  lockBuffer = '';
  paintDots('pinLockDots', 0);
  setText('#pinLockError', '');
  openModal('pinLock', { focus: '.pin-key' });
}

async function lockKey(k) {
  if (busy || lockBuffer.length >= 4) return;
  lockBuffer += k;
  paintDots('pinLockDots', lockBuffer.length);
  if (lockBuffer.length < 4) return;
  busy = true;
  const s = store.get();
  const ok = await verifyPin(lockBuffer, s);
  busy = false;
  if (ok) {
    // Opportunistically upgrade a legacy v3.0 hash.
    if (s.pinAlgo !== 'sha256') await savePin(lockBuffer);
    lockBuffer = '';
    closeModal('pinLock');
    return;
  }
  lockBuffer = '';
  $('#pinLockDots').classList.add('shake');
  setTimeout(() => {
    $('#pinLockDots').classList.remove('shake');
    paintDots('pinLockDots', 0);
  }, 400);
  setText('#pinLockError', 'Incorrect PIN. Try again.');
}

// ── Setup / change ────────────────────────────────────────────

async function savePin(pin) {
  const salt = randomSalt();
  const { algo, hash } = await hashPin(pin, salt);
  store.update((s) => {
    s.pinEnabled = true;
    s.pinHash = hash;
    s.pinAlgo = algo;
    s.pinSalt = salt;
  });
}

export function startPinSetup(changing) {
  setupBuffer = '';
  setupFirst = '';
  setupPhase = 0;
  setText('#pinSetupTitle', changing ? 'Change your PIN' : 'Set a 4-digit PIN');
  setText('#pinSetupSub', 'Enter a new 4-digit PIN');
  setText('#pinSetupError', '');
  paintDots('pinSetupDots', 0);
  openModal('pinSetup', { focus: '.pin-key' });
  $('#pinSetup').addEventListener(
    'modal:close',
    () => {
      $('#pinToggle').checked = store.get().pinEnabled;
    },
    { once: true },
  );
}

async function setupKey(k) {
  if (busy || setupBuffer.length >= 4) return;
  setupBuffer += k;
  paintDots('pinSetupDots', setupBuffer.length);
  if (setupBuffer.length < 4) return;
  await new Promise((r) => setTimeout(r, 120));
  if (setupPhase === 0) {
    setupFirst = setupBuffer;
    setupBuffer = '';
    setupPhase = 1;
    setText('#pinSetupSub', 'Enter it again to confirm');
    setText('#pinSetupError', '');
    paintDots('pinSetupDots', 0);
    return;
  }
  if (setupBuffer !== setupFirst) {
    setText('#pinSetupError', "PINs didn't match. Let's start over.");
    setText('#pinSetupSub', 'Enter a new 4-digit PIN');
    setupBuffer = '';
    setupFirst = '';
    setupPhase = 0;
    paintDots('pinSetupDots', 0);
    return;
  }
  busy = true;
  await savePin(setupBuffer);
  busy = false;
  closeModal('pinSetup');
  toast('🔒 App lock is on');
}

export function disablePin() {
  store.update((s) => {
    s.pinEnabled = false;
    s.pinHash = null;
    s.pinAlgo = null;
    s.pinSalt = null;
  });
  toast('App lock turned off');
}

export function initPinLock() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) backgroundedAt = Date.now();
    else {
      if (backgroundedAt && Date.now() - backgroundedAt > PIN_TIMEOUT_MS) lockNow();
      backgroundedAt = null;
    }
  });
  document.addEventListener('keydown', (e) => {
    const target = isOpen('pinLock') ? 'lock' : isOpen('pinSetup') ? 'setup' : null;
    if (!target) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      (target === 'lock' ? lockKey : setupKey)(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (target === 'lock') {
        lockBuffer = lockBuffer.slice(0, -1);
        paintDots('pinLockDots', lockBuffer.length);
      } else {
        setupBuffer = setupBuffer.slice(0, -1);
        paintDots('pinSetupDots', setupBuffer.length);
      }
    }
  });
}

registerActions({
  'lock-key': (el) => lockKey(el.dataset.key),
  'lock-del'() {
    lockBuffer = lockBuffer.slice(0, -1);
    paintDots('pinLockDots', lockBuffer.length);
  },
  'setup-key': (el) => setupKey(el.dataset.key),
  'setup-del'() {
    setupBuffer = setupBuffer.slice(0, -1);
    paintDots('pinSetupDots', setupBuffer.length);
  },
  'setup-cancel': () => closeModal('pinSetup'),
  async 'pin-forgot'() {
    const ok = await confirmDialog({
      title: 'Forgot your PIN?',
      body: "There's no way to recover a PIN: your data never leaves this device. You can erase all data and start fresh.",
      confirmLabel: 'Erase & start over',
    });
    if (!ok) return;
    writeKey(STORAGE_KEYS.onboardingDone, null);
    store.replace(defaultState());
    closeModal('pinLock');
    location.reload();
  },
});
