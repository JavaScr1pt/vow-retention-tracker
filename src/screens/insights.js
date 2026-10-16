// Insights: urge summary, 14-day heatmap, difficulty trend + forecast,
// pattern insights, top triggers, and the anonymous leaderboard.

import { esc, setHTML, setText } from '../lib/dom.js';
import { fmtShortDate, weekdayInitial } from '../lib/dates.js';
import { store } from '../state/store.js';
import { currentStreak } from '../domain/streak.js';
import { difficultySeries, forecast, generateInsights, heatmap, triggerCounts, urgeStats } from '../domain/insights.js';
import { fetchLeaderboard, newAnonId } from '../services/leaderboard.js';
import { registerActions } from '../ui/actions.js';
import { toast } from '../ui/toast.js';

export function insightsTemplate() {
  return `
  <section class="tab-page" id="page-insights" aria-labelledby="insightsTitle" hidden>
    <header class="header"><h1 class="header-title" id="insightsTitle" tabindex="-1"><span aria-hidden="true">📊</span> <span>Insights</span></h1></header>

    <div class="card">
      <h2 class="card-title">Urge summary</h2>
      <div class="urge-stat-row">
        <div class="urge-stat-item"><div class="urge-stat-val" id="totalUrges">0</div><div class="urge-stat-lbl">Total urges</div></div>
        <div class="urge-stat-item"><div class="urge-stat-val" id="urgesThisWeek">0</div><div class="urge-stat-lbl">Last 7 days</div></div>
        <div class="urge-stat-item"><div class="urge-stat-val" id="urgeResisted">0</div><div class="urge-stat-lbl">Urge-free check-ins</div></div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Urge heatmap · last 14 days</h2>
      <div class="heatmap-grid" id="heatmapGrid" role="list"></div>
      <div class="heatmap-legend" aria-hidden="true">
        <span>None</span>
        <span class="legend-cell lvl-1"></span><span class="legend-cell lvl-2"></span>
        <span class="legend-cell lvl-3"></span><span class="legend-cell lvl-4"></span>
        <span>High</span>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Difficulty trend &amp; forecast</h2>
      <div id="moodGraph"></div>
      <p class="mood-predict-label" id="moodPredictLabel"></p>
    </div>

    <div class="card ai-card">
      <h2 class="card-title">✨ Pattern insights <span class="card-title-note">from your logs, on this device</span></h2>
      <ul class="insight-list" id="insightList"></ul>
    </div>

    <div class="card">
      <h2 class="card-title">Top triggers</h2>
      <div id="triggerChart"></div>
    </div>

    <div class="card">
      <h2 class="card-title">🏆 Anonymous leaderboard</h2>
      <div id="leaderboard" aria-live="polite"></div>
    </div>
  </section>`;
}

/** `withLeaderboard` refetches the (async) leaderboard. It's done on screen
 *  entry only, so routine state changes don't flash a loading skeleton. */
export function renderInsights(s = store.get(), { withLeaderboard = false } = {}) {
  const now = new Date();
  const stats = urgeStats(s, now);
  setText('#totalUrges', stats.total);
  setText('#urgesThisWeek', stats.thisWeek);
  setText('#urgeResisted', stats.resisted);

  setHTML(
    '#heatmapGrid',
    heatmap(s, now)
      .map((d) => {
        const label = `${fmtShortDate(d.date)}: ${d.count} urge${d.count === 1 ? '' : 's'}`;
        return `<div class="heatmap-cell lvl-${d.level}" role="listitem" title="${label}" aria-label="${label}"><span aria-hidden="true">${Number(d.date.slice(8))}</span></div>`;
      })
      .join(''),
  );

  renderMoodGraph(s, now);
  renderInsightList(s, now);
  renderTriggers(s);
  if (withLeaderboard) renderLeaderboard(s);
}

