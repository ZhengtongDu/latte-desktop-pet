import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { catAudio } from './audio';
import { PetEngine } from './petEngine';
import type { CustomAccessoryMeta } from './wardrobe';

interface AppSettings {
  scale: number;
  privacyPasswordGuard: boolean;
  fpsCap: number;
  outfitId: string;
  harnessOn: boolean;
  gearTheme?: string;
  sceneId?: string;
}

type InputEvent =
  | { kind: 'keyDown'; vk: number; scan: number; repeat: boolean }
  | { kind: 'keyUp'; vk: number; scan: number }
  | { kind: 'mouseDown'; button: string }
  | { kind: 'mouseUp'; button: string }
  | { kind: 'mouseWheel'; delta: number }
  | { kind: 'mouseMove'; x: number; y: number; nx: number; ny: number }
  | { kind: 'privacyTyping' };

interface WindowCursorInfo {
  relX: number;
  relY: number;
  insideWindow: boolean;
  overCat: boolean;
}

const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
const engine = new PetEngine(canvas);

function applySettings(s: AppSettings): void {
  engine.setFpsCap(s.fpsCap ?? 30);
  engine.setWardrobe({
    outfitId: s.outfitId ?? 'donut-yellow',
    harnessOn: Boolean(s.harnessOn),
  });
  engine.setGearTheme(s.gearTheme ?? 'dark-rgb');
  engine.setScene(s.sceneId ?? 'none');
  catAudio.setEnabled(true);
}

async function bootstrap(): Promise<void> {
  // Support standalone Vite preview (`index.html?gear=snow-white&scene=bookshelf&demo=easter`)
  const params = new URLSearchParams(window.location.search);
  const inTauri = '__TAURI_INTERNALS__' in window;

  if (!inTauri) {
    applySettings({
      scale: 0.68,
      privacyPasswordGuard: true,
      fpsCap: 30,
      outfitId: params.get('outfit') || 'donut-yellow',
      harnessOn: params.get('harness') === '1',
      gearTheme: params.get('gear') || 'dark-rgb',
      sceneId: params.get('scene') || 'none',
    });
    const demo = params.get('demo');
    if (demo) engine.setDemoMode(demo);
    engine.start();
    return;
  }

  engine.setCustomAccessoryLoader((id) =>
    invoke<string | null>('load_custom_accessory_image', { id }).catch(() => null),
  );

  const [settings, customAccs] = await Promise.all([
    invoke<AppSettings>('get_settings'),
    invoke<CustomAccessoryMeta[]>('list_custom_accessories').catch(() => []),
  ]);
  engine.setCustomAccessories(customAccs);
  applySettings(settings);
  engine.start();

  const appWin = getCurrentWindow();
  let dragging = false;

  canvas.addEventListener('pointerdown', (e) => {
    catAudio.unlock();
    if (e.button === 0) {
      dragging = true;
      canvas.classList.add('pet-dragging');
      void invoke('set_dragging', { dragging: true }).catch(() => {});
      void appWin
        .startDragging()
        .catch(() => {})
        .finally(() => {
          dragging = false;
          canvas.classList.remove('pet-dragging');
          void invoke('set_dragging', { dragging: false }).catch(() => {});
          void invoke('save_window_pos').catch(() => {});
        });
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    engine.triggerTailFlick();
  });

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    void invoke('open_context_menu').catch(() => {});
  });

  await listen<InputEvent>('kuro-input', (ev) => {
    const p = ev.payload;
    switch (p.kind) {
      case 'keyDown':
        engine.onKeyDown(p.vk, p.repeat);
        break;
      case 'keyUp':
        engine.onKeyUp(p.vk);
        break;
      case 'mouseMove':
        engine.onGlobalMouseMove(p.nx, p.ny);
        break;
      case 'mouseDown':
        engine.onMouseDown(p.button);
        break;
      case 'mouseUp':
        engine.onMouseUp(p.button);
        break;
      case 'mouseWheel':
        engine.onMouseWheel();
        break;
      case 'privacyTyping':
        engine.onPrivacyTyping();
        break;
    }
  });

  await listen<WindowCursorInfo>('kuro-cursor', (ev) => {
    const c = ev.payload;
    if (!dragging) {
      canvas.classList.toggle('pet-hover', c.overCat);
    }
    engine.onWindowCursor(c.relX, c.relY, c.overCat);
  });

  await listen<boolean>('kuro-privacy', (ev) => {
    engine.setPrivacyMode(Boolean(ev.payload));
  });

  await listen<AppSettings>('kuro-settings', (ev) => {
    applySettings(ev.payload);
  });

  await listen<CustomAccessoryMeta[]>('kuro-accessories', (ev) => {
    if (Array.isArray(ev.payload)) engine.setCustomAccessories(ev.payload);
  });
}

void bootstrap();
