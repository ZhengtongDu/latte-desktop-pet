import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  GEAR_THEME_OPTIONS,
  normalizeGearTheme,
  normalizeSceneId,
  SCENE_OPTIONS,
  type GearThemeId,
  type SceneId,
} from './themes';
import { NECK_OPTIONS, type CustomAccessoryMeta } from './wardrobe';

interface AppSettings {
  scale: number;
  privacyPasswordGuard: boolean;
  fpsCap: number;
  outfitId: string;
  harnessOn: boolean;
  gearTheme: GearThemeId;
  sceneId: SceneId;
}

let settings: AppSettings = {
  scale: 0.68,
  privacyPasswordGuard: true,
  fpsCap: 30,
  outfitId: 'donut-yellow',
  harnessOn: false,
  gearTheme: 'dark-rgb',
  sceneId: 'none',
};

let customAccessories: CustomAccessoryMeta[] = [];

const menuEl = document.getElementById('context-menu') as HTMLDivElement;
const outfitPillsEl = document.getElementById('outfit-pills') as HTMLDivElement | null;
const gearPillsEl = document.getElementById('gear-pills') as HTMLDivElement | null;
const scenePillsEl = document.getElementById('scene-pills') as HTMLDivElement | null;

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

  if (gearPillsEl) {
    const activeGear = normalizeGearTheme(settings.gearTheme);
    gearPillsEl.innerHTML = '';
    for (const item of GEAR_THEME_OPTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kb-pill';
      btn.dataset.gear = item.id;
      btn.textContent = item.name;
      btn.classList.toggle('active', item.id === activeGear);
      gearPillsEl.appendChild(btn);
    }
  }

  if (scenePillsEl) {
    const activeScene = normalizeSceneId(settings.sceneId);
    scenePillsEl.innerHTML = '';
    for (const item of SCENE_OPTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kb-pill';
      btn.dataset.scene = item.id;
      btn.textContent = item.name;
      btn.classList.toggle('active', item.id === activeScene);
      scenePillsEl.appendChild(btn);
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
    settings = {
      ...settings,
      ...loaded,
      gearTheme: normalizeGearTheme(loaded.gearTheme),
      sceneId: normalizeSceneId(loaded.sceneId),
    };
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
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-action], [data-outfit], [data-gear], [data-scene], [data-fpscap]',
    );
    if (!target) return;

    if (target.dataset.outfit) {
      void patchSettings({ outfitId: target.dataset.outfit });
      return;
    }
    if (target.dataset.gear) {
      void patchSettings({ gearTheme: normalizeGearTheme(target.dataset.gear) });
      return;
    }
    if (target.dataset.scene) {
      void patchSettings({ sceneId: normalizeSceneId(target.dataset.scene) });
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
    settings = {
      ...settings,
      ...ev.payload,
      gearTheme: normalizeGearTheme(ev.payload.gearTheme),
      sceneId: normalizeSceneId(ev.payload.sceneId),
    };
    renderUI();
  });
  await listen<CustomAccessoryMeta[]>('kuro-accessories', (ev) => {
    if (Array.isArray(ev.payload)) {
      customAccessories = ev.payload;
      renderUI();
    }
  });
  await listen('kuro-menu-opened', async () => {
    const loaded = await invoke<AppSettings>('get_settings').catch(() => settings);
    settings = {
      ...settings,
      ...loaded,
      gearTheme: normalizeGearTheme(loaded.gearTheme),
      sceneId: normalizeSceneId(loaded.sceneId),
    };
    renderUI();
  });
}

void bootstrap();