function renderMoodGraph(s, now) {
  const series = difficultySeries(s, now, 10);
  const values = series.filter((d) => d.value !== null);
  if (values.length < 2) {
    setHTML('#moodGraph', `<div class="empty-state compact"><div class="empty-icon" aria-hidden="true">🌙</div><p>Save at least 2 evening reviews to see your trend.</p></div>`);
    setText('#moodPredictLabel', '');
    return;
  }
  const pred = forecast(values.map((d) => d.value), 3);
  const W = 320;
  const H = 100;
  const PAD = 14;
  const slots = series.length + pred.length;
  const x = (i) => PAD + (i / (slots - 1)) * (W - PAD * 2);
  const y = (v) => PAD + ((5 - v) / 4) * (H - PAD * 2);

  const pts = series.map((d, i) => (d.value === null ? null : { x: x(i), y: y(d.value), v: d.value, date: d.date })).filter(Boolean);
  const predPts = pred.map((v, k) => ({ x: x(series.length + k), y: y(v), v }));
  const path = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  const svg = `
  <svg viewBox="0 0 ${W} ${H + 14}" class="mood-svg" role="img" aria-label="Difficulty over the last 10 days with a 3-day forecast">
    <defs><linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient></defs>
    ${[1, 3, 5].map((v) => `<line x1="${PAD}" x2="${W - PAD}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/><text x="${PAD - 4}" y="${y(v) + 3}" class="axis-label" text-anchor="end">${v}</text>`).join('')}
    <path d="${path(pts)} L${last.x},${H - PAD} L${pts[0].x},${H - PAD} Z" fill="url(#moodFill)"/>
    <path d="${path(pts)}" class="mood-line"/>
    <path d="M${last.x},${last.y} ${predPts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" class="mood-forecast"/>
    ${pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" class="mood-dot"><title>${fmtShortDate(p.date)}: ${p.v}/5</title></circle>`).join('')}
    ${predPts.map((p, k) => `<circle cx="${p.x}" cy="${p.y}" r="4" class="mood-dot-pred"><title>Forecast day +${k + 1}: ${p.v}/5</title></circle>`).join('')}
    ${series.map((d, i) => `<text x="${x(i)}" y="${H + 10}" class="axis-label" text-anchor="middle">${weekdayInitial(d.date)}</text>`).join('')}
    ${predPts.map((p, k) => `<text x="${p.x}" y="${H + 10}" class="axis-label forecast" text-anchor="middle">+${k + 1}</text>`).join('')}
  </svg>`;
  setHTML('#moodGraph', svg);
  const peak = Math.max(...pred);
  setText('#moodPredictLabel', peak >= 3.8 ? 'Your trend points to some harder days ahead. Plan your support now. 💪' : peak <= 2.2 ? 'Your trend is heading somewhere easier. Keep the momentum! 🌿' : 'Your trend looks steady. Keep showing up. 🌿');
}

function renderInsightList(s, now) {
  const items = generateInsights(s, now);
  setHTML(
    '#insightList',
    items.length
      ? items.map((i) => `<li class="insight-item insight-${i.kind}"><span class="insight-dot" aria-hidden="true"></span><span>${esc(i.text)}</span></li>`).join('')
      : `<li class="empty-state compact"><p>Log a few urge check-ins with the <strong>+</strong> button to unlock personal insights.</p></li>`,
  );
}

function renderTriggers(s) {
  const rows = triggerCounts(s);
  if (!rows.length) {
    setHTML('#triggerChart', `<div class="empty-state compact"><div class="empty-icon" aria-hidden="true">🎯</div><p>No triggers logged yet. Tap <strong>+</strong> when an urge hits.</p></div>`);
    return;
  }
  const max = rows[0].count;
  setHTML(
    '#triggerChart',
    `<ul class="trigger-list">${rows
      .map(
        (r) => `<li class="trigger-item"><span class="trigger-name">${esc(r.name)}</span>
        <span class="trigger-bar-wrap" aria-hidden="true"><span class="trigger-bar-fill" style="width:${Math.round((r.count / max) * 100)}%"></span></span>
        <span class="trigger-count">${r.count}<span class="visually-hidden"> urges</span></span></li>`,
      )
      .join('')}</ul>`,
  );
}

// ── Leaderboard (async: loading / error / data) ───────────────

let lbRequest = 0;
async function renderLeaderboard(s) {
  const el = document.getElementById('leaderboard');
  if (!s.leaderboardOptIn) {
    el.innerHTML = `<div class="empty-state compact">
      <p>Compare streaks anonymously. Only a random ID and your streak count are shared.</p>
      <button type="button" class="btn-accent btn-inline" data-action="join-leaderboard">Join leaderboard</button>
    </div>`;
    return;
  }
  const req = ++lbRequest;
  el.innerHTML = `<div class="skeleton-list" aria-label="Loading leaderboard">${'<div class="skeleton-row"></div>'.repeat(5)}</div>`;
  try {
    const entries = await fetchLeaderboard({ anonId: s.anonId, streak: currentStreak(s) });
    if (req !== lbRequest) return; // a newer render superseded this one
    const medals = ['🥇', '🥈', '🥉'];
    el.innerHTML = `<ol class="lb-list">${entries
      .slice(0, 10)
      .map(
        (e, i) => `<li class="lb-row${e.you ? ' is-you' : ''}">
          <span class="lb-rank" aria-label="Rank ${i + 1}">${medals[i] || i + 1}</span>
          <span class="lb-name">${esc(e.name)}${e.you ? ' <span class="lb-you">YOU</span>' : ''}</span>
          <span class="lb-streak">${Number(e.streak) || 0}d</span>
        </li>`,
      )
      .join('')}</ol>`;
  } catch (err) {
    if (req !== lbRequest) return;
    el.innerHTML = `<div class="error-state" role="alert">
      <p>Couldn't load the leaderboard. ${esc(err.message || '')}</p>
      <button type="button" class="btn-secondary btn-inline" data-action="retry-leaderboard">Try again</button>
    </div>`;
  }
}

registerActions({
  'join-leaderboard'() {
    store.update((s) => {
      if (!s.anonId) s.anonId = newAnonId();
      s.leaderboardOptIn = true;
    });
    renderLeaderboard(store.get());
    toast(`🏅 You joined as ${store.get().anonId}`);
  },
  'retry-leaderboard': () => renderLeaderboard(store.get()),
});
