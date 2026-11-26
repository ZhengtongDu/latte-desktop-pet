import bodyIdleUrl from './assets/latte/pencil/body_idle.webp';
import bodyBlinkUrl from './assets/latte/pencil/body_blink.webp';
import bodyTypingUrl from './assets/latte/pencil/body_typing.webp';
import bodyHappyUrl from './assets/latte/pencil/body_happy.webp';
import bodyAngryUrl from './assets/latte/pencil/body_angry.webp';
import bodySleepUrl from './assets/latte/pencil/body_sleep.webp';
import pawLeftDownUrl from './assets/latte/pencil/paw_left_down.webp';
import pawLeftUpUrl from './assets/latte/pencil/paw_left_up.webp';
import pawRightDownUrl from './assets/latte/pencil/paw_right_down.webp';
import pawRightUpUrl from './assets/latte/pencil/paw_right_up.webp';
import pawLeftPressFarUrl from './assets/latte/pencil/paw_left_press_far.webp';
import pawLeftPressMidUrl from './assets/latte/pencil/paw_left_press_mid.webp';
import pawLeftPressInUrl from './assets/latte/pencil/paw_left_press_in.webp';
import pawRightPressInUrl from './assets/latte/pencil/paw_right_press_in.webp';
import pawRightPressMidUrl from './assets/latte/pencil/paw_right_press_mid.webp';
import pawRightPressFarUrl from './assets/latte/pencil/paw_right_press_far.webp';
import tail0Url from './assets/latte/pencil/tail_0.webp';
import tail1Url from './assets/latte/pencil/tail_1.webp';
import tail2Url from './assets/latte/pencil/tail_2.webp';
import accDonutUrl from './assets/latte/pencil/acc_donut.webp';
import accBellUrl from './assets/latte/pencil/acc_bell_collar.webp';
import accHarnessUrl from './assets/latte/pencil/acc_harness.webp';
import {
  DEFAULT_WARDROBE,
  normalizeOutfitId,
  type CustomAccessoryMeta,
  type CustomImageLoader,
  type WardrobeSelection,
} from './wardrobe';

export interface LatteLayout {
  logicalW: number;
  kbCenterX: number;
  kbCenterY: number;
  kbWidth: number;
  kbHeight: number;
  kbTiltRad: number;
  mouseX: number;
  mouseY: number;
  mouseLeft: boolean;
  mouseRight: boolean;
  petEnergy: number;
  privacyMode: boolean;
  asleep: boolean;
  sleepAmount: number;
  isCross: boolean;
  crossAmount: number;
}

type LatteExpr = 'idle' | 'blink' | 'typing' | 'happy' | 'angry' | 'sleep';

const LAYER_URLS = {
  body_idle: bodyIdleUrl,
  body_blink: bodyBlinkUrl,
  body_typing: bodyTypingUrl,
  body_happy: bodyHappyUrl,
  body_angry: bodyAngryUrl,
  body_sleep: bodySleepUrl,
  paw_left_down: pawLeftDownUrl,
  paw_left_up: pawLeftUpUrl,
  paw_right_down: pawRightDownUrl,
  paw_right_up: pawRightUpUrl,
  paw_left_press_far: pawLeftPressFarUrl,
  paw_left_press_mid: pawLeftPressMidUrl,
  paw_left_press_in: pawLeftPressInUrl,
  paw_right_press_in: pawRightPressInUrl,
  paw_right_press_mid: pawRightPressMidUrl,
  paw_right_press_far: pawRightPressFarUrl,
  tail_0: tail0Url,
  tail_1: tail1Url,
  tail_2: tail2Url,
  acc_donut: accDonutUrl,
  acc_bell_collar: accBellUrl,
  acc_harness: accHarnessUrl,
} as const;

type LayerKey = keyof typeof LAYER_URLS;

interface PawSpriteSpec {
  key: LayerKey;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  shX: number;
  shY: number;
  tipX: number;
  tipY: number;
  theta: number; // atan2(tipY - shY, tipX - shX)
  len: number;   // hypot(tipX - shX, tipY - shY) in 1024px space
}

