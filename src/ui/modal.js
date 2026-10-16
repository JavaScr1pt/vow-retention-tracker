// Accessible modals: focus moves in on open and back on close, Tab is trapped,
// Escape and backdrop clicks close dismissible dialogs.
//
// Markup contract:
//   <div class="modal" id="x" role="dialog" aria-modal="true" aria-labelledby="…" hidden
//        [data-dismissible="false"]>
//     <div class="modal-box">…</div>
//   </div>

import { $, esc } from '../lib/dom.js';

const stack = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

function focusables(el) {
  return Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
}

export function isOpen(id) {
  return stack.some((m) => m.id === id);
}

export function openModal(id, { focus } = {}) {
  const el = document.getElementById(id);
  if (!el || isOpen(id)) return;
  stack.push({ id, returnTo: document.activeElement });
  el.hidden = false;
  el.classList.add('show');
  document.body.classList.add('modal-open');
  // Synchronous on purpose: focus() flushes styles, and rAF is paused in
  // background tabs, which would leave keystrokes going nowhere.
  const target = (focus && el.querySelector(focus)) || el.querySelector('[autofocus]') || focusables(el)[0];
  target?.focus({ preventScroll: true });
}

export function closeModal(id) {
  const idx = stack.findIndex((m) => m.id === id);
  if (idx === -1) return;
  const [entry] = stack.splice(idx, 1);
  const el = document.getElementById(id);
  el.classList.remove('show');
  el.hidden = true;
  if (!stack.length) document.body.classList.remove('modal-open');
  if (entry.returnTo && document.contains(entry.returnTo)) entry.returnTo.focus?.({ preventScroll: true });
  el.dispatchEvent(new CustomEvent('modal:close'));
}

export function closeTopModal() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  const el = document.getElementById(top.id);
  if (el?.dataset.dismissible === 'false') return false;
  closeModal(top.id);
  return true;
}

export function initModals() {
  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') {
      if (closeTopModal()) e.preventDefault();
      return;
    }
    if (e.key === 'Tab') {
      const el = document.getElementById(top.id);
      const items = focusables(el);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });
  document.addEventListener('click', (e) => {
    const el = e.target;
    if (el.classList?.contains('modal') && el.classList.contains('show') && el.dataset.dismissible !== 'false') {
      closeModal(el.id);
    }
  });
}

// ── Generic confirm dialog ─────────────────────────────────────

export function confirmTemplate() {
  return `
  <div class="modal" id="confirmDialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmBody" hidden>
    <div class="modal-box">
      <div class="modal-icon" id="confirmIcon" aria-hidden="true"></div>
      <h2 class="modal-title" id="confirmTitle"></h2>
      <p class="modal-sub" id="confirmBody"></p>
      <div class="modal-btns">
        <button type="button" class="btn-secondary" id="confirmCancel">Cancel</button>
        <button type="button" class="btn-danger-solid" id="confirmOk"></button>
      </div>
    </div>
  </div>`;
}

/** Promise-based confirm. tone: 'danger' (red) | 'accent' (green). */
export function confirmDialog({ icon = '⚠️', title, body = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger' }) {
  return new Promise((resolve) => {
    const el = $('#confirmDialog');
    $('#confirmIcon').textContent = icon;
    $('#confirmTitle').textContent = title;
    $('#confirmBody').innerHTML = esc(body).replace(/\n/g, '<br>');
    const ok = $('#confirmOk');
    const cancel = $('#confirmCancel');
    ok.textContent = confirmLabel;
    cancel.textContent = cancelLabel;
    ok.className = tone === 'danger' ? 'btn-danger-solid' : 'btn-accent';

    let result = false;
    const finish = (value) => {
      result = value;
      closeModal('confirmDialog');
    };
    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    el.addEventListener('modal:close', () => resolve(result), { once: true });
    openModal('confirmDialog', { focus: tone === 'danger' ? '#confirmCancel' : '#confirmOk' });
  });
}
