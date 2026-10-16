// Shareable streak card rendered to <canvas>. Uses the native share sheet
// when the device supports sharing files, otherwise downloads a PNG.

import { MOTIVATIONAL_QUOTES } from '../config/constants.js';
import { $, downloadFile } from '../lib/dom.js';
import { store } from '../state/store.js';
import { bestStreak, currentStreak } from '../domain/streak.js';
import { registerActions } from '../ui/actions.js';
import { closeModal, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

const W = 400;
const H = 220;

export function shareTemplate() {
  return `
  <div class="modal share-overlay" id="shareCard" role="dialog" aria-modal="true" aria-label="Your streak card" hidden>
    <div class="share-inner">
      <div class="share-canvas-wrap">
        <canvas id="shareCanvas" width="${W * 2}" height="${H * 2}" role="img" aria-label=""></canvas>
      </div>
      <div class="share-actions">
        <button type="button" class="btn-accent" data-action="share-save" id="shareSaveBtn">⬇ Save image</button>
        <button type="button" class="btn-ghost-light" data-action="share-close">Close</button>
      </div>
    </div>
  </div>`;
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) return ctx.roundRect(x, y, w, h, r);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

function draw() {
  const s = store.get();
  const canvas = $('#shareCanvas');
  const ctx = canvas.getContext('2d');
  const streak = currentStreak(s);
  ctx.setTransform(2, 0, 0, 2, 0, 0); // crisp on high-DPI screens
  ctx.clearRect(0, 0, W, H);

  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#1A2E22');
  grd.addColorStop(1, '#0D1F16');
  ctx.fillStyle = grd;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(350, 40, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59,142,94,0.15)';
  ctx.fill();

  const font = (w, px, style = '') => `${style} ${w} ${px}px -apple-system, "Segoe UI", Roboto, sans-serif`.trim();
  ctx.font = font('bold', 14);
  ctx.fillStyle = '#3B8E5E';
  ctx.fillText('🌿 VOW', 24, 36);

  ctx.font = font('bold', 72);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(String(streak), 24, 110);
  ctx.font = font('bold', 16);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('DAY STREAK', 24, 132);

  ctx.font = font('', 13);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`Personal best: ${bestStreak(s)} days`, 24, 156);

  const quote = MOTIVATIONAL_QUOTES[streak % MOTIVATIONAL_QUOTES.length];
  ctx.font = font('', 12, 'italic');
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  let line = '';
  let y = 182;
  for (const word of quote.split(' ')) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > 350 && line) {
      ctx.fillText(line, 24, y);
      line = `${word} `;
      y += 16;
    } else line = test;
  }
  ctx.fillText(line, 24, y);

  ctx.font = font('', 11);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.textAlign = 'right';
  ctx.fillText('vow.app', W - 20, H - 14);
  ctx.textAlign = 'left';

  canvas.setAttribute('aria-label', `Streak card: ${streak}-day streak, personal best ${bestStreak(s)} days. "${quote}"`);
}

function canShareFiles() {
  try {
    return Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  } catch {
    return false;
  }
}

registerActions({
  'open-share'() {
    draw();
    $('#shareSaveBtn').textContent = canShareFiles() ? '📤 Share' : '⬇ Save image';
    openModal('shareCard');
    if (!store.get().hasShared) store.update((s) => (s.hasShared = true));
  },
  'share-close': () => closeModal('shareCard'),
  async 'share-save'() {
    const canvas = $('#shareCanvas');
    const name = `vow-streak-${currentStreak(store.get())}d.png`;
    if (canShareFiles()) {
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      try {
        await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: 'My Vow streak' });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    downloadFile(canvas.toDataURL('image/png'), name);
    toast('Image saved');
  },
});
