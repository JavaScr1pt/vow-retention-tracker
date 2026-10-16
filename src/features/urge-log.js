// "+" button: quick check-in for whether an urge happened, and its trigger.

import { TRIGGERS, XP } from '../config/constants.js';
import { $ } from '../lib/dom.js';
import { today } from '../lib/dates.js';
import { store } from '../state/store.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { awardXP } from './progress.js';
import { guardLocked } from './paywall.js';

let hadUrge = null;

export function urgeTemplate() {
  return `
  <button type="button" class="urge-fab" id="urgeFab" data-action="open-urge" aria-label="Log an urge check-in">+</button>

  <div class="modal" id="urgeLog" role="dialog" aria-modal="true" aria-labelledby="urgeTitle" hidden>
    <div class="modal-box modal-left">
      <h2 class="modal-title" id="urgeTitle">Urge check-in</h2>
      <p class="modal-sub">Did you feel an urge? Honest logs reveal your patterns.</p>
      <div class="urge-yn-row" role="radiogroup" aria-label="Did you have an urge?">
        <button type="button" class="btn-yn" id="btnYes" role="radio" aria-checked="false" data-action="urge-yn" data-value="yes">Yes, I did</button>
        <button type="button" class="btn-yn" id="btnNo" role="radio" aria-checked="false" data-action="urge-yn" data-value="no">No, all clear</button>
      </div>
      <div id="triggerField" hidden>
        <label class="field-label" for="urgeTrigger">What triggered it?</label>
        <select class="text-input select-input" id="urgeTrigger">
          <option value="">Not sure / skip</option>
          ${TRIGGERS.map((t) => `<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="modal-btns">
        <button type="button" class="btn-secondary" data-action="urge-cancel">Cancel</button>
        <button type="button" class="btn-accent" data-action="urge-save">Log it</button>
      </div>
    </div>
  </div>`;
}

function setYN(v) {
  hadUrge = v;
  const yes = $('#btnYes');
  const no = $('#btnNo');
  yes.className = 'btn-yn' + (v === true ? ' selected-yes' : '');
  no.className = 'btn-yn' + (v === false ? ' selected-no' : '');
  yes.setAttribute('aria-checked', String(v === true));
  no.setAttribute('aria-checked', String(v === false));
  $('#triggerField').hidden = v !== true;
}

export function renderUrgeFab(locked) {
  const fab = $('#urgeFab');
  fab.classList.toggle('is-locked', locked);
  fab.setAttribute('aria-label', locked ? 'Urge check-in (trial ended, upgrade to log)' : 'Log an urge check-in');
}

registerActions({
  'open-urge'() {
    if (guardLocked()) return;
    setYN(null);
    $('#urgeTrigger').value = '';
    openModal('urgeLog', { focus: '#btnYes' });
  },
  'urge-yn': (el) => setYN(el.dataset.value === 'yes'),
  'urge-cancel': () => closeModal('urgeLog'),
  'urge-save'() {
    if (hadUrge === null) {
      toast('Choose Yes or No first.');
      $('#btnYes').focus();
      return;
    }
    const trigger = hadUrge ? $('#urgeTrigger').value : '';
    const yes = hadUrge;
    store.update((s) => {
      s.urges.push({ date: today(), at: new Date().toISOString(), hadUrge: yes, trigger });
    });
    closeModal('urgeLog');
    awardXP(XP.urgeLogged, 'Check-in');
    toast(yes ? '💪 Logged. Noticing it is strength.' : '✅ Logged. Keep it up!');
  },
});
