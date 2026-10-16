// Tiny DOM helpers. No framework: templates are strings, updates are targeted.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape user-provided text before it goes into an HTML string. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function setText(sel, text) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.textContent = String(text);
}

export function setHTML(sel, html) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.innerHTML = html;
}

export function show(sel, visible = true) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.hidden = !visible;
}

/** Trigger a browser download for a Blob or data URL. */
export function downloadFile(href, filename) {
  const a = document.createElement('a');
  const url = href instanceof Blob ? URL.createObjectURL(href) : href;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (href instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy') ?? false;
    ta.remove();
    return ok;
  }
}