function makePawSpec(
  key: LayerKey,
  crop: [number, number, number, number],
  shoulder: [number, number],
  tip: [number, number],
): PawSpriteSpec {
  const dx = tip[0] - shoulder[0];
  const dy = tip[1] - shoulder[1];
  return {
    key,
    cropX: crop[0],
    cropY: crop[1],
    cropW: crop[2],
    cropH: crop[3],
    shX: shoulder[0],
    shY: shoulder[1],
    tipX: tip[0],
    tipY: tip[1],
    theta: Math.atan2(dy, dx),
    len: Math.hypot(dx, dy),
  };
}

// Standard 1024² coordinate frame shared by all body, tail, accessory, and resting paw layers.
const CROP_X = 240;
const CROP_Y = 100;
const CROP_W = 688;
const CROP_H = 800;
const SRC_CENTER_X = 512;
const SRC_PAW_LINE_Y = 880;
const SRC_NECK = { x: 514, y: 454 };
const SRC_HEAD_TOP = { x: 512, y: 172 };
const SRC_EYE_L = { x: 451, y: 330 };
const SRC_EYE_R = { x: 577, y: 327 };
const SRC_PAD_L_UP = { x: 406, y: 811 };
const SRC_PAD_R_UP = { x: 598, y: 810 };
const SRC_SHOULDER_L = { x: 413, y: 635 };
const SRC_SHOULDER_R = { x: 603, y: 635 };

const LEFT_PAW_SPECS: readonly PawSpriteSpec[] = [
  makePawSpec('paw_left_down', [240, 100, 688, 800], [413, 635], [413, 875]),
  makePawSpec('paw_left_press_far', [153, 595, 327, 325], [413, 635], [215, 910]),
  makePawSpec('paw_left_press_mid', [318, 595, 161, 360], [413, 635], [385, 944]),
  makePawSpec('paw_left_press_in', [342, 595, 229, 345], [413, 635], [510, 930]),
];

const RIGHT_PAW_SPECS: readonly PawSpriteSpec[] = [
  makePawSpec('paw_right_down', [240, 100, 688, 800], [603, 635], [603, 875]),
  makePawSpec('paw_right_press_in', [445, 595, 242, 344], [603, 635], [510, 929]),
  makePawSpec('paw_right_press_mid', [538, 595, 168, 360], [603, 635], [645, 944]),
  makePawSpec('paw_right_press_far', [532, 595, 342, 349], [603, 635], [810, 935]),
];

const NOTE_PALETTE = ['#4fe3d1', '#9b8aff', '#ff84c8', '#f5c84b'] as const;
const NOTE_GLYPHS = ['♪', '♫', '♪', '✦'] as const;

interface FloatParticle {
  x: number;
  y: number;
  vy: number;
  age: number;
  lifetime: number;
  size: number;
  phase: number;
  sway: number;
  glyph: string;
  color: string;
  rot: number;
}

interface PawTracker {
  held: Map<number, { x: number; y: number }>;
  targetX: number;
  targetY: number;
  curX: number;
  curY: number;
  initialized: boolean;
  pressBlend: number;   // 0 = relaxed resting pose, 1 = actively reaching target
  tapUntil: number;
  lastPressAt: number;
  strikePulse: number;  // 1 -> 0 downward tap bounce
  chosenSpec: PawSpriteSpec | null;
}

interface Geom {
  s: number;
  ox: number;
  oyBody: number;
  oyPaw: number;
  charX: number;
}

function createPawTracker(): PawTracker {
  return {
    held: new Map(),
    targetX: 0,
    targetY: 0,
    curX: 0,
    curY: 0,
    initialized: false,
    pressBlend: 0,
    tapUntil: 0,
    lastPressAt: -10000,
    strikePulse: 0,
    chosenSpec: null,
  };
}

function wrapAngleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Layered colored-pencil renderer for 拿铁 (Latte, pure Silver Classic Tabby).
 * Draw order: tail → body(expression) → accessories → [mouse & keyboard] → targeted paws + floating FX.
 */
export class LatteRenderer {
  private imgs: Record<LayerKey, HTMLImageElement> | null = null;
  private selection: WardrobeSelection = { ...DEFAULT_WARDROBE };
  private customCatalog = new Map<string, CustomAccessoryMeta>();
  private customImages = new Map<string, HTMLImageElement | 'loading' | 'error'>();
  private customLoader: CustomImageLoader | null = null;

