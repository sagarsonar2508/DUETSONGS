/**
 * Tiny DOM + feedback helpers for the admin studio (no framework — the
 * studio renders HTML strings and binds events after each render, same
 * pattern as the game's screens).
 */

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function download(data: Blob | string, name: string): void {
  const a = document.createElement('a');
  a.href = typeof data === 'string' ? data : URL.createObjectURL(data);
  a.download = name;
  a.click();
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* --------------------------------- toast ---------------------------------- */

let toastTimer = 0;

export function toast(msg: string, ok = true): void {
  document.querySelector('.toast')?.remove();
  const t = el(`<div class="toast ${ok ? '' : 'toast-err'}">${esc(msg)}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), ok ? 2600 : 4200);
}

/** Toast an action result (store actions return an error string or null). */
export function toastResult(err: string | null, okMsg: string): void {
  if (err) toast(err, false);
  else toast(okMsg);
}

/* --------------------------------- modal ---------------------------------- */

export function confirmDialog(opts: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const host = el(`
      <div class="overlay">
        <div class="dialog">
          <h3>${esc(opts.title)}</h3>
          <p>${opts.body}</p>
          <div class="dialog-actions">
            <button class="btn btn-ghost" data-act="cancel">Cancel</button>
            <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">
              ${esc(opts.confirmLabel)}
            </button>
          </div>
        </div>
      </div>`);
    const done = (v: boolean) => {
      host.remove();
      resolve(v);
    };
    host.addEventListener('click', (e) => {
      if (e.target === host) done(false);
    });
    host.querySelector('[data-act="cancel"]')!.addEventListener('click', () => done(false));
    host.querySelector('[data-act="ok"]')!.addEventListener('click', () => done(true));
    document.body.appendChild(host);
    (host.querySelector('[data-act="ok"]') as HTMLElement).focus();
  });
}
