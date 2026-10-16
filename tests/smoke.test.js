// @vitest-environment jsdom
// Boots the real app in jsdom and drives a few user flows end to end.

import { beforeAll, describe, expect, it } from 'vitest';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
const state = () => JSON.parse(localStorage.getItem('vow_v1'));

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.setItem('vow_onboarding_done', 'true');
  HTMLCanvasElement.prototype.getContext = () => null; // jsdom has no canvas
  window.scrollTo = () => {}; // …or scrolling
  await import('../src/main.js');
});

describe('app smoke test', () => {
  it('mounts all four screens and the tab bar', () => {
    for (const id of ['page-home', 'page-insights', 'page-profile', 'page-settings']) expect($(`#${id}`)).not.toBeNull();
    expect(document.querySelectorAll('.tab-btn')).toHaveLength(4);
    expect($('#page-home').hidden).toBe(false);
    expect($('#page-insights').hidden).toBe(true);
  });

  it('starts a streak and pledges, persisting state and awarding XP', async () => {
    $('[data-action="start-streak"]').click();
    await wait();
    expect(state().startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    $('#btnPledge').click();
    await wait();
    expect(state().xp).toBe(10);
    expect($('#btnPledge').disabled).toBe(true);
    expect($('#toast').textContent).toContain('Pledged');
  });

  it('logs an urge through the modal', async () => {
    $('#urgeFab').click();
    expect($('#urgeLog').hidden).toBe(false);
    $('#btnYes').click();
    $('#urgeTrigger').value = 'Stress';
    $('[data-action="urge-save"]').click();
    await wait();
    expect($('#urgeLog').hidden).toBe(true);
    expect(state().urges.at(-1)).toMatchObject({ hadUrge: true, trigger: 'Stress' });
  });

  it('navigates between tabs with hash routing', async () => {
    document.querySelector('[data-route="profile"]').click();
    await wait();
    expect(location.hash).toBe('#/profile');
    expect($('#page-profile').hidden).toBe(false);
    expect($('#page-home').hidden).toBe(true);
    expect(document.querySelectorAll('.quest-item').length).toBeGreaterThan(0);
  });

  it('escapes user text rendered into the page', async () => {
    $('[data-route="home"]').click();
    $('#btnRelapse').click();
    $('[data-action="relapse-confirm"]').click();
    $('#reflectionText').value = '<img src=x onerror=alert(1)>';
    $('[data-action="reflection-save"]').click();
    await wait();
    expect($('#historyList img')).toBeNull();
    expect($('#historyList').textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
