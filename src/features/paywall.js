// Paywall, plan selection, demo/real checkout, restore, and the day-3 upsell.

import { PLANS, PRO_FEATURES } from '../config/constants.js';
import { $, $$, setText } from '../lib/dom.js';
import { store } from '../state/store.js';
import { currentStreak } from '../domain/streak.js';
import { isLocked, trialStatus } from '../domain/trial.js';
import { findReceipt, isDemoBilling, openCheckout, recordDemoPurchase } from '../services/billing.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, confirmDialog, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

let selectedPlan = 'yearly';

export function paywallTemplate() {
  return `
  <div class="modal modal-sheet" id="paywall" role="dialog" aria-modal="true" aria-labelledby="paywallTitle" hidden>
    <div class="modal-box paywall-modal">
      <img src="icons/vow-logo.svg" alt="" class="paywall-logo" width="88" height="88">
      <h2 class="paywall-title" id="paywallTitle">Upgrade to Vow Pro</h2>
      <p class="paywall-sub" id="paywallSub"></p>
      <div class="paywall-plans" role="radiogroup" aria-label="Choose a plan">
        ${PLANS.map(
          (p) => `
          <button type="button" class="plan-card${p.id === selectedPlan ? ' selected' : ''}" role="radio"
            aria-checked="${p.id === selectedPlan}" data-action="select-plan" data-plan="${p.id}">
            ${p.badge ? `<span class="plan-badge">${p.badge}</span>` : ''}
            <span class="plan-name">${p.name}</span>
            <span class="plan-price">${p.price}</span>
            <span class="plan-per">${p.per}</span>
          </button>`,
        ).join('')}
      </div>
      <ul class="paywall-features">
        ${PRO_FEATURES.map((f) => `<li><span class="feature-check" aria-hidden="true">✓</span> ${f}</li>`).join('')}
      </ul>
      <button type="button" class="btn-subscribe" data-action="checkout">Get Vow Pro</button>
      <p class="demo-note" id="billingDemoNote" hidden>Demo build: no payment provider is configured, so checkout unlocks Pro locally.</p>
      <div class="paywall-links">
        <button type="button" class="link-btn" data-action="restore-purchase">Restore purchase</button>
        <button type="button" class="link-btn" data-action="close-paywall">Maybe later</button>
      </div>
      <p class="paywall-terms">Cancel anytime. By subscribing you agree to our Terms &amp; Privacy Policy.</p>
    </div>
  </div>

  <div class="modal" id="trialUpsell" role="dialog" aria-modal="true" aria-labelledby="upsellTitle" hidden>
    <div class="modal-box">
      <div class="modal-icon" aria-hidden="true">🎁</div>
      <h2 class="modal-title" id="upsellTitle">3 days strong! 🎉</h2>
      <p class="modal-sub">You've built real momentum. Vow Pro adds unlimited logging, pattern insights, quests and streak freezes to help you keep it.</p>
      <button type="button" class="btn-subscribe" data-action="upsell-to-paywall">See Pro plans</button>
      <button type="button" class="link-btn" data-action="close-upsell">Not now</button>
    </div>
  </div>`;
}

export function showPaywall() {
  const t = trialStatus(store.get());
  if (t.isPro) {
    toast('✨ Vow Pro is active. Thanks for your support!');
    return;
  }
  setText(
    '#paywallSub',
    t.ended
      ? 'Your free trial has ended. Upgrade to keep logging and unlock everything.'
      : `You have ${t.relapsesLeft} relapse log${t.relapsesLeft === 1 ? '' : 's'} left in your free trial. Upgrade any time.`,
  );
  $('#billingDemoNote').hidden = !isDemoBilling(selectedPlan);
  openModal('paywall', { focus: '.btn-subscribe' });
}

/** Returns true (and nudges to upgrade) when a logging action is blocked. */
export function guardLocked() {
  if (!isLocked(store.get())) return false;
  toast('🔒 Your trial has ended. Upgrade to keep logging.');
  showPaywall();
  return true;
}

/** One-time upsell once the user reaches a 3-day streak. */
export function maybeShowDay3Upsell() {
  const s = store.get();
  if (s.shownDay3Trial || s.isPro || currentStreak(s) < 3) return;
  store.update((st) => {
    st.shownDay3Trial = true;
  });
  setTimeout(() => openModal('trialUpsell'), 800);
}

function unlockPro(message) {
  store.update((s) => {
    s.isPro = true;
  });
  closeModal('paywall');
  toast(message);
}

registerActions({
  'open-paywall': showPaywall,
  'close-paywall': () => closeModal('paywall'),
  'close-upsell': () => closeModal('trialUpsell'),
  'upsell-to-paywall': () => {
    closeModal('trialUpsell');
    showPaywall();
  },
  'select-plan'(el) {
    selectedPlan = el.dataset.plan;
    $$('.plan-card').forEach((c) => {
      const on = c.dataset.plan === selectedPlan;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-checked', String(on));
    });
    $('#billingDemoNote').hidden = !isDemoBilling(selectedPlan);
  },
  async checkout() {
    if (openCheckout(selectedPlan)) {
      toast('Checkout opened in a new tab. Tap "Restore purchase" when you\'re done.');
      return;
    }
    const plan = PLANS.find((p) => p.id === selectedPlan);
    const ok = await confirmDialog({
      icon: '🧪',
      title: 'Demo checkout',
      body: `No payment provider is configured in this build.\nUnlock Pro (${plan.name}, ${plan.price}) locally for testing? No money is charged.`,
      confirmLabel: 'Unlock Pro',
      tone: 'accent',
    });
    if (!ok) return;
    recordDemoPurchase(selectedPlan);
    unlockPro('✨ Welcome to Vow Pro!');
  },
  'restore-purchase'() {
    if (findReceipt()) unlockPro('✅ Pro access restored');
    else toast('No purchase found on this device.');
  },
});
