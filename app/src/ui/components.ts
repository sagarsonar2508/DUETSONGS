/**
 * Shared UI building blocks: top bar, coin pill, modals, toasts, star rows.
 */

import { save } from '../core/storage';
import { uiSound } from '../audio/instruments';

export function coinPill(): string {
  return `<div class="coin-pill"><span class="coin-ico">●</span><span class="coin-amount">${save.coins.toLocaleString()}</span></div>`;
}

export function refreshCoins(): void {
  document.querySelectorAll('.coin-amount').forEach((el) => {
    el.textContent = save.coins.toLocaleString();
  });
}

export function topbar(title: string, opts: { back?: boolean } = {}): string {
  return `
    <div class="topbar">
      ${opts.back ? '<button class="icon-btn back-btn" aria-label="Back">‹</button>' : '<div class="topbar-spacer"></div>'}
      <div class="topbar-title">${title}</div>
      ${coinPill()}
    </div>`;
}

export function starRow(n: number, max = 3, cls = ''): string {
  let html = `<div class="stars ${cls}">`;
  for (let i = 0; i < max; i++) {
    html += `<span class="star ${i < n ? 'on' : ''}">★</span>`;
  }
  return html + '</div>';
}

export interface ModalAction {
  label: string;
  kind?: 'primary' | 'ghost' | 'normal';
  onClick?: () => void;
}

export function modal(opts: {
  title: string;
  body: string;
  actions: ModalAction[];
}): () => void {
  const host = document.createElement('div');
  host.className = 'overlay overlay-fade';
  host.innerHTML = `
    <div class="panel">
      <h2>${opts.title}</h2>
      <div class="panel-body">${opts.body}</div>
      <div class="panel-actions"></div>
    </div>`;
  const actions = host.querySelector('.panel-actions')!;
  const close = () => host.remove();
  for (const a of opts.actions) {
    const b = document.createElement('button');
    b.className = `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'ghost' ? 'btn-ghost' : ''}`;
    b.innerHTML = a.label;
    b.addEventListener('click', () => {
      uiSound('tap');
      close();
      a.onClick?.();
    });
    actions.appendChild(b);
  }
  host.addEventListener('click', (e) => {
    if (e.target === host) close();
  });
  document.body.appendChild(host);
  return close;
}

let toastTimer = 0;
export function toast(msg: string): void {
  let el = document.querySelector('.toast') as HTMLElement | null;
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove('show'), 2200);
}

export function difficultyDots(d: number): string {
  let html = '<span class="diff-dots">';
  for (let i = 1; i <= 3; i++) {
    html += `<span class="diff-dot ${i <= d ? 'on' : ''}"></span>`;
  }
  return html + '</span>';
}
