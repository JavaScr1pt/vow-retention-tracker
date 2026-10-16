// Transient status messages. Both regions are aria-live so screen readers
// announce them without stealing focus.

import { $ } from '../lib/dom.js';

export function toastTemplate() {
  return `
  <div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <div class="xp-toast" id="xpToast" role="status" aria-live="polite" aria-atomic="true"></div>`;
}

let toastTimer;
export function toast(msg, ms = 2800) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

let xpTimer;
export function xpToast(msg) {
  const t = $('#xpToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(xpTimer);
  xpTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
