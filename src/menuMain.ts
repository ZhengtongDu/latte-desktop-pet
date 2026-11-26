import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { NECK_OPTIONS, type CustomAccessoryMeta } from './wardrobe';

interface AppSettings {
  scale: number;
  privacyPasswordGuard: boolean;
  fpsCap: number;
  outfitId: string;
  harnessOn: boolean;
}

let settings: AppSettings = {
  scale: 0.68,
  privacyPasswordGuard: true,
  fpsCap: 30,
  outfitId: 'donut-yellow',
  harnessOn: false,
};

let customAccessories: CustomAccessoryMeta[] = [];

const menuEl = document.getElementById('context-menu') as HTMLDivElement;
const outfitPillsEl = document.getElementById('outfit-pills') as HTMLDivElement | null;

function renderUI(): void {
  if (outfitPillsEl) {
    outfitPillsEl.innerHTML = '';
    const items = [
      ...NECK_OPTIONS,
      ...customAccessories.filter((c) => c.slot === 'outfit').map((c) => ({ id: c.id, name: c.name })),
    ];
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kb-pill';
      btn.dataset.outfit = item.id;
      btn.textContent = item.name;
      btn.classList.toggle('active', item.id === (settings.outfitId || 'donut-yellow'));
      outfitPillsEl.appendChild(btn);
    }
  }

  document.getElementById('sw-harness')?.classList.toggle('on', Boolean(settings.harnessOn));
  document.getElementById('sw-privacy')?.classList.toggle('on', settings.privacyPasswordGuard !== false);

  const fpsCap = settings.fpsCap === 20 ? '20' : settings.fpsCap === 30 ? '30' : '0';
  document.querySelectorAll<HTMLButtonElement>('[data-fpscap]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.fpscap === fpsCap);
  });
}

async function patchSettings(patch: Partial<AppSettings>): Promise<void> {
  settings = { ...settings, ...patch };
  renderUI();
  try {
    settings = await invoke<AppSettings>('update_settings', { patch: settings });
    renderUI();
  } catch {}
}

async function bootstrap(): Promise<void> {
  const inTauri = '__TAURI_INTERNALS__' in window;
  if (inTauri) {
    const [loaded, accs] = await Promise.all([
      invoke<AppSettings>('get_settings').catch(() => settings),
      invoke<CustomAccessoryMeta[]>('list_custom_accessories').catch(() => []),
    ]);
    settings = loaded;
    customAccessories = accs;
  }
  renderUI();

  document.getElementById('btn-close-menu')?.addEventListener('click', () => {
    void invoke('close_context_menu').catch(() => {});
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') void invoke('close_context_menu').catch(() => {});
  });

  menuEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action], [data-outfit], [data-fpscap]');
    if (!target) return;

    if (target.dataset.outfit) {
      void patchSettings({ outfitId: target.dataset.outfit });
      return;
    }
    const fps = target.dataset.fpscap;
    if (fps === '0' || fps === '30' || fps === '20') {
      void patchSettings({ fpsCap: Number(fps) });
      return;
    }
    switch (target.dataset.action) {
      case 'toggle-harness':
        void patchSettings({ harnessOn: !settings.harnessOn });
        break;
      case 'toggle-privacy':
        void patchSettings({ privacyPasswordGuard: !settings.privacyPasswordGuard });
        break;
      case 'open-accessories-folder':
        void invoke('open_accessories_folder').catch(() => {});
        break;
      case 'quit':
        void invoke('quit_app').catch(() => {});
        break;
    }
  });

  if (!inTauri) return;

  await listen<AppSettings>('kuro-settings', (ev) => {
    settings = ev.payload;
    renderUI();
  });
  await listen<CustomAccessoryMeta[]>('kuro-accessories', (ev) => {
    if (Array.isArray(ev.payload)) {
      customAccessories = ev.payload;
      renderUI();
    }
  });
  await listen('kuro-menu-opened', async () => {
    settings = await invoke<AppSettings>('get_settings').catch(() => settings);
    renderUI();
  });
}

void bootstrap();
