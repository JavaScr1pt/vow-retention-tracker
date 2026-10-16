// Settings: theme, reminders, app lock, data export/import/reset, install
// help, developer tools (demo builds), about.

import { APP, CONFIG, STORAGE_KEYS } from '../config/app.js';
import { fmtHour, today } from '../lib/dates.js';
import { $, $$, downloadFile, esc, show } from '../lib/dom.js';
import { isNative } from '../lib/platform.js';
import { defaultState, migrate, store, writeKey } from '../state/store.js';
import { peakUrgeHour } from '../domain/insights.js';
import { trialStatus } from '../domain/trial.js';
import { buildDemoState } from '../services/demo-data.js';
import { clearReceipt } from '../services/billing.js';
import { isMockFailureOn, setMockFailure } from '../services/leaderboard.js';
import * as notifications from '../services/notifications.js';
import { registerActions } from '../ui/actions.js';
import { confirmDialog } from '../ui/modal.js';
import { getTheme, setTheme } from '../ui/theme.js';
import { toast } from '../ui/toast.js';
import { showOnboarding } from '../features/onboarding.js';
import { disablePin, startPinSetup } from '../features/pin-lock.js';

const row = (label, sub, control, id = '') => `
  <div class="settings-row"${id ? ` id="${id}"` : ''}>
    <div class="settings-row-left"><p class="settings-row-label">${label}</p>${sub ? `<p class="settings-row-sub">${sub}</p>` : ''}</div>
    ${control}
  </div>`;

const toggle = (id, change, label) => `
  <label class="toggle-switch"><input type="checkbox" role="switch" id="${id}" data-change="${change}" aria-label="${label}"><span class="toggle-slider" aria-hidden="true"></span></label>`;