  private lastKeyAt = -10000;
  private keyTimes: number[] = [];
  private leftPaw = createPawTracker();
  private rightPaw = createPawTracker();
  private mousePressed = false;
  private lastSpaceLeft = false;

  private nextBlinkAt = performance.now() + 3000 + Math.random() * 3000;
  private blinkUntil = 0;

  private tailT = 0;
  private tailAmp = 0.75;
  private tailFlickUntil = 0;
  private bob = 0;
  private leanX = 0;
  private breathT = 0;
  private nextNoteAt = 0;
  private nextHeartAt = 0;
  private particles: FloatParticle[] = [];

  public setWardrobeSelection(sel: Partial<WardrobeSelection>): void {
    const prev = this.selection.outfitId;
    if (sel.outfitId !== undefined) this.selection.outfitId = normalizeOutfitId(sel.outfitId);
    if (sel.harnessOn !== undefined) this.selection.harnessOn = Boolean(sel.harnessOn);
    if (prev.startsWith('custom:') && prev !== this.selection.outfitId) {
      const cached = this.customImages.get(prev);
      if (cached instanceof HTMLImageElement) cached.src = '';
      this.customImages.delete(prev);
    }
  }

  public setCustomAccessoryCatalog(items: CustomAccessoryMeta[]): void {
    this.customCatalog.clear();
    for (const item of items) this.customCatalog.set(item.id, item);
  }

  public setCustomAccessoryLoader(loader: CustomImageLoader | null): void {
    this.customLoader = loader;
  }

