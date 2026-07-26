/**
 * Audio sync calibration.
 *
 * Android WebView output latency varies wildly between devices (roughly
 * 20–150 ms), which makes the music drift behind the falling treats. The
 * player taps along to a metronome; we measure how late their taps land
 * relative to the scheduled clicks and store that as the "audio lead" —
 * how far ahead every sound is scheduled so it is *heard* on time.
 */

import { audio } from '../audio/engine';
import { save, persist } from '../core/storage';
import { uiSound } from '../audio/instruments';

const INTERVAL = 0.6; // seconds between clicks (100 BPM)
const NEEDED = 8;
const MAX_TAPS = 16;

export function openCalibration(onClose?: () => void): void {
  const ctx = audio.ctx;
  const clicks: number[] = [];
  const deltas: number[] = [];
  let nextClick = ctx.currentTime + 1.2;
  let raf = 0;
  let timer = 0;

  const host = document.createElement('div');
  host.className = 'overlay overlay-fade';
  host.innerHTML = `
    <div class="panel calib-panel">
      <h2>Sync Calibration</h2>
      <div class="calib-note">Tap the circle <b>exactly when you hear</b> each click.<br/>Use speakers or wired headphones — Bluetooth adds delay.</div>
      <div class="calib-pad" id="calibPad">
        <div class="calib-ring"></div>
        <div class="calib-count">0 / ${NEEDED}</div>
      </div>
      <div class="calib-result">Listening…</div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-act="save" disabled>Save</button>
        <button class="btn" data-act="auto">Use automatic</button>
        <button class="btn btn-ghost" data-act="cancel">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(host);

  const pad = host.querySelector('#calibPad') as HTMLElement;
  const ring = host.querySelector('.calib-ring') as HTMLElement;
  const countEl = host.querySelector('.calib-count') as HTMLElement;
  const resultEl = host.querySelector('.calib-result') as HTMLElement;
  const saveBtn = host.querySelector('[data-act="save"]') as HTMLButtonElement;

  /** Short, sharp click so the onset is unambiguous. */
  function scheduleClick(at: number): void {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.5, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1600, at);
    o.connect(g).connect(audio.sfxBus);
    o.start(at);
    o.stop(at + 0.08);
  }

  // lookahead scheduler
  timer = window.setInterval(() => {
    if (ctx.state !== 'running') return;
    while (nextClick < ctx.currentTime + 0.8) {
      scheduleClick(nextClick);
      clicks.push(nextClick);
      if (clicks.length > 60) clicks.shift();
      nextClick += INTERVAL;
    }
  }, 120);

  // visual pulse in time with the clicks
  const pulse = (): void => {
    const now = ctx.currentTime;
    let nearest = Infinity;
    for (const c of clicks) {
      const d = Math.abs(now - c);
      if (d < nearest) nearest = d;
    }
    const k = Math.max(0, 1 - nearest / 0.25);
    ring.style.transform = `scale(${1 + k * 0.28})`;
    ring.style.opacity = String(0.35 + k * 0.65);
    raf = requestAnimationFrame(pulse);
  };
  raf = requestAnimationFrame(pulse);

  function median(xs: number[]): number {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function onTap(e: PointerEvent): void {
    e.preventDefault();
    const at = ctx.currentTime;
    let best = Infinity;
    for (const c of clicks) {
      const d = at - c;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    // ignore taps that are nowhere near a click
    if (!isFinite(best) || Math.abs(best) > INTERVAL * 0.45) return;
    deltas.push(best);
    if (deltas.length > MAX_TAPS) deltas.shift();

    pad.classList.remove('hit');
    void pad.offsetWidth;
    pad.classList.add('hit');
    countEl.textContent = `${Math.min(deltas.length, NEEDED)} / ${NEEDED}`;

    if (deltas.length >= NEEDED) {
      // drop the worst outliers, then take the median
      const med = median(deltas);
      const kept = deltas.filter((d) => Math.abs(d - med) < 0.12);
      const ms = Math.round(median(kept.length >= 4 ? kept : deltas) * 1000);
      const clamped = Math.max(0, Math.min(300, ms));
      resultEl.innerHTML = `Measured delay: <b>${clamped} ms</b><br/><small>${
        clamped < 30 ? 'your device is nice and snappy' : clamped < 90 ? 'typical for a phone' : 'high latency — this will help a lot'
      }</small>`;
      saveBtn.disabled = false;
      saveBtn.dataset.value = String(clamped);
    }
  }

  pad.addEventListener('pointerdown', onTap);

  const close = (): void => {
    clearInterval(timer);
    cancelAnimationFrame(raf);
    pad.removeEventListener('pointerdown', onTap);
    host.remove();
    onClose?.();
  };

  host.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      const act = (b as HTMLElement).dataset.act;
      if (act === 'save') {
        save.settings.audioLeadMs = Number(saveBtn.dataset.value ?? -1);
        persist();
        uiSound('buy');
      } else if (act === 'auto') {
        save.settings.audioLeadMs = -1;
        persist();
        uiSound('tap');
      } else {
        uiSound('tap');
      }
      close();
    }),
  );
}
