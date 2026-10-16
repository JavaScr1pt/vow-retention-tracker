// Light / dark / system theme. CSS does the work via [data-theme]; this module
// only picks the attribute and keeps the browser chrome colour in sync.
// (v3.0 force-set every CSS variable inline from JS, which this replaces.)

import { STORAGE_KEYS } from '../config/app.js';
import { readKey, writeKey } from '../state/store.js';

const COLORS = { dark: '#1A1A1C', light: '#F7F5F0' };
let theme = 'dark';
const media = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

export function getTheme() {
  return theme;
}

export function resolvedTheme(t = theme) {
  if (t === 'system') return media()?.matches ? 'dark' : 'light';
  return t === 'light' ? 'light' : 'dark';
}

export function applyTheme(t = theme) {
  const mode = resolvedTheme(t);
  document.documentElement.setAttribute('data-theme', mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[mode]);
}

export function setTheme(t) {
  theme = ['light', 'dark', 'system'].includes(t) ? t : 'dark';
  writeKey(STORAGE_KEYS.theme, theme);
  applyTheme();
}

export function initTheme() {
  theme = readKey(STORAGE_KEYS.theme) || 'dark';
  applyTheme();
  media()?.addEventListener?.('change', () => theme === 'system' && applyTheme());
}
