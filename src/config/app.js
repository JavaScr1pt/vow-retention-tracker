// Runtime configuration. Every value has a default so the app runs on first
// clone without a .env file — see .env.example for what each one does.

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

function str(key, fallback) {
  const v = env[key];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;
}

function int(key, fallback, min, max) {
  const n = Number.parseInt(env[key], 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const APP = Object.freeze({
  name: 'Vow',
  fullName: 'Vow — Retention Tracker',
  version: '3.1.0',
});

export const CONFIG = Object.freeze({
  apiBaseUrl: str('VITE_API_BASE_URL', ''),
  mockLatencyMs: int('VITE_MOCK_LATENCY_MS', 450, 0, 10000),
  stripeLinks: Object.freeze({
    monthly: str('VITE_STRIPE_LINK_MONTHLY', ''),
    yearly: str('VITE_STRIPE_LINK_YEARLY', ''),
    lifetime: str('VITE_STRIPE_LINK_LIFETIME', ''),
  }),
  eveningHour: int('VITE_EVENING_HOUR', 20, 0, 23),
  reminderHour: int('VITE_REMINDER_HOUR', 9, 0, 23),
  demoTools: Boolean(env.DEV) || str('VITE_ENABLE_DEMO_TOOLS', 'false') === 'true',
  privacyUrl: str('VITE_PRIVACY_URL', 'https://example.com/privacy'),
  supportEmail: str('VITE_SUPPORT_EMAIL', 'hello@vow.app'),
  inviteBaseUrl: str('VITE_INVITE_BASE_URL', 'https://vow.app/invite'),
});

/** localStorage keys. `vow_v1` is kept from v3.0 so existing users keep their data. */
export const STORAGE_KEYS = Object.freeze({
  state: 'vow_v1',
  theme: 'vow_theme',
  onboardingDone: 'vow_onboarding_done',
  billingReceipt: 'vow_billing_receipt',
  corruptBackup: 'vow_v1_corrupt_backup',
});
