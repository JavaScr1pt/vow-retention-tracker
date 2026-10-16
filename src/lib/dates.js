// Calendar-date helpers. Dates are stored as local "YYYY-MM-DD" strings.
//
// v3.0 used `toISOString().slice(0,10)`, which is the *UTC* date — users west of
// UTC saw the day roll over in the evening. Everything here uses local time and
// does day arithmetic through Date.UTC so DST changes can't skew a count.

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar date of `d` as YYYY-MM-DD. */
export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(now = new Date()) {
  return toISODate(now);
}

/** Parse YYYY-MM-DD as a local-midnight Date. */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dayNumber(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000;
}

/** Whole calendar days from `a` to `b` (both YYYY-MM-DD). Negative if b < a. */
export function daysBetween(a, b) {
  return Math.round(dayNumber(b) - dayNumber(a));
}

/** The date `n` days before `from` (n may be negative for the future). */
export function isoDateOffset(n, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - n);
  return toISODate(d);
}

/** Sunday of the week containing `now`. */
export function weekStart(now = new Date()) {
  return isoDateOffset(now.getDay(), now);
}

export function fmtDate(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtShortDate(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function weekdayInitial(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
}

export function fmtHour(h) {
  const d = new Date(2000, 0, 1, h);
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}
