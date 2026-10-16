// Event delegation. Markup declares intent with data attributes and features
// register handlers by name. This replaces v3.0's inline onclick="…" globals.
//
//   <button data-action="pledge">          → click handler "pledge"
//   <input data-change="toggle-reminders">  → change handler "toggle-reminders"
//   <input data-input="note-length">        → input handler

const handlers = { click: {}, change: {}, input: {} };

export function registerActions(map, type = 'click') {
  for (const [name, fn] of Object.entries(map)) {
    if (handlers[type][name]) console.warn(`[actions] "${name}" registered twice`);
    handlers[type][name] = fn;
  }
}

function dispatch(type, attr) {
  return async (event) => {
    const el = event.target.closest?.(`[${attr}]`);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const name = el.getAttribute(attr);
    const fn = handlers[type][name];
    if (!fn) {
      console.warn(`[actions] no ${type} handler for "${name}"`);
      return;
    }
    try {
      await fn(el, event);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('vow:error', { detail: err }));
    }
  };
}

export function bindActions(root = document) {
  root.addEventListener('click', dispatch('click', 'data-action'));
  root.addEventListener('change', dispatch('change', 'data-change'));
  root.addEventListener('input', dispatch('input', 'data-input'));
}
