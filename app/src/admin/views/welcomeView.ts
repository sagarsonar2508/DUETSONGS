/**
 * Landing view: roster stats, the three-step workflow, and connection help.
 */

import { roster, folderStatus } from '../store';
import { el } from '../ui';

export function renderWelcomeView(): HTMLElement {
  const all = roster();
  const builtins = all.filter((c) => c.builtin).length;
  const studio = all.length - builtins;
  const artCount = all.filter((c) => c.art.idle || c.art.sing).length;
  const voiceCount = all.filter((c) => c.voice).length;
  const hiddenCount = all.filter((c) => c.hidden).length;
  const status = folderStatus();

  return el(`
    <div class="detail welcome">
      <header class="detail-head">
        <div class="detail-title">
          <h1>🎛 Characters</h1>
          <p class="detail-blurb">
            The cast in one place: view and replace artwork, give characters real recorded voices,
            tune their details, and grow or trim the roster. Song posters & prices live in the
            🎵 Songs tab; branding, the full economy and app icons in the 📱 App tab. Local dev
            tool only — nothing ships until you rebuild.
          </p>
        </div>
      </header>

      <section class="stat-row">
        <div class="stat"><b>${all.length}</b><span>characters</span><small>${builtins} built-in · ${studio} studio</small></div>
        <div class="stat"><b>${artCount}</b><span>with custom art</span><small>${all.length - artCount} on vector templates</small></div>
        <div class="stat"><b>${voiceCount}</b><span>with recorded voices</span><small>${all.length - voiceCount} on synth patches</small></div>
        <div class="stat"><b>${hiddenCount}</b><span>hidden</span><small>removed from the game</small></div>
      </section>

      <section class="card">
        <div class="card-head"><h2>How it works</h2></div>
        <ol class="steps">
          <li>
            <b>Connect the app folder</b> — ${
              status === 'connected'
                ? '✅ done. The studio reads and writes the app folder directly.'
                : status === 'unsupported'
                  ? '⚠️ this browser lacks the File System Access API — open the studio in Chrome or Edge to save files.'
                  : 'click the button in the header and pick the <code>app</code> folder (picking the repo root works too). Asked once, remembered after.'
            }
          </li>
          <li>
            <b>Pick a character</b> from the left — replace artwork (drag a Midjourney PNG; it is
            sanitized, background-keyed and framed automatically), record or upload a real voice,
            hide it, or duplicate it. Or create a brand-new character from a species template.
          </li>
          <li>
            <b>Ship it</b> — everything lands as plain files (<code>public/characters/</code>,
            <code>public/posters/</code>, <code>public/content.json</code>, <code>assets/</code>).
            The dev server picks them up instantly; run <code>npm run build</code> /
            <code>npm run apk</code> to ship.
          </li>
        </ol>
      </section>
    </div>`);
}
