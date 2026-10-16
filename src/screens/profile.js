// Profile: level & XP, quests, badges, accountability-buddy invite.

import { BADGES, FREEZE_EVERY_DAYS } from '../config/constants.js';
import { CONFIG } from '../config/app.js';
import { $, copyToClipboard, esc, setHTML, setText } from '../lib/dom.js';
import { today } from '../lib/dates.js';
import { store } from '../state/store.js';
import { isQuestClaimed, levelInfo, questDefs, questKey } from '../domain/progression.js';
import { newAnonId } from '../services/leaderboard.js';
import { registerActions } from '../ui/actions.js';
import { toast } from '../ui/toast.js';
import { awardXP } from '../features/progress.js';

export function profileTemplate() {
  return `
  <section class="tab-page" id="page-profile" aria-labelledby="profileTitle" hidden>
    <header class="header"><h1 class="header-title" id="profileTitle" tabindex="-1"><span aria-hidden="true">🏆</span> <span>Profile</span></h1></header>

    <div class="profile-hero">
      <div class="profile-avatar" id="profileAvatar" aria-hidden="true">🌱</div>
      <p class="profile-name" id="profileName">Warrior</p>
      <p class="profile-level" id="profileLevel">Level 1 · Seedling</p>
      <div class="xp-bar-wrap" role="progressbar" id="xpBar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Progress to next level">
        <div class="xp-bar-fill" id="xpBarFill"></div>
      </div>
      <p class="xp-label" id="xpLabel">0 / 100 XP</p>
      <p class="freeze-count" id="freezeCount" title="Earn one for every ${FREEZE_EVERY_DAYS} days in a row">🧊 0 streak freezes</p>
    </div>

    <h2 class="section-title">Quests</h2>
    <ul class="card quest-card" id="questList"></ul>

    <h2 class="section-title">Badges <span class="section-count" id="badgeCount"></span></h2>
    <ul class="badges-grid" id="badgesGrid"></ul>

    <h2 class="section-title">Accountability buddy</h2>
    <div class="card settings-card">
      <div class="settings-row">
        <div class="settings-row-left">
          <p class="settings-row-label">Invite a buddy <span class="soon-tag">Soon</span></p>
          <p class="settings-row-sub">Share streaks with a friend you trust. The link is a preview of the upcoming feature.</p>
        </div>
        <button type="button" class="btn-settings-action" data-action="copy-invite">Copy link</button>
      </div>
    </div>
  </section>`;
}

export function renderProfile(s = store.get()) {
  const li = levelInfo(s.xp || 0);
  setText('#profileAvatar', li.avatar);
  setText('#profileName', s.userName || 'Warrior');
  setText('#profileLevel', `Level ${li.level} · ${li.name}`);
  $('#xpBarFill').style.width = `${li.pct}%`;
  $('#xpBar').setAttribute('aria-valuenow', String(li.pct));
  setText('#xpLabel', li.maxed ? `${s.xp} XP · max level` : `${s.xp || 0} / ${li.next} XP`);
  const fc = s.streakFreezes || 0;
  const fcEl = $('#freezeCount');
  fcEl.textContent = `🧊 ${fc} streak freeze${fc === 1 ? '' : 's'}`;
  fcEl.classList.toggle('is-empty', fc === 0);

  setHTML(
    '#questList',
    questDefs(s)
      .map((q) => {
        const pct = Math.round((q.progress / q.goal) * 100);
        const claimed = isQuestClaimed(s, q);
        const done = q.progress >= q.goal;
        const right = claimed
          ? '<span class="quest-done" aria-label="Claimed">✅</span>'
          : done
            ? `<button type="button" class="btn-quest-claim" data-action="claim-quest" data-quest="${q.id}">Claim +${q.xp}</button>`
            : `<span class="quest-xp">+${q.xp} XP</span>`;
        return `<li class="quest-item${claimed ? ' is-claimed' : ''}">
          <span class="quest-icon" aria-hidden="true">${q.icon}</span>
          <div class="quest-info">
            <p class="quest-label">${esc(q.label)} <span class="quest-type">${q.type}</span></p>
            <p class="quest-progress">${q.progress} / ${q.goal} · ${esc(q.sub)}</p>
            <div class="quest-bar" aria-hidden="true"><div class="quest-bar-fill" style="width:${pct}%"></div></div>
          </div>
          ${right}
        </li>`;
      })
      .join(''),
  );

  const earned = s.earnedBadges;
  setText('#badgeCount', `${earned.length}/${BADGES.length}`);
  setHTML(
    '#badgesGrid',
    BADGES.map((b) => {
      const has = earned.includes(b.id);
      return `<li class="badge-item${has ? '' : ' locked'}" title="${esc(b.desc)}" aria-label="${esc(b.label)}: ${esc(b.desc)}${has ? ' (earned)' : ' (locked)'}">
        <div class="badge-emoji" aria-hidden="true">${b.emoji}</div>
        <div class="badge-label" aria-hidden="true">${esc(b.label)}</div>
      </li>`;
    }).join(''),
  );
}

registerActions({
  'claim-quest'(el) {
    const s = store.get();
    const q = questDefs(s).find((d) => d.id === el.dataset.quest);
    if (!q) return;
    if (q.progress < q.goal) return toast('Not quite there yet. Keep going!');
    if (isQuestClaimed(s, q)) return toast('Already claimed.');
    store.update((st) => {
      st.questsClaimed[questKey(q)] = today();
      st.totalQuestsClaimed = (st.totalQuestsClaimed || 0) + 1;
    });
    awardXP(q.xp, q.label);
    toast(`🎉 Quest complete! +${q.xp} XP`);
  },
  async 'copy-invite'() {
    if (!store.get().anonId) store.update((s) => (s.anonId = newAnonId()));
    const id = store.get().anonId.replace(/\s+/g, '-').toLowerCase();
    const ok = await copyToClipboard(`${CONFIG.inviteBaseUrl}/${id}`);
    toast(ok ? '📋 Invite link copied. Buddy mode is coming soon.' : "Couldn't copy the link on this device.");
  },
});
