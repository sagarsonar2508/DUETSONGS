/**
 * Duet Stars — Studio (local admin, dev-server only).
 *
 * Shell + render loop. The studio is a single-page tool: header with the
 * project-folder connection, roster sidebar, and a content area showing the
 * welcome dashboard, a character detail page, or the new-character form.
 */

import './styles.css';
import {
  state,
  subscribe,
  init,
  folderStatus,
  charInfo,
  connectFolder,
  reconnectFolder,
  disconnectFolder,
  sectionOf,
  showSection,
  type Section,
} from './store';
import { el, toast } from './ui';
import { renderSidebar } from './views/sidebar';
import { renderDetailView } from './views/detailView';
import { renderCreateView } from './views/createView';
import { renderWelcomeView } from './views/welcomeView';
import { renderSongsSidebar, renderSongsHome, renderSongDetail } from './views/songViews';
import { renderAppSidebar, renderAppPage } from './views/appViews';
import { onArtRerender, resetArtDraft } from './views/artSection';
import { onVoiceRerender, resetVoiceDraft } from './views/voiceSection';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'characters', label: '🐾 Characters' },
  { id: 'songs', label: '🎵 Songs' },
  { id: 'app', label: '📱 App' },
];

const root = document.getElementById('admin')!;
let lastViewKey = '';

/* Hash deep-links (#char/cat-m, #song/twinkle, #app/economy, #songs,
   #create) so a reload — or a bookmarked link — lands on the same view. */

function viewToHash(): string {
  const v = state.view;
  switch (v.kind) {
    case 'character': return `#char/${v.id}`;
    case 'create': return '#create';
    case 'songs-home': return '#songs';
    case 'song': return `#song/${v.id}`;
    case 'app': return `#app/${v.page}`;
    default: return '#';
  }
}

function hashToView(hash: string): void {
  const [head, arg] = hash.replace(/^#/, '').split('/');
  if (head === 'char' && arg) state.view = { kind: 'character', id: arg };
  else if (head === 'create') state.view = { kind: 'create' };
  else if (head === 'songs') state.view = { kind: 'songs-home' };
  else if (head === 'song' && arg) state.view = { kind: 'song', id: arg };
  else if (head === 'app') {
    const page = arg === 'economy' || arg === 'icons' ? arg : 'branding';
    state.view = { kind: 'app', page };
  }
}

function folderControls(): string {
  switch (folderStatus()) {
    case 'connected':
      return `
        <span class="chip chip-good" title="Writing into the app folder">📁 app folder · connected</span>
        <button class="btn btn-small btn-ghost" data-act="disconnect" title="Forget this folder">✕</button>`;
    case 'reconnect':
      return `
        <span class="chip chip-warn">📁 folder remembered</span>
        <button class="btn btn-small btn-primary" data-act="reconnect">🔓 Re-grant access</button>`;
    case 'disconnected':
      return `<button class="btn btn-small btn-primary" data-act="connect">📁 Connect app folder</button>`;
    case 'unsupported':
      return `<span class="chip chip-warn" title="File System Access API missing">⚠️ read-only — use Chrome/Edge to save</span>`;
  }
}

function render(): void {
  if (!state.ready) {
    root.innerHTML = `<div class="studio-loading">🐾 Loading roster…</div>`;
    return;
  }

  // leaving a character page drops its unsaved art/voice drafts
  const viewKey = state.view.kind === 'character' ? `char:${state.view.id}` : state.view.kind;
  if (viewKey !== lastViewKey) {
    resetArtDraft();
    resetVoiceDraft();
    lastViewKey = viewKey;
  }

  const prevScroll = root.querySelector('.content')?.scrollTop ?? 0;
  const section = sectionOf(state.view);

  root.innerHTML = '';
  const shell = el(`
    <div class="studio">
      <header class="studio-header">
        <div class="brand">
          <span class="brand-mark">🎛</span>
          <span><b>Duet Stars</b> Studio</span>
          <span class="chip chip-mono">local · dev only</span>
        </div>
        <nav class="tabs">
          ${SECTIONS.map(
            (s) => `<button class="tab ${s.id === section ? 'active' : ''}" data-section="${s.id}">${s.label}</button>`,
          ).join('')}
        </nav>
        <div class="header-actions">
          <a class="btn btn-small btn-ghost" href="/" target="_blank" rel="noopener">🎮 Open game</a>
          ${folderControls()}
        </div>
      </header>
      <div class="studio-body">
        <div class="sidebar-slot"></div>
        <main class="content"></main>
      </div>
    </div>`);

  const sidebar =
    section === 'songs'
      ? renderSongsSidebar()
      : section === 'app'
        ? renderAppSidebar()
        : renderSidebar();
  shell.querySelector('.sidebar-slot')!.replaceWith(sidebar);

  const content = shell.querySelector('.content')!;
  const v = state.view;
  if (v.kind === 'create') {
    content.appendChild(renderCreateView());
  } else if (v.kind === 'character') {
    const info = charInfo(v.id);
    content.appendChild(info ? renderDetailView(info) : renderWelcomeView());
  } else if (v.kind === 'song') {
    content.appendChild(renderSongDetail(v.id));
  } else if (v.kind === 'songs-home') {
    content.appendChild(renderSongsHome());
  } else if (v.kind === 'app') {
    content.appendChild(renderAppPage(v.page));
  } else {
    content.appendChild(renderWelcomeView());
  }

  shell.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () =>
      showSection((t as HTMLElement).dataset.section as Section),
    ),
  );

  shell.querySelector('[data-act="connect"]')?.addEventListener('click', () => {
    void connectFolder().then((err) => {
      if (err) toast(err, false);
      else toast('Folder connected — the studio now saves straight into the project.');
    });
  });
  shell.querySelector('[data-act="reconnect"]')?.addEventListener('click', () => {
    void reconnectFolder().then((err) => {
      if (err) toast(err, false);
      else toast('Write access restored.');
    });
  });
  shell.querySelector('[data-act="disconnect"]')?.addEventListener('click', () => {
    void disconnectFolder().then(() => toast('Folder forgotten.'));
  });

  root.appendChild(shell);
  root.querySelector('.content')!.scrollTop = prevScroll;
  history.replaceState(null, '', viewToHash());

  // brand click → section home
  shell.querySelector('.brand')!.addEventListener('click', () => showSection(section));
}

onArtRerender(render);
onVoiceRerender(render);
subscribe(render);
hashToView(location.hash);
window.addEventListener('hashchange', () => {
  hashToView(location.hash);
  render();
});
render();
void init();