  private ensureImages(): Record<LayerKey, HTMLImageElement> {
    if (!this.imgs) {
      const out = {} as Record<LayerKey, HTMLImageElement>;
      for (const [key, url] of Object.entries(LAYER_URLS) as Array<[LayerKey, string]>) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        out[key] = img;
      }
      this.imgs = out;
    }
    return this.imgs;
  }

  public onPrivacyModeChanged(active: boolean): void {
    if (active) {
      this.leftPaw.held.clear();
      this.rightPaw.held.clear();
      this.mousePressed = false;
    }
  }

  public onPrivacyTyping(): void {
    this.bob = Math.min(1.2, this.bob + 0.55);
  }

  public onMouseClick(layout: LatteLayout, button: 'left' | 'right' = 'left'): void {
    const now = performance.now();
    this.mousePressed = true;
    const btnOffsetX = button === 'left' ? 5 : -5;
    const tx = layout.mouseX + btnOffsetX;
    const ty = layout.mouseY + 4;
    this.assignPawTarget(this.leftPaw, tx, ty, now, 260, layout, true);
    this.bob = Math.min(1.1, this.bob + 0.45);
    this.spawnKeySparkle(tx, ty - 14);
  }

  public onMouseRelease(): void {
    this.mousePressed = false;
  }

  public triggerTailFlick(): void {
    this.tailFlickUntil = performance.now() + 340;
    this.bob = Math.min(1.2, this.bob + 0.7);
  }

  public onKeyDown(vk: number, ptX: number, ptY: number, layout: LatteLayout, repeat: boolean): void {
    if (layout.privacyMode || repeat) return;
    const now = performance.now();
    this.lastKeyAt = now;
    this.keyTimes.push(now);
    this.bob = Math.min(1.4, this.bob + 0.78);

    // Natural touch-typing split between H (screen-left) and G (screen-right), alternating on Spacebar
    let useLeft: boolean;
    let targetX = ptX;
    if (vk === 0x20) {
      useLeft = !this.lastSpaceLeft;
      this.lastSpaceLeft = useLeft;
      targetX = useLeft ? layout.kbCenterX - 16 : layout.kbCenterX + 24;
    } else {
      useLeft = ptX < layout.kbCenterX + 12;
    }

    const paw = useLeft ? this.leftPaw : this.rightPaw;
    paw.held.set(vk, { x: targetX, y: ptY });
    this.assignPawTarget(paw, targetX, ptY, now, 230, layout, useLeft);

    // Crisp sparkle burst over the pressed keycap on energetic typing
    if (this.typingCps(now) >= 2.2 && this.particles.length < 10) {
      this.spawnKeySparkle(targetX, ptY - 10);
    }
  }

  public onKeyUp(vk: number): void {
    this.leftPaw.held.delete(vk);
    this.rightPaw.held.delete(vk);
  }

  private assignPawTarget(
    paw: PawTracker,
    tx: number,
    ty: number,
    now: number,
    holdMs: number,
    layout: LatteLayout,
    isLeft: boolean,
  ): void {
    if (!paw.initialized) {
      const rest = this.restTipWorld(layout, isLeft);
      paw.curX = rest.x;
      paw.curY = rest.y;
      paw.initialized = true;
    }
    paw.targetX = tx;
    paw.targetY = ty;
    paw.lastPressAt = now;
    paw.tapUntil = now + holdMs;
    paw.strikePulse = 1.0;
    paw.chosenSpec = null; // re-evaluate best directional sprite for the new key
  }

  /** Demo helper for static browser preview QA (`?demo=typing|happy|key:...`) */
  public seedDemoState(
    mode: 'typing' | 'happy',
    layout: LatteLayout,
    targets?: { left?: { x: number; y: number }; right?: { x: number; y: number } },
  ): void {
    const now = performance.now();
    this.lastKeyAt = now;
    const g = this.computeGeom(layout);
    const count = mode === 'happy' ? 10 : 5;
    for (let i = 0; i < count; i++) this.keyTimes.push(now - i * 110);

    if (targets?.left) {
      this.leftPaw.targetX = this.leftPaw.curX = targets.left.x;
      this.leftPaw.targetY = this.leftPaw.curY = targets.left.y;
      this.leftPaw.initialized = true;
      this.leftPaw.pressBlend = 1;
      this.leftPaw.tapUntil = now + 60_000;
      this.leftPaw.lastPressAt = now;
      this.leftPaw.chosenSpec = null;
    }
    if (targets?.right) {
      this.rightPaw.targetX = this.rightPaw.curX = targets.right.x;
      this.rightPaw.targetY = this.rightPaw.curY = targets.right.y;
      this.rightPaw.initialized = true;
      this.rightPaw.pressBlend = 1;
      this.rightPaw.tapUntil = now + 60_000;
      this.rightPaw.lastPressAt = now;
      this.rightPaw.chosenSpec = null;
    }

    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: g.charX + (i - 1) * 44,
        y: g.oyBody + SRC_HEAD_TOP.y * g.s - 8 - i * 16,
        vy: -42,
        age: 0.25 + i * 0.12,
        lifetime: 1.5,
        size: 24 + (i % 2) * 4,
        phase: i * 1.4,
        sway: 10,
        glyph: mode === 'happy' ? '♥' : NOTE_GLYPHS[i % NOTE_GLYPHS.length],
        color: mode === 'happy' ? '#f07067' : NOTE_PALETTE[i % NOTE_PALETTE.length],
        rot: (i - 1) * 0.14,
      });
    }
  }

  private spawnKeySparkle(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y,
      vy: -36 - Math.random() * 16,
      age: 0,
      lifetime: 0.52,
      size: 15 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      sway: 5,
      glyph: '✦',
      color: Math.random() < 0.55 ? '#4fe3d1' : '#f5c84b',
      rot: (Math.random() - 0.5) * 0.4,
    });
  }

  public update(dt: number, now: number, layout: LatteLayout): void {
    this.bob *= Math.exp(-10.5 * dt);
    this.breathT += dt * (layout.asleep ? 1.4 : 2.3);

    while (this.keyTimes.length && now - this.keyTimes[0] > 2000) this.keyTimes.shift();

    if (now >= this.nextBlinkAt) {
      this.blinkUntil = now + 140;
      this.nextBlinkAt = now + 3200 + Math.random() * 3600;
    }

    // Track mouse position while mouse button is held down
    if (this.mousePressed && !layout.privacyMode) {
      const btnOffsetX = layout.mouseRight && !layout.mouseLeft ? -5 : 5;
      this.leftPaw.targetX = layout.mouseX + btnOffsetX;
      this.leftPaw.targetY = layout.mouseY + 4;
      this.leftPaw.tapUntil = Math.max(this.leftPaw.tapUntil, now + 120);
    }

    // Update both paws' spring targeting & return-to-rest easing
    const leftActive = !layout.privacyMode && !layout.asleep &&
      (this.mousePressed || this.leftPaw.held.size > 0 || now < this.leftPaw.tapUntil);
    const rightActive = !layout.privacyMode && !layout.asleep &&
      (this.rightPaw.held.size > 0 || now < this.rightPaw.tapUntil);

    this.updatePawTracker(this.leftPaw, leftActive, true, dt, layout);
    this.updatePawTracker(this.rightPaw, rightActive, false, dt, layout);

    // Subtle adorable torso lean toward active reach targets (clamped ±7.5px)
    let desiredLean = 0;
    const baseCharX = 212;
    if (leftActive && rightActive) {
      desiredLean = (((this.leftPaw.targetX + this.rightPaw.targetX) * 0.5) - baseCharX) * 0.06;
    } else if (leftActive) {
      desiredLean = (this.leftPaw.targetX - baseCharX) * 0.065;
    } else if (rightActive) {
      desiredLean = (this.rightPaw.targetX - baseCharX) * 0.065;
    }
    desiredLean = Math.max(-7.5, Math.min(7.5, desiredLean));
    this.leanX += (desiredLean - this.leanX) * (1 - Math.exp(-12 * dt));

    const isHappy = !layout.privacyMode && !layout.isCross && layout.petEnergy > 0.28;
    const typing = now - this.lastKeyAt < 650 || this.leftPaw.held.size > 0 || this.rightPaw.held.size > 0;
    const cps = this.typingCps(now);

    let speed = 1.4;
    let amp = 0.78;
    if (layout.asleep) {
      speed = 0.5;
      amp = 0.25;
    } else if (layout.isCross) {
      speed = 7.5;
      amp = 1;
    } else if (isHappy || cps >= 4.5) {
      speed = 4.6;
      amp = 1;
    } else if (typing) {
      speed = 3.0;
      amp = 0.92;
    }
    this.tailT += dt * speed;
    this.tailAmp += (amp - this.tailAmp) * (1 - Math.exp(-4.5 * dt));

    const g = this.computeGeom(layout);

    // Lively musical notes whenever typing with rhythm (>= 2.8 CPS)
    if (!layout.privacyMode && !layout.asleep && typing && cps >= 2.8 && now >= this.nextNoteAt && this.particles.length < 9) {
      const fast = cps >= 4.5;
      this.nextNoteAt = now + (fast ? 260 : 420) + Math.random() * 140;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.push({
        x: g.charX + side * (26 + Math.random() * 44),
        y: g.oyBody + (SRC_HEAD_TOP.y + 12) * g.s,
        vy: -(44 + Math.random() * 18),
        age: 0,
        lifetime: 1.35 + Math.random() * 0.25,
        size: fast ? 24 + Math.random() * 5 : 21 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        sway: 10 + Math.random() * 5,
        glyph: NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)],
        color: NOTE_PALETTE[Math.floor(Math.random() * NOTE_PALETTE.length)],
        rot: (Math.random() - 0.5) * 0.28,
      });
    }

    // Warm coral hearts when petting Latte's head
    if (isHappy && now >= this.nextHeartAt && this.particles.length < 9) {
      this.nextHeartAt = now + 320 + Math.random() * 180;
      this.particles.push({
        x: g.charX + (Math.random() - 0.5) * 90,
        y: g.oyBody + (SRC_HEAD_TOP.y + 10) * g.s,
        vy: -(40 + Math.random() * 16),
        age: 0,
        lifetime: 1.3,
        size: 22 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        sway: 9,
        glyph: '♥',
        color: '#f07067',
        rot: (Math.random() - 0.5) * 0.22,
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.y += p.vy * dt;
      if (p.age >= p.lifetime) this.particles.splice(i, 1);
    }
  }

  private updatePawTracker(
    paw: PawTracker,
    active: boolean,
    isLeft: boolean,
    dt: number,
    layout: LatteLayout,
  ): void {
    const rest = this.restTipWorld(layout, isLeft);
    if (!paw.initialized) {
      paw.curX = rest.x;
      paw.curY = rest.y;
      paw.targetX = rest.x;
      paw.targetY = rest.y;
      paw.initialized = true;
    }

    const goalX = active ? paw.targetX : rest.x;
    const goalY = active ? paw.targetY : rest.y;

    // Fast snappy reach to keycaps (34 rad/s), smooth relaxed glide back to rest (11 rad/s)
    const rate = active ? 34 : 11;
    const alpha = 1 - Math.exp(-rate * dt);
    paw.curX += (goalX - paw.curX) * alpha;
    paw.curY += (goalY - paw.curY) * alpha;

    const blendRate = active ? 26 : 8.5;
    paw.pressBlend += ((active ? 1 : 0) - paw.pressBlend) * (1 - Math.exp(-blendRate * dt));
    paw.strikePulse *= Math.exp(-22 * dt);

    if (!active && paw.pressBlend < 0.04) {
      paw.pressBlend = 0;
      paw.chosenSpec = null;
    }
  }

  private restTipWorld(layout: LatteLayout, isLeft: boolean): { x: number; y: number } {
    const g = this.computeGeom(layout);
    const tipX = isLeft ? 413 : 603;
    return {
      x: g.ox + tipX * g.s,
      y: g.oyPaw + 875 * g.s,
    };
  }

  private computeGeom(layout: LatteLayout): Geom {
    const s = 0.337;
    const charX = 212 + this.leanX;
    const pawLineY = layout.kbCenterY - layout.kbHeight * 0.24;
    const ox = charX - SRC_CENTER_X * s;
    const oyPaw = pawLineY - SRC_PAW_LINE_Y * s;
    const breath = Math.sin(this.breathT) * (layout.asleep ? 1.0 : 0.6);
    const sink = layout.asleep ? 1.4 : 0;
    const oyBody = oyPaw + breath + this.bob * 2.0 + sink;
    return { s, ox, oyBody, oyPaw, charX };
  }

  private typingCps(now: number): number {
    let n = 0;
    for (let i = this.keyTimes.length - 1; i >= 0 && now - this.keyTimes[i] < 1500; i--) n++;
    return n / 1.5;
  }

  private pickExpression(now: number, layout: LatteLayout): LatteExpr {
    if (layout.privacyMode) return 'blink';
    if (layout.asleep || layout.sleepAmount > 0.5) return 'sleep';
    if (layout.isCross || layout.crossAmount > 0.35) return 'angry';
    if (layout.petEnergy > 0.28) return 'happy';
    if (now < this.blinkUntil) return 'blink';
    const typing = now - this.lastKeyAt < 650 || this.leftPaw.held.size > 0 || this.rightPaw.held.size > 0;
    if (typing) {
      return this.typingCps(now) >= 4.5 ? 'happy' : 'typing';
    }
    return 'idle';
  }

  private drawLayer(ctx: CanvasRenderingContext2D, key: LayerKey, g: Geom, oy: number): void {
    const img = this.imgs?.[key];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ctx.drawImage(img, g.ox + CROP_X * g.s, oy + CROP_Y * g.s, CROP_W * g.s, CROP_H * g.s);
  }

  private getCustomImage(id: string): HTMLImageElement | null {
    const cached = this.customImages.get(id);
    if (cached instanceof HTMLImageElement) return cached.complete && cached.naturalWidth > 0 ? cached : null;
    if (cached || !this.customLoader) return null;
    this.customImages.set(id, 'loading');
    void this.customLoader(id)
      .then((dataUrl) => {
        if (!dataUrl) {
          this.customImages.set(id, 'error');
          return;
        }
        const img = new Image();
        img.decoding = 'async';
        img.src = dataUrl;
        this.customImages.set(id, img);
      })
      .catch(() => this.customImages.set(id, 'error'));
    return null;
  }

  private drawCustomOutfit(ctx: CanvasRenderingContext2D, id: string, g: Geom): void {
    const img = this.getCustomImage(id);
    if (!img) return;
    const meta = this.customCatalog.get(id);
    if (Math.abs(img.naturalWidth - img.naturalHeight) <= 2) {
      ctx.drawImage(img, g.ox, g.oyBody, 1024 * g.s, 1024 * g.s);
      return;
    }
    const w = 300 * g.s * (meta?.scale ?? 1);
    const h = w * (img.naturalHeight / Math.max(1, img.naturalWidth));
    const cx = g.ox + SRC_NECK.x * g.s + (meta?.offsetX ?? 0);
    const cy = g.oyBody + SRC_NECK.y * g.s + (meta?.offsetY ?? 0);
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  private drawTail(ctx: CanvasRenderingContext2D, g: Geom, now: number): void {
    let p = 1 + Math.sin(this.tailT) * this.tailAmp;
    if (now < this.tailFlickUntil) p = 2;
    const frame = Math.max(0, Math.min(2, Math.round(p)));
    this.drawLayer(ctx, `tail_${frame}` as LayerKey, g, g.oyBody);
  }

  /** Layer 1 (before keyboard): tail, body, accessories. */
  public renderBody(ctx: CanvasRenderingContext2D, now: number, layout: LatteLayout): void {
    this.ensureImages();
    const g = this.computeGeom(layout);
    this.drawTail(ctx, g, now);
    const expr = this.pickExpression(now, layout);
    this.drawLayer(ctx, `body_${expr}` as LayerKey, g, g.oyBody);

    if (this.selection.harnessOn) this.drawLayer(ctx, 'acc_harness', g, g.oyBody);
    const neck = this.selection.outfitId;
    if (neck === 'donut-yellow') this.drawLayer(ctx, 'acc_donut', g, g.oyBody);
    else if (neck === 'bell-collar') this.drawLayer(ctx, 'acc_bell_collar', g, g.oyBody);
    else if (neck.startsWith('custom:')) this.drawCustomOutfit(ctx, neck, g);
  }

  /** Layer 2 (after keyboard): targeted directional paws + bold, lively floating FX. */
  public renderForeground(ctx: CanvasRenderingContext2D, now: number, layout: LatteLayout): void {
    const g = this.computeGeom(layout);

    if (layout.privacyMode) {
      this.drawCoverPaw(ctx, 'paw_left_up', SRC_PAD_L_UP, SRC_EYE_L, g, now, 1);
      this.drawCoverPaw(ctx, 'paw_right_up', SRC_PAD_R_UP, SRC_EYE_R, g, now, -1);
    } else {
      this.drawTargetedPaw(ctx, this.leftPaw, LEFT_PAW_SPECS, SRC_SHOULDER_L, 'paw_left_down', g);
      this.drawTargetedPaw(ctx, this.rightPaw, RIGHT_PAW_SPECS, SRC_SHOULDER_R, 'paw_right_down', g);
    }

    if (layout.asleep) this.drawZzz(ctx, g, now);
    this.drawParticles(ctx);
  }

  private pickBestPawSpec(
    specs: readonly PawSpriteSpec[],
    targetTheta: number,
    targetWorldLen: number,
    s: number,
    prev: PawSpriteSpec | null,
  ): PawSpriteSpec {
    let best = specs[0];
    let bestScore = Infinity;
    for (const sp of specs) {
      const angErr = Math.abs(wrapAngleDiff(targetTheta, sp.theta));
      const lenRatio = targetWorldLen / (sp.len * s);
      const lenErr = Math.abs(Math.log(Math.max(0.4, lenRatio)));
      const restPenalty = sp === specs[0] ? 0.14 : 0;
      const hysteresis = sp === prev ? -0.06 : 0;
      const score = angErr * 2.1 + lenErr * 0.85 + restPenalty + hysteresis;
      if (score < bestScore) {
        bestScore = score;
        best = sp;
      }
    }
    return best;
  }

  private drawTargetedPaw(
    ctx: CanvasRenderingContext2D,
    paw: PawTracker,
    specs: readonly PawSpriteSpec[],
    shoulderSrc: { x: number; y: number },
    restKey: LayerKey,
    g: Geom,
  ): void {
    if (paw.pressBlend <= 0.03) {
      this.drawLayer(ctx, restKey, g, g.oyPaw);
      return;
    }

    // Shoulder follows body vertical bob/breath so upper foreleg stays 100% glued to chest
    const shWx = g.ox + shoulderSrc.x * g.s;
    const shWy = g.oyBody + shoulderSrc.y * g.s;

    // Subtle tap bounce: brief lift on fresh strike, settling firmly onto keycap (+1.4px press)
    const tapLift = paw.strikePulse > 0.55 ? -(paw.strikePulse - 0.55) * 7.0 : (1 - paw.strikePulse) * 1.4;
    const tipWx = paw.curX;
    const tipWy = paw.curY + tapLift;

    const dx = tipWx - shWx;
    const dy = Math.max(24, tipWy - shWy);
    const targetTheta = Math.atan2(dy, dx);
    const targetLen = Math.hypot(dx, dy);

    const spec = this.pickBestPawSpec(specs, targetTheta, targetLen, g.s, paw.chosenSpec);
    paw.chosenSpec = spec;

    const img = this.imgs?.[spec.key];
    if (!img || !img.complete || img.naturalWidth === 0) {
      this.drawLayer(ctx, restKey, g, g.oyPaw);
      return;
    }

    // Soft contact shadow directly on the pressed keycap
    if (paw.pressBlend > 0.25) {
      ctx.save();
      ctx.globalAlpha = 0.26 * paw.pressBlend;
      ctx.fillStyle = '#0c0c12';
      ctx.beginPath();
      ctx.ellipse(tipWx, tipWy + 2.5, 13, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const naturalLen = spec.len * g.s;
    const lenScale = Math.max(0.76, Math.min(1.26, targetLen / naturalLen));
    // Keep paw width graceful while stretching subtly along the foreleg axis
    const widthScale = 1 + (lenScale - 1) * 0.32;

    ctx.save();
    ctx.translate(shWx, shWy);
    ctx.rotate(targetTheta);
    ctx.scale(lenScale, widthScale);
    ctx.rotate(-spec.theta);
    ctx.drawImage(
      img,
      (spec.cropX - spec.shX) * g.s,
      (spec.cropY - spec.shY) * g.s,
      spec.cropW * g.s,
      spec.cropH * g.s,
    );
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const u = Math.min(1, p.age / p.lifetime);
      const pop = u < 0.16 ? 0.45 + (u / 0.16) * 0.72 : u < 0.30 ? 1.17 - ((u - 0.16) / 0.14) * 0.17 : 1.0;
      const alpha = u > 0.70 ? Math.max(0, (1 - u) / 0.30) : Math.min(1, u / 0.10);
      const dx = Math.sin(p.age * 4.4 + p.phase) * p.sway;

      ctx.save();
      ctx.globalAlpha = alpha * 0.96;
      ctx.translate(p.x + dx, p.y);
      ctx.rotate(p.rot + Math.sin(p.age * 3.5 + p.phase) * 0.12);
      ctx.scale(pop, pop);
      ctx.font = `700 ${Math.round(p.size)}px -apple-system, "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 250, 242, 0.92)';
      ctx.lineWidth = 3.4;
      ctx.strokeText(p.glyph, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    }
  }

  private drawCoverPaw(
    ctx: CanvasRenderingContext2D,
    key: LayerKey,
    pad: { x: number; y: number },
    eye: { x: number; y: number },
    g: Geom,
    now: number,
    side: 1 | -1,
  ): void {
    const img = this.imgs?.[key];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const wobble = Math.sin(now * 0.008 + side) * 1.4;
    ctx.save();
    ctx.translate(g.ox + eye.x * g.s, g.oyBody + eye.y * g.s + wobble);
    ctx.rotate(side * 0.18);
    ctx.scale(1, -1);
    ctx.drawImage(
      img,
      (CROP_X - pad.x) * g.s,
      (CROP_Y - pad.y) * g.s,
      CROP_W * g.s,
      CROP_H * g.s,
    );
    ctx.restore();
  }

  private drawZzz(ctx: CanvasRenderingContext2D, g: Geom, now: number): void {
    const baseX = g.ox + (SRC_HEAD_TOP.x + 152) * g.s;
    const baseY = g.oyBody + (SRC_HEAD_TOP.y + 18) * g.s;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const t = (now / 1750 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(t * Math.PI) * 0.92;
      ctx.font = `700 ${15 + i * 4.5}px Georgia, "Songti SC", serif`;
      const x = baseX + t * 18 + i * 8;
      const y = baseY - t * 34 - i * 6;
      ctx.strokeStyle = 'rgba(255, 250, 242, 0.9)';
      ctx.lineWidth = 3.0;
      ctx.strokeText('z', x, y);
      ctx.fillStyle = '#6f655c';
      ctx.fillText('z', x, y);
    }
    ctx.restore();
  }
}