export function settingsTemplate() {
  return `
  <section class="tab-page" id="page-settings" aria-labelledby="settingsTitle" hidden>
    <header class="header"><h1 class="header-title" id="settingsTitle" tabindex="-1"><span aria-hidden="true">⚙️</span> <span>Settings</span></h1></header>

    <h2 class="section-title">Appearance</h2>
    <div class="card settings-card">
      <p class="settings-group-label" id="themeLabel">Theme</p>
      <div class="theme-toggle" role="radiogroup" aria-labelledby="themeLabel">
        <button type="button" class="theme-btn" role="radio" data-action="set-theme" data-theme-value="light">☀️ Light</button>
        <button type="button" class="theme-btn" role="radio" data-action="set-theme" data-theme-value="dark">🌙 Dark</button>
        <button type="button" class="theme-btn" role="radio" data-action="set-theme" data-theme-value="system">🔮 System</button>
      </div>
    </div>

    <h2 class="section-title">Reminders</h2>
    <div class="card settings-card">
      ${row('Daily pledge reminder', `A nudge at ${fmtHour(CONFIG.reminderHour)} if you haven't pledged yet`, toggle('notifToggle', 'toggle-reminders', 'Daily pledge reminder'))}
      ${row('Smart reminder <span class="pro-tag">Pro</span>', '<span id="smartSub">A heads-up before your riskiest hour</span>', toggle('smartNotifToggle', 'toggle-smart', 'Smart reminder'))}
      ${row('Send a test notification', 'Preview what a reminder looks like', '<button type="button" class="btn-settings-action" data-action="test-notification">Test</button>')}
      <p class="settings-note" id="webNotifNote" hidden>On the web, reminders only fire while Vow is open in a tab. Install the mobile app for reliable reminders.</p>
    </div>

    <h2 class="section-title">Privacy &amp; security</h2>
    <div class="card settings-card">
      ${row('App lock (PIN)', 'Ask for a PIN on launch and after 30s in the background', toggle('pinToggle', 'toggle-pin', 'App lock'))}
      ${row('Change PIN', '', '<button type="button" class="btn-settings-action" data-action="change-pin">Change</button>', 'changePinRow')}
      <p class="settings-note">Everything stays on this device. Nothing is uploaded unless you join the leaderboard, which shares only an anonymous ID and your streak.</p>
    </div>

    <h2 class="section-title">Your data</h2>
    <div class="card settings-card">
      ${row('Export data', 'Download a JSON backup of everything', '<button type="button" class="btn-settings-action" data-action="export-data">Export</button>')}
      ${row('Import data', 'Restore from a Vow backup file', '<button type="button" class="btn-settings-action" data-action="import-data">Import</button>')}
      <input type="file" id="importFile" accept="application/json,.json" data-change="import-file" hidden>
      ${row('Reset all data', 'Erase streaks, history and preferences', '<button type="button" class="btn-danger" data-action="reset-data">Reset</button>')}
    </div>

    <div id="installSection">
      <h2 class="section-title">Add to home screen</h2>
      <div class="card settings-card">
        <p class="settings-group-label">📱 iPhone / iPad (Safari)</p>
        <ol class="hs-steps">
          <li>Open this page in <strong>Safari</strong></li>
          <li>Tap <strong>Share</strong> (the square with an arrow)</li>
          <li>Choose <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong>. Vow appears on your home screen</li>
        </ol>
        <p class="settings-group-label">🤖 Android (Chrome)</p>
        <ol class="hs-steps">
          <li>Open this page in <strong>Chrome</strong></li>
          <li>Tap the <strong>⋮</strong> menu</li>
          <li>Choose <strong>Add to Home screen</strong> and confirm</li>
        </ol>
      </div>
    </div>

    <div id="devSection" hidden>
      <h2 class="section-title">Developer <span class="dev-tag">Demo tools</span></h2>
      <div class="card settings-card">
        ${row('Load demo data', 'Two weeks of realistic history (replaces your data)', '<button type="button" class="btn-settings-action" data-action="dev-seed">Load</button>')}
        ${row('Pro status', '<span id="devProSub"></span>', '<button type="button" class="btn-settings-action" data-action="dev-toggle-pro">Toggle</button>')}
        ${row('Replay onboarding', '', '<button type="button" class="btn-settings-action" data-action="dev-onboarding">Show</button>')}
        ${row('Simulate leaderboard API failure', 'Shows the error state on Insights', toggle('devFailToggle', 'dev-toggle-fail', 'Simulate API failure'))}
      </div>
    </div>

    <h2 class="section-title">About</h2>
    <div class="card settings-card">
      ${row('Version', esc(APP.fullName), `<span class="settings-value">${APP.version}</span>`)}
      ${row('Privacy policy', '', `<a class="settings-link" href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener">View →</a>`)}
      ${row('Contact', esc(CONFIG.supportEmail), `<a class="settings-link" href="mailto:${esc(CONFIG.supportEmail)}">Email →</a>`)}
    </div>
  </section>`;
}

export function renderSettings(s = store.get()) {
  const theme = getTheme();
  $$('.theme-btn').forEach((b) => {
    const on = b.dataset.themeValue === theme;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  $('#notifToggle').checked = Boolean(s.notifEnabled);
  $('#smartNotifToggle').checked = Boolean(s.smartNotif);
  $('#smartSub').textContent = s.smartNotif && s.smartNotifHour !== null ? `Set for ${fmtHour(s.smartNotifHour)}, an hour before your usual peak` : 'A heads-up an hour before your riskiest time';
  $('#pinToggle').checked = Boolean(s.pinEnabled);
  show('#changePinRow', Boolean(s.pinEnabled));
  show('#webNotifNote', !isNative() && s.notifEnabled);
  show('#installSection', !isNative());
  show('#devSection', CONFIG.demoTools);
  if (CONFIG.demoTools) {
    $('#devProSub').textContent = trialStatus(s).isPro ? 'Currently Pro' : 'Currently on the free trial';
    $('#devFailToggle').checked = isMockFailureOn();
  }
}

/** Re-sync OS / in-page reminders with the current settings. */
export function syncAllReminders() {
  return notifications
    .syncReminders({
      dailyHour: CONFIG.reminderHour,
      smartHour: store.get().smartNotifHour,
      getState: () => store.get(),
      markReminded: (key) => store.update((s) => (s.lastReminderDate = key)),
    })
    .catch((err) => console.warn('[reminders]', err));
}

function validateBackup(parsed) {
  const data = parsed && typeof parsed === 'object' && parsed.state ? parsed.state : parsed;
  if (!data || typeof data !== 'object' || !Array.isArray(data.relapses) || !('startDate' in data)) {
    throw new Error("This doesn't look like a Vow backup file.");
  }
  return { data, theme: parsed.theme };
}

registerActions({
  'set-theme'(el) {
    setTheme(el.dataset.themeValue);
    renderSettings();
  },
  'test-notification': async () => {
    if (!notifications.isSupported()) return toast('Notifications aren’t supported in this browser.');
    if (!(await notifications.requestPermission())) return toast('Notifications are blocked. Allow them in your browser or OS settings.');
    await notifications.notifyNow(...notifications.REMINDER_COPY.daily);
    toast('Test notification sent');
  },
  'change-pin': () => startPinSetup(true),
  'export-data'() {
    const payload = { app: 'vow', exportedAt: new Date().toISOString(), version: APP.version, state: store.get(), theme: getTheme() };
    downloadFile(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `vow-backup-${today()}.json`);
    toast('✅ Backup downloaded');
  },
  'import-data': () => $('#importFile').click(),
  async 'reset-data'() {
    const ok = await confirmDialog({
      title: 'Reset all data?',
      body: 'This permanently erases your streaks, XP, quests and history on this device. Export a backup first if you might want it back.',
      confirmLabel: 'Erase everything',
    });
    if (!ok) return;
    // Keep theme and purchase receipt: those belong to the device, not the journey.
    writeKey(STORAGE_KEYS.onboardingDone, null);
    store.replace(defaultState());
    toast('All data has been reset.');
    setTimeout(showOnboarding, 400);
  },
  async 'dev-seed'() {
    const ok = await confirmDialog({ icon: '🧪', title: 'Load demo data?', body: 'This replaces your current data with two weeks of sample history.', confirmLabel: 'Load demo', tone: 'accent' });
    if (!ok) return;
    store.replace(buildDemoState());
    writeKey(STORAGE_KEYS.onboardingDone, 'true');
    toast('🧪 Demo data loaded. Check Home and Insights.');
  },
  'dev-toggle-pro'() {
    const next = !store.get().isPro;
    store.update((s) => (s.isPro = next));
    if (!next) clearReceipt();
    toast(next ? 'Pro enabled (demo)' : 'Back on the free trial');
  },
  'dev-onboarding': () => showOnboarding(),
});

registerActions(
  {
    async 'toggle-reminders'(el) {
      if (!el.checked) {
        store.update((s) => (s.notifEnabled = false));
        await syncAllReminders();
        return toast('Daily reminder off');
      }
      if (!notifications.isSupported()) {
        el.checked = false;
        return toast('Notifications aren’t supported in this browser.');
      }
      const granted = await notifications.requestPermission();
      store.update((s) => (s.notifEnabled = granted));
      await syncAllReminders();
      toast(granted ? `🔔 Daily reminder set for ${fmtHour(CONFIG.reminderHour)}` : 'Notifications are blocked. Allow them in settings to use reminders.');
    },
    async 'toggle-smart'(el) {
      const s = store.get();
      if (!el.checked) {
        store.update((st) => (st.smartNotif = false));
        await syncAllReminders();
        return toast('Smart reminder off');
      }
      if (!s.isPro && !trialStatus(s).active) {
        el.checked = false;
        return toast('Smart reminders are a Pro feature.');
      }
      if (!(await notifications.requestPermission())) {
        el.checked = false;
        return toast('Allow notifications first.');
      }
      const peak = peakUrgeHour(s);
      const hour = ((peak ?? 22) + 23) % 24; // one hour before the peak
      store.update((st) => {
        st.smartNotif = true;
        st.smartNotifHour = hour;
      });
      await syncAllReminders();
      toast(peak === null ? `🧠 Set for ${fmtHour(hour)}. It'll adapt as you log urges.` : `🧠 Set for ${fmtHour(hour)}, just before your usual peak.`);
    },
    'toggle-pin'(el) {
      if (el.checked) startPinSetup(false);
      else disablePin();
    },
    'import-file'(el) {
      const file = el.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onerror = () => toast('❌ Could not read that file.');
      reader.onload = async () => {
        el.value = '';
        try {
          const { data, theme } = validateBackup(JSON.parse(String(reader.result)));
          const ok = await confirmDialog({ icon: '📥', title: 'Import this backup?', body: `It contains ${data.relapses.length} relapse entries and ${(data.urges || []).length} check-ins, and will replace your current data.`, confirmLabel: 'Import', tone: 'accent' });
          if (!ok) return;
          store.replace(migrate(data));
          if (theme) setTheme(theme);
          writeKey(STORAGE_KEYS.onboardingDone, 'true');
          renderSettings();
          toast('✅ Backup imported');
        } catch (err) {
          toast(`❌ ${err instanceof SyntaxError ? 'That file isn’t valid JSON.' : err.message}`);
        }
      };
      reader.readAsText(file);
    },
    'dev-toggle-fail'(el) {
      setMockFailure(el.checked);
      toast(el.checked ? 'Leaderboard API will fail' : 'Leaderboard API restored');
    },
  },
  'change',
);
