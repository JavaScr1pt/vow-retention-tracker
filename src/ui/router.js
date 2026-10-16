// Tab routing with URL hashes (#/home, #/insights, …), so the back button and
// deep links work. Screens register a render callback that runs on entry.

import { $$ } from '../lib/dom.js';

export const ROUTES = ['home', 'insights', 'profile', 'settings'];
const onEnter = {};
let current = 'home';

export function onRoute(name, fn) {
  onEnter[name] = fn;
}

export function currentRoute() {
  return current;
}

function routeFromHash() {
  const name = location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(name) ? name : 'home';
}

export function navigate(name) {
  if (!ROUTES.includes(name)) name = 'home';
  if (location.hash !== `#/${name}`) history.pushState(null, '', `#/${name}`);
  activate(name);
}

function activate(name, { focus = true } = {}) {
  const changed = name !== current;
  current = name;
  $$('.tab-page').forEach((p) => {
    p.hidden = p.id !== `page-${name}`;
  });
  $$('.tab-btn').forEach((b) => {
    const active = b.dataset.route === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-current', active ? 'page' : 'false');
  });
  onEnter[name]?.();
  if (changed) {
    window.scrollTo({ top: 0 });
    // Move focus to the screen heading so keyboard/screen-reader users land in context.
    if (focus) document.querySelector(`#page-${name} h1`)?.focus({ preventScroll: true });
  }
}

export function initRouter() {
  // Back/forward between pushState entries changes the fragment, so hashchange covers both.
  window.addEventListener('hashchange', () => activate(routeFromHash()));
  current = '';
  activate(routeFromHash(), { focus: false });
}
