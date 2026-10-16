// Entry point: mount the app shell, wire events, load state, start the
// first-run / lock / upsell flows. Boot order matters and is commented below.

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/overlays.css';

import { STORAGE_KEYS } from './config/app.js';
import { $ } from './lib/dom.js';
import { readKey, store } from './state/store.js';
import { isLocked } from './domain/trial.js';
import { bindActions, registerActions } from './ui/actions.js';
import { confirmTemplate, initModals } from './ui/modal.js';
import { currentRoute, initRouter, navigate, onRoute } from './ui/router.js';
import { initTheme } from './ui/theme.js';
import { toast, toastTemplate } from './ui/toast.js';
import { initParticles } from './ui/particles.js';
import { homeTemplate, renderHome } from './screens/home.js';
import { insightsTemplate, renderInsights } from './screens/insights.js';
import { profileTemplate, renderProfile } from './screens/profile.js';
import { renderSettings, settingsTemplate, syncAllReminders } from './screens/settings.js';
import { onboardingTemplate, showOnboarding } from './features/onboarding.js';
import { maybeShowDay3Upsell, paywallTemplate } from './features/paywall.js';
import { initPinLock, lockNow, pinTemplate } from './features/pin-lock.js';
import { syncProgress } from './features/progress.js';
import { relapseTemplate } from './features/relapse.js';
import { shareTemplate } from './features/share-card.js';
import { renderUrgeFab, urgeTemplate } from './features/urge-log.js';

const TABS = [
  { route: 'home', icon: '🏠', label: 'Home' },
  { route: 'insights', icon: '📊', label: 'Insights' },
  { route: 'profile', icon: '🏆', label: 'Profile' },
  { route: 'settings', icon: '⚙️', label: 'Settings' },
];

const RENDERERS = { home: renderHome, insights: renderInsights, profile: renderProfile, settings: renderSettings };

function shell() {
  return `
  <canvas id="particleCanvas" aria-hidden="true"></canvas>
  <a class="skip-link" href="#main">Skip to content</a>
  <main class="app" id="main">
    ${homeTemplate()}
    ${insightsTemplate()}
    ${profileTemplate()}
    ${settingsTemplate()}
  </main>
  <nav class="tab-nav" aria-label="Main">
    <div class="tab-nav-inner">
      ${TABS.map((t) => `<button type="button" class="tab-btn" data-action="nav" data-route="${t.route}"><span class="tab-icon" aria-hidden="true">${t.icon}</span><span class="tab-lbl">${t.label}</span></button>`).join('')}
    </div>
  </nav>
  ${urgeTemplate()}
  ${relapseTemplate()}
  ${paywallTemplate()}
  ${shareTemplate()}
  ${pinTemplate()}
  ${onboardingTemplate()}
  ${confirmTemplate()}
  ${toastTemplate()}`;
}

/** Re-render whatever is on screen. Cheap: targeted DOM writes only. */
function refresh() {
  const s = store.get();
  RENDERERS[currentRoute()]?.(s);
  renderUrgeFab(isLocked(s));
}

function boot() {
  // 1. Theme first so nothing paints in the wrong colours.
  initTheme();

  // 2. Mount markup, then wire global behaviour.
  $('#root').innerHTML = shell();
  bindActions(document);
  initModals();
  initPinLock();
  initParticles($('#particleCanvas'));

  // 3. Load state. Storage failures are surfaced, never silently swallowed.
  const { recovered } = store.init({
    onError: () => toast("⚠️ Couldn't save. Storage may be full or blocked in this browser."),
  });

  // 4. Every change → re-render the visible screen, then grant any rewards.
  store.subscribe(() => {
    refresh();
    queueMicrotask(syncProgress);
  });

  // 5. Routing. Each screen renders on entry (Insights also fetches the leaderboard).
  for (const name of Object.keys(RENDERERS)) onRoute(name, () => RENDERERS[name](store.get()));
  onRoute('insights', () => renderInsights(store.get(), { withLeaderboard: true }));
  initRouter();
  renderUrgeFab(isLocked(store.get()));

  // 6. First-run flows: lock screen beats onboarding beats upsell.
  lockNow();
  const afterOnboarding = () => {
    syncProgress();
    maybeShowDay3Upsell();
  };
  if (readKey(STORAGE_KEYS.onboardingDone) !== 'true') showOnboarding(afterOnboarding);
  else afterOnboarding();
  if (recovered) toast('⚠️ Your saved data was unreadable. A copy was kept and the app started fresh.', 5000);

  syncAllReminders();

  // 7. Keep date-based UI honest if the app stays open past midnight.
  let lastDay = new Date().toDateString();
  setInterval(() => {
    const d = new Date().toDateString();
    if (d !== lastDay) {
      lastDay = d;
      refresh();
      syncProgress();
    }
  }, 60_000);
  document.addEventListener('visibilitychange', () => !document.hidden && refresh());

  document.body.classList.add('ready');
}

registerActions({ nav: (el) => navigate(el.dataset.route) });

// Last-resort error surface: log for developers, a calm message for users.
window.addEventListener('vow:error', (e) => {
  console.error(e.detail);
  toast('Something went wrong. Please try again.');
});
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});

try {
  boot();
} catch (err) {
  console.error(err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div class="boot-error" role="alert"><h1>Vow couldn't start</h1><p>Try reloading the page. If this keeps happening, export your data from a working device or contact support.</p><pre>${String(err?.message || err).replace(/[<>&]/g, '')}</pre></div>`;
  }
}
