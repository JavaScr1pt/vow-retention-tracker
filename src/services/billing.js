// Billing. Real payments go through Stripe Payment Links (set in .env).
// Without them the app runs a clearly-labelled demo checkout that unlocks Pro
// locally — no money moves. A server-verified entitlement is a roadmap item.

import { CONFIG, STORAGE_KEYS } from '../config/app.js';
import { readKey, writeKey } from '../state/store.js';

export function isDemoBilling(plan) {
  return !CONFIG.stripeLinks[plan];
}

/** Open the real checkout for `plan`. Returns false when no link is configured. */
export function openCheckout(plan) {
  const url = CONFIG.stripeLinks[plan];
  if (!url) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}

/** Record a demo purchase. The receipt survives "Reset all data" so Restore works. */
export function recordDemoPurchase(plan) {
  writeKey(STORAGE_KEYS.billingReceipt, JSON.stringify({ plan, at: new Date().toISOString(), demo: true }));
}

export function findReceipt() {
  try {
    return JSON.parse(readKey(STORAGE_KEYS.billingReceipt) || 'null');
  } catch {
    return null;
  }
}

export function clearReceipt() {
  writeKey(STORAGE_KEYS.billingReceipt, null);
}
