// Home: streak ring, start/relapse actions, morning pledge, evening review,
// relapse history.

import { CONFIG } from '../config/app.js';
import { RING_GOAL_DAYS, XP } from '../config/constants.js';
import { fmtDate, fmtHour, fmtShortDate, isoDateOffset, today, weekdayInitial } from '../lib/dates.js';
import { $, $$, esc, setHTML, setText, show } from '../lib/dom.js';
import { store } from '../state/store.js';
import { bestStreak, currentStreak, effectivePledgeStreak, hasPledgedToday, milestoneToday, nextPledgeStreak, ringProgress } from '../domain/streak.js';
import { trialStatus } from '../domain/trial.js';
import { registerActions } from '../ui/actions.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { awardXP } from '../features/progress.js';
import { guardLocked } from '../features/paywall.js';

const R = 65;
const CIRCUMFERENCE = 2 * Math.PI * R;
let selectedRating = 0;
let editingReview = false;

export function homeTemplate() {
  return `
  <section class="tab-page" id="page-home" aria-labelledby="homeTitle">
    <header class="header">
      <h1 class="header-title" id="homeTitle" tabindex="-1">
        <img src="icons/vow-logo.svg" alt="" class="header-logo" width="44" height="44"><span>Vow</span>
      </h1>
      <div class="header-actions">
        <button type="button" class="icon-btn" data-action="open-share" aria-label="Share your streak card">🔗</button>
        <button type="button" class="plan-chip" id="planChip" data-action="open-paywall">Trial</button>
      </div>
    </header>

    <div class="banner banner-accent" id="trialBanner" hidden>
      <span aria-hidden="true">⏳</span>
      <span class="banner-text">Free trial: <strong id="trialLeft">3 relapse logs</strong> left</span>
      <button type="button" class="banner-btn" data-action="open-paywall">Upgrade</button>
    </div>
    <div class="banner banner-danger" id="trialEndedBanner" hidden>
      <span aria-hidden="true">🔒</span>
      <span class="banner-text"><strong>Trial ended.</strong> Upgrade to keep logging.</span>
      <button type="button" class="banner-btn" data-action="open-paywall">Upgrade</button>
    </div>

    <div class="streak-card" id="streakCard">
      <div class="ring-wrap" role="img" id="ringWrap" aria-label="">
        <svg class="ring-svg" viewBox="0 0 160 160" aria-hidden="true">
          <circle class="ring-track" cx="80" cy="80" r="${R}"></circle>
          <circle class="ring-progress" id="ringProgress" cx="80" cy="80" r="${R}"
            style="stroke-dasharray:${CIRCUMFERENCE};stroke-dashoffset:${CIRCUMFERENCE}"></circle>
        </svg>
        <div class="ring-center" aria-hidden="true">
          <div class="streak-number" id="streakNum">0</div>
          <div class="streak-label" id="streakLabel">Days</div>
        </div>
      </div>
      <dl class="streak-meta">
        <div class="meta-item"><dt class="meta-lbl">Started</dt><dd class="meta-val" id="startDateDisp">—</dd></div>
        <div class="meta-item"><dt class="meta-lbl">Best</dt><dd class="meta-val" id="longestStreak">0</dd></div>
        <div class="meta-item"><dt class="meta-lbl">Relapses</dt><dd class="meta-val" id="totalRelapses">0</dd></div>
      </dl>
      <p class="why-banner" id="whyBanner" hidden></p>
      <p class="freeze-banner" id="freezeBanner" hidden></p>
      <p class="milestone" id="milestone" hidden></p>
    </div>

    <div class="actions">
      <button type="button" class="btn btn-start" data-action="start-streak">
        <span class="btn-icon" aria-hidden="true">🌿</span><span class="btn-text" id="btnStartText">Start streak</span>
      </button>
      <button type="button" class="btn btn-relapse" id="btnRelapse" data-action="log-relapse">
        <span class="btn-icon" aria-hidden="true">⚡</span><span class="btn-text">Log relapse</span>
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="stat-icon" aria-hidden="true">📅</div><div class="stat-val" id="statWeeks">0</div><div class="stat-lbl">Weeks</div></div>
      <div class="stat-card"><div class="stat-icon" aria-hidden="true">🔥</div><div class="stat-val" id="statStreak">0</div><div class="stat-lbl">Current</div></div>
      <div class="stat-card"><div class="stat-icon" aria-hidden="true">🏅</div><div class="stat-val" id="statBest">0</div><div class="stat-lbl">Personal best</div></div>
    </div>

    <h2 class="section-title">Morning pledge</h2>
    <div class="card pledge-card">
      <p class="pledge-title" id="pledgeTitle">Start your day with intention</p>
      <p class="pledge-sub">One tap to commit to today.</p>
      <button type="button" class="btn-pledge" id="btnPledge" data-action="pledge">I pledge to win today</button>
      <p class="pledge-streak-row"><span class="pledge-streak-count" id="pledgeStreakCount">0</span> <span class="pledge-streak-lbl">day pledge streak</span></p>
    </div>

    <h2 class="section-title">Evening review</h2>
    <div class="card evening-card">
      <div class="evening-header">
        <span class="evening-icon" aria-hidden="true">🌙</span>
        <div>
          <p class="evening-title">How tough was today?</p>
          <p class="evening-sub" id="eveningSub">Rate it from 1 (easy) to 5 (very hard)</p>
        </div>
      </div>
      <div id="eveningForm">
        <div class="rating-row" role="radiogroup" aria-label="Day difficulty, 1 easy to 5 very hard">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rating-btn" role="radio" aria-checked="false" data-action="rate" data-rating="${n}">${n}</button>`).join('')}
        </div>
        <label class="visually-hidden" for="eveningNote">Note about your day</label>
        <textarea class="text-input evening-note" id="eveningNote" placeholder="Optional note about your day…" maxlength="200"></textarea>
        <button type="button" class="btn-evening-save" id="btnEveningSave" data-action="save-review">Save review</button>
      </div>
      <div class="evening-done" id="eveningDone" hidden>
        <p id="eveningDoneText"></p>
        <button type="button" class="link-btn" data-action="edit-review">Edit</button>
      </div>
      <p class="evening-locked" id="eveningLocked" hidden></p>
      <div class="mini-graph" id="miniGraph"></div>
    </div>

    <h2 class="section-title">Relapse history</h2>
    <div class="card history-card">
      <div class="empty-state" id="historyEmpty">
        <div class="empty-icon" aria-hidden="true">✨</div>
        <p>No relapses recorded. Keep going!</p>
      </div>
      <ul class="history-list" id="historyList"></ul>
    </div>
  </section>`;
}

export function renderHome(s = store.get()) {
  const now = new Date();
  const streak = currentStreak(s, now);
  const best = bestStreak(s, now);
  const trial = trialStatus(s);

  setText('#streakNum', streak);
  setText('#streakLabel', streak === 1 ? 'Day' : 'Days');
  $('#ringWrap').setAttribute('aria-label', `${streak}-day streak, ${Math.round(ringProgress(s, now) * 100)}% of the way to ${RING_GOAL_DAYS} days`);
  $('#ringProgress').style.strokeDashoffset = String(CIRCUMFERENCE - ringProgress(s, now) * CIRCUMFERENCE);
  setText('#statStreak', streak);
  setText('#statBest', best);
  setText('#statWeeks', Math.floor(streak / 7));
  setText('#longestStreak', best);
  setText('#totalRelapses', s.relapses.length);
  setText('#startDateDisp', s.startDate ? fmtShortDate(s.startDate) : '—');
  setText('#btnStartText', s.startDate ? 'Restart today' : 'Start streak');

  const ms = milestoneToday(streak);
  setText('#milestone', ms ? `🏆 ${ms} unlocked!` : '');
  show('#milestone', Boolean(ms));
  setText('#whyBanner', s.userWhy ? `“${s.userWhy}”` : '');
  show('#whyBanner', Boolean(s.userWhy));
  const fc = s.streakFreezes || 0;
  setText('#freezeBanner', `🧊 ${fc} streak freeze${fc === 1 ? '' : 's'} ready to protect your streak`);
  show('#freezeBanner', fc > 0);

  // Plan chip + trial banners
  const chip = $('#planChip');
  chip.textContent = trial.isPro ? 'PRO' : trial.ended ? 'Trial ended' : 'Trial';
  chip.className = `plan-chip ${trial.isPro ? 'is-pro' : trial.ended ? 'is-ended' : ''}`;
  chip.setAttribute('aria-label', trial.isPro ? 'Vow Pro is active' : 'View Vow Pro plans');
  show('#trialBanner', !trial.isPro && trial.active);
  show('#trialEndedBanner', trial.ended);
  if (trial.active && !trial.isPro) setText('#trialLeft', `${trial.relapsesLeft} relapse log${trial.relapsesLeft === 1 ? '' : 's'}`);

  const locked = trial.ended;
  $('#btnRelapse').setAttribute('aria-disabled', String(locked));
  $('#btnRelapse').classList.toggle('is-locked', locked);

  // Pledge
  setText('#pledgeTitle', s.userName ? `Hey ${s.userName} 👋` : 'Start your day with intention');
  const pledged = hasPledgedToday(s, now);
  const pb = $('#btnPledge');
  pb.disabled = pledged;
  pb.textContent = pledged ? '✅ Pledged today' : locked ? '🔒 Upgrade to pledge' : 'I pledge to win today';
  setText('#pledgeStreakCount', effectivePledgeStreak(s, now));

  renderEvening(s, now, locked);
  renderHistory(s);
}

function renderEvening(s, now, locked) {
  const td = today(now);
  const review = s.reviews.find((r) => r.date === td);
  const open = now.getHours() >= CONFIG.eveningHour;
  const showForm = !locked && ((open && !review) || editingReview);
  show('#eveningForm', showForm);
  show('#eveningDone', Boolean(review) && !editingReview);
  show('#eveningLocked', !showForm && !review);
  if (review) setText('#eveningDoneText', `✅ Saved: today was a ${review.rating}/5${review.note ? `. “${review.note}”` : ''}`);
  if (!showForm && !review) {
    setText('#eveningLocked', locked ? '🔒 Upgrade to keep logging evening reviews.' : `Unlocks at ${fmtHour(CONFIG.eveningHour)}. Come back tonight to reflect.`);
  }
  $('#btnEveningSave').textContent = editingReview ? 'Update review' : 'Save review';
  renderMiniGraph(s, now);
}

function renderMiniGraph(s, now) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = isoDateOffset(6 - i, now);
    const r = s.reviews.find((x) => x.date === date);
    return { date, rating: r ? r.rating : 0 };
  });
  const bars = days
    .map((d) => {
      const h = d.rating ? Math.round((d.rating / 5) * 40) + 8 : 4;
      return `<div class="mini-col"><div class="mini-bar${d.rating ? ' filled' : ''}" style="height:${h}px"></div><div class="mini-bar-lbl">${weekdayInitial(d.date)}</div></div>`;
    })
    .join('');
  const summary = days.filter((d) => d.rating).map((d) => `${fmtShortDate(d.date)}: ${d.rating}`).join(', ') || 'no reviews yet';
  setHTML('#miniGraph', `<p class="mini-graph-title">Difficulty, last 7 days</p><div class="mini-bars" role="img" aria-label="Difficulty last 7 days: ${esc(summary)}">${bars}</div>`);
}

function renderHistory(s) {
  const items = s.relapses.map((r, idx) => ({ ...r, idx })).reverse();
  show('#historyEmpty', items.length === 0);
  setHTML(
    '#historyList',
    items
      .map(
        (r) => `
      <li class="history-item">
        <div class="history-row">
          <span class="history-dot" aria-hidden="true"></span>
          <span class="history-date">${esc(fmtDate(r.date))}</span>
          <span class="history-streak">${Number(r.streakAtTime) || 0}d streak</span>
          <button type="button" class="history-del" data-action="delete-relapse" data-idx="${r.idx}" aria-label="Delete relapse on ${esc(fmtDate(r.date))}">✕</button>
        </div>
        ${r.reflection ? `<p class="history-reflection">“${esc(r.reflection)}”</p>` : ''}
      </li>`,
      )
      .join(''),
  );
}

function selectRating(n) {
  selectedRating = n;
  $$('.rating-btn').forEach((b) => {
    const on = Number(b.dataset.rating) === n;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', String(on));
  });
}

export function pulseStreakCard() {
  const card = $('#streakCard');
  card.classList.add('pulse');
  setTimeout(() => card.classList.remove('pulse'), 3000);
}

registerActions({
  async 'start-streak'() {
    if (guardLocked()) return;
    const s = store.get();
    if (s.startDate && s.startDate !== today()) {
      const ok = await confirmDialog({
        icon: '🌿',
        title: 'Restart your streak today?',
        body: `Your current ${currentStreak(s)}-day streak will restart from today. This doesn't log a relapse. Use "Log relapse" for that.`,
        confirmLabel: 'Restart',
        tone: 'accent',
      });
      if (!ok) return;
    } else if (s.startDate) {
      toast('Your streak already started today. Keep going!');
      return;
    }
    store.update((st) => {
      st.longestStreak = Math.max(st.longestStreak || 0, currentStreak(st));
      st.startDate = today();
    });
    toast("🌿 Streak started. You've got this.");
    pulseStreakCard();
  },

  pledge() {
    if (guardLocked()) return;
    const s = store.get();
    if (hasPledgedToday(s)) {
      toast('Already pledged today ✅');
      return;
    }
    store.update((st) => {
      st.pledgeStreak = nextPledgeStreak(st);
      st.lastPledgeDate = today();
      if (!st.pledgeDates.includes(st.lastPledgeDate)) st.pledgeDates.push(st.lastPledgeDate);
      st.pledgeDates = st.pledgeDates.slice(-60);
    });
    awardXP(XP.pledge, 'Daily pledge');
    toast('🌿 Pledged. Stay strong today.');
  },

  rate(el) {
    selectRating(Number(el.dataset.rating));
  },

  'edit-review'() {
    const r = store.get().reviews.find((x) => x.date === today());
    editingReview = true;
    renderHome();
    if (r) {
      selectRating(r.rating);
      $('#eveningNote').value = r.note || '';
    }
  },

  'save-review'() {
    if (guardLocked()) return;
    if (!selectedRating) {
      toast('Pick a rating from 1 to 5 first.');
      $('.rating-btn')?.focus();
      return;
    }
    const td = today();
    const isNew = !store.get().reviews.some((r) => r.date === td);
    const note = $('#eveningNote').value.trim();
    const rating = selectedRating;
    store.update((st) => {
      st.reviews = st.reviews.filter((r) => r.date !== td);
      st.reviews.push({ date: td, rating, note });
    });
    selectRating(0);
    $('#eveningNote').value = '';
    editingReview = false;
    renderHome();
    if (isNew) awardXP(XP.eveningReview, 'Evening review');
    toast(isNew ? '🌙 Evening review saved' : '🌙 Review updated');
  },

  async 'delete-relapse'(el) {
    const idx = Number(el.dataset.idx);
    const r = store.get().relapses[idx];
    if (!r) return;
    const ok = await confirmDialog({
      icon: '🗑️',
      title: 'Delete this entry?',
      body: `Relapse on ${fmtDate(r.date)} will be removed from your history.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    store.update((st) => {
      st.relapses.splice(idx, 1);
    });
    toast('Entry removed.');
  },
});
