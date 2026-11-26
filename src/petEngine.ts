import { catAudio } from './audio';
import {
  formatBubbleForVk,
  KEYBOARD_KEYS,
  resolveKeyByVk,
  TOTAL_ROWS,
  TOTAL_UNITS,
  type KeySpec,
} from './keyboardLayout';
import { LatteRenderer, type LatteLayout } from './latteRenderer';
import type { CustomAccessoryMeta, CustomImageLoader, WardrobeSelection } from './wardrobe';

const LOGICAL_W = 420;
const LOGICAL_H = 440;
const KB_CX = 216;
const KB_CY = 344;
const KB_W = 250;
const KB_H = 68;
const KB_TILT = (3.4 * Math.PI) / 180;
const MOUSE_X = 66;
const MOUSE_Y = 336;
const SLEEP_IDLE_MS = 45_000;

interface KeyAnim {
  down: boolean;
  press: number;
  lastAt: number;
}

interface KeyBubble {
  label: string;
  x: number;
  y: number;
  age: number;
  lifetime: number;
  accent: string;
}

/**
 * Lightweight 2.5D Canvas engine dedicated to 拿铁 (Latte).
 * - Zero WebGL, zero per-frame shadowBlur, cached static RGB keyboard chassis.
 * - Adaptive 3-tier FPS cap (60 / 30 / 20) + 10 FPS idle + 5 FPS deep sleep + smart DPR cap.
 */
export class PetEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly latte = new LatteRenderer();
  private rafId: number | null = null;
  private running = false;
  private lastTickAt = 0;
  private lastRenderAt = 0;
  private fpsCap = 30;
  private dprCap = 1.5;

  private kbCacheCanvas: HTMLCanvasElement | null = null;
  private kbCacheKey = '';
  private keyAnims = new Map<string, KeyAnim>();
  private keyBubbles: KeyBubble[] = [];
  private kbBounce = 0;

  private mouseOffsetX = 0;
  private mouseOffsetY = 0;
  private mouseLeftDown = false;
  private mouseRightDown = false;
  private mouseLeftPress = 0;
  private mouseRightPress = 0;
  private mouseMiddlePress = 0;
  private mouseScrollFlash = 0;

  private petEnergy = 0;
  private prevCursorX = 0.5;
  private prevCursorY = 0.5;

  private privacyMode = false;
  private privacyClose = 0;
  private privacyTypingAt = -10000;

  private lastActivityAt = performance.now();
  private asleep = false;
  private sleepAmount = 0;
  private isCross = false;
  private crossUntil = -10000;
  private crossAmount = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2D Canvas unavailable');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickAt = performance.now();
    this.lastRenderAt = 0;
    const loop = (now: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);

      const minInterval = this.effectiveFrameIntervalMs(now);
      if (minInterval > 0 && now - this.lastRenderAt < minInterval - 1.5) return;

      const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTickAt) / 1000));
      this.lastTickAt = now;
      this.lastRenderAt = now;
      this.update(dt, now);
      this.render(now);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public setFpsCap(cap: number): void {
    this.fpsCap = cap === 20 ? 20 : cap === 30 ? 30 : 0;
    this.dprCap = this.fpsCap === 20 ? 1.25 : this.fpsCap === 30 ? 1.5 : 2.0;
    this.kbCacheKey = '';
    this.resize();
  }

  public setWardrobe(sel: Partial<WardrobeSelection>): void {
    this.latte.setWardrobeSelection(sel);
  }

  public setCustomAccessories(items: CustomAccessoryMeta[]): void {
    this.latte.setCustomAccessoryCatalog(items);
  }

  public setCustomAccessoryLoader(loader: CustomImageLoader | null): void {
    this.latte.setCustomAccessoryLoader(loader);
  }

  public setPrivacyMode(active: boolean): void {
    if (this.privacyMode === active) return;
    this.privacyMode = active;
    this.latte.onPrivacyModeChanged(active);
    if (active) {
      this.isCross = false;
      this.keyBubbles.length = 0;
      for (const a of this.keyAnims.values()) a.down = false;
    }
    this.wake(performance.now(), false);
  }

  public onPrivacyTyping(): void {
    const now = performance.now();
    this.privacyTypingAt = now;
    this.lastActivityAt = now;
    this.latte.onPrivacyTyping();
  }

  public onKeyDown(vk: number, repeat: boolean): void {
    if (this.privacyMode) return;
    const now = performance.now();
    this.wake(now, true);
    const spec = resolveKeyByVk(vk);
    const pt = spec ? this.keyWorldPos(spec) : { x: KB_CX, y: KB_CY };

    if (spec) {
      const anim = this.keyAnims.get(spec.id) ?? { down: false, press: 0, lastAt: 0 };
      anim.down = true;
      anim.press = 1;
      anim.lastAt = now;
      this.keyAnims.set(spec.id, anim);
    }

    if (!repeat) {
      this.kbBounce = Math.min(1.8, this.kbBounce + 0.9);
      const label = formatBubbleForVk(vk, spec);
      if (label) {
        this.pushBubble(label, pt.x, pt.y - 20, '#8ff3e6');
      }
    }

    this.latte.onKeyDown(vk, pt.x, pt.y, this.buildLayout(), repeat);
  }

  public onKeyUp(vk: number): void {
    const spec = resolveKeyByVk(vk);
    if (spec) {
      const anim = this.keyAnims.get(spec.id);
      if (anim) anim.down = false;
    }
    this.latte.onKeyUp(vk);
  }

  public onGlobalMouseMove(nx: number, ny: number): void {
    const now = performance.now();
    this.wake(now, false);
    this.mouseOffsetX = Math.max(-7, Math.min(7, (nx - 0.5) * 14));
    this.mouseOffsetY = Math.max(-5, Math.min(5, (ny - 0.5) * 10));
  }

  public onMouseDown(button: string): void {
    const now = performance.now();
    this.wake(now, false);
    const mx = MOUSE_X + this.mouseOffsetX;
    const my = MOUSE_Y + this.mouseOffsetY;
    if (button === 'left') {
      this.mouseLeftDown = true;
      this.mouseLeftPress = 1;
      this.pushBubble('L', mx, my - 30, '#8ff3e6');
      this.latte.onMouseClick(this.buildLayout(), 'left');
    } else if (button === 'right') {
      this.mouseRightDown = true;
      this.mouseRightPress = 1;
      this.pushBubble('R', mx, my - 30, '#ff84c8');
      this.latte.onMouseClick(this.buildLayout(), 'right');
    } else if (button === 'middle') {
      this.mouseMiddlePress = 1;
    }
  }

  public onMouseUp(button: string): void {
    if (button === 'left') this.mouseLeftDown = false;
    else if (button === 'right') this.mouseRightDown = false;
    if (!this.mouseLeftDown && !this.mouseRightDown) {
      this.latte.onMouseRelease();
    }
  }

  public onMouseWheel(): void {
    this.wake(performance.now(), false);
    this.mouseScrollFlash = 1;
  }

  public onWindowCursor(relX: number, relY: number, overCat: boolean): void {
    const dx = relX - this.prevCursorX;
    const dy = relY - this.prevCursorY;
    this.prevCursorX = relX;
    this.prevCursorY = relY;

    if (overCat && !this.privacyMode) {
      const dist = Math.hypot(dx, dy);
      if (dist > 0.008 && dist < 0.25) {
        this.wake(performance.now(), false);
        this.isCross = false;
        this.petEnergy = Math.min(1, this.petEnergy + dist * 4.5);
      }
    }
  }

  public triggerTailFlick(): void {
    this.wake(performance.now(), false);
    this.latte.triggerTailFlick();
  }

  /** Demo mode for static Vite preview (`index.html?demo=typing|happy|sleep|privacy|keys:enter,esc|mouse`) */
  public setDemoMode(mode: string): void {
    if (mode === 'sleep') {
      this.asleep = true;
      this.sleepAmount = 1;
    } else if (mode === 'privacy') {
      this.setPrivacyMode(true);
      this.privacyClose = 1;
    } else if (mode === 'happy') {
      this.petEnergy = 0.85;
      this.latte.seedDemoState('happy', this.buildLayout());
    } else if (mode === 'mouse') {
      this.mouseLeftDown = true;
      this.mouseLeftPress = 1;
      this.latte.seedDemoState('typing', this.buildLayout(), {
        left: { x: MOUSE_X + 5, y: MOUSE_Y + 4 },
      });
      this.pushBubble('L', MOUSE_X, MOUSE_Y - 30, '#8ff3e6');
    } else if (mode.startsWith('keys:') || mode === 'typing') {
      const ids = mode.startsWith('keys:') ? mode.slice(5).split(',') : ['enter', 'q'];
      const targets: { left?: { x: number; y: number }; right?: { x: number; y: number } } = {};
      for (const id of ids) {
        const spec = KEYBOARD_KEYS.find((k) => k.id === id.trim().toLowerCase());
        if (!spec) continue;
        const pt = this.keyWorldPos(spec);
        this.keyAnims.set(spec.id, { down: true, press: 1, lastAt: performance.now() });
        this.pushBubble(spec.bubble, pt.x, pt.y - 20, pt.x < KB_CX + 12 ? '#8ff3e6' : '#f5c84b');
        if (pt.x < KB_CX + 12) targets.left = pt;
        else targets.right = pt;
      }
      this.latte.seedDemoState('typing', this.buildLayout(), targets);
    }
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private wake(now: number, abrupt: boolean): void {
    const wasAsleep = this.asleep && this.sleepAmount > 0.65;
    this.lastActivityAt = now;
    this.asleep = false;
    if (abrupt && wasAsleep && !this.privacyMode && this.petEnergy < 0.15) {
      // Brief ~2.5s sleepy wake-up grump (never triggered by fast typing!)
      this.isCross = true;
      this.crossUntil = now + 2500;
    }
  }

  private effectiveFrameIntervalMs(now: number): number {
    const idleMs = now - this.lastActivityAt;
    const baseMs = this.fpsCap > 0 ? 1000 / this.fpsCap : 0;
    if (this.asleep && this.sleepAmount > 0.9 && this.keyBubbles.length === 0) {
      return Math.max(baseMs, 200); // 5 FPS deep sleep
    }
    if (idleMs > 3000 && this.petEnergy < 0.05 && this.keyBubbles.length === 0 && !this.isCross) {
      return Math.max(baseMs, 100); // 10 FPS idle
    }
    return baseMs;
  }

  private pushBubble(label: string, x: number, y: number, accent: string): void {
    this.keyBubbles.push({
      label,
      x: x + (Math.random() - 0.5) * 16,
      y,
      age: 0,
      lifetime: 0.72,
      accent,
    });
    if (this.keyBubbles.length > 6) this.keyBubbles.shift();
  }

  private buildLayout(): LatteLayout {
    return {
      logicalW: LOGICAL_W,
      kbCenterX: KB_CX,
      kbCenterY: KB_CY,
      kbWidth: KB_W,
      kbHeight: KB_H,
      kbTiltRad: KB_TILT,
      mouseX: MOUSE_X + this.mouseOffsetX,
      mouseY: MOUSE_Y + this.mouseOffsetY,
      mouseLeft: this.mouseLeftDown,
      mouseRight: this.mouseRightDown,
      petEnergy: this.petEnergy,
      privacyMode: this.privacyMode,
      asleep: this.asleep,
      sleepAmount: this.sleepAmount,
      isCross: this.isCross,
      crossAmount: this.crossAmount,
    };
  }

  private update(dt: number, now: number): void {
    if (!this.privacyMode && !this.asleep && now - this.lastActivityAt > SLEEP_IDLE_MS) {
      this.asleep = true;
    }
    if (this.isCross && now >= this.crossUntil) this.isCross = false;

    this.sleepAmount += ((this.asleep ? 1 : 0) - this.sleepAmount) * (1 - Math.exp(-3.5 * dt));
    this.crossAmount += ((this.isCross ? 1 : 0) - this.crossAmount) * (1 - Math.exp(-8 * dt));
    this.privacyClose += ((this.privacyMode ? 1 : 0) - this.privacyClose) * (1 - Math.exp(-12 * dt));

    this.petEnergy = Math.max(0, this.petEnergy - dt * 0.42);
    catAudio.setPurrIntensity(this.petEnergy > 0.15 ? this.petEnergy : 0);

    this.kbBounce *= Math.exp(-16 * dt);
    this.mouseLeftPress = this.mouseLeftDown ? 1 : this.mouseLeftPress * Math.exp(-16 * dt);
    this.mouseRightPress = this.mouseRightDown ? 1 : this.mouseRightPress * Math.exp(-16 * dt);
    this.mouseMiddlePress *= Math.exp(-14 * dt);
    this.mouseScrollFlash *= Math.exp(-10 * dt);

    for (const anim of this.keyAnims.values()) {
      if (!anim.down) {
        anim.press *= Math.exp(-18 * dt);
        if (anim.press < 0.01) anim.press = 0;
      }
    }

    for (let i = this.keyBubbles.length - 1; i >= 0; i--) {
      const b = this.keyBubbles[i];
      b.age += dt;
      b.y -= 42 * dt;
      if (b.age >= b.lifetime) this.keyBubbles.splice(i, 1);
    }

    this.latte.update(dt, now, this.buildLayout());
  }

  private getViewportTransform() {
    const sx = this.canvas.width / LOGICAL_W;
    const sy = this.canvas.height / LOGICAL_H;
    const uniformScale = Math.min(sx, sy);
    const offsetX = (this.canvas.width - LOGICAL_W * uniformScale) * 0.5;
    const offsetY = (this.canvas.height - LOGICAL_H * uniformScale) * 0.5;
    return { offsetX, offsetY, uniformScale };
  }

  private keyWorldPos(spec: KeySpec): { x: number; y: number } {
    const innerW = KB_W - 14;
    const innerH = KB_H - 12;
    const screenRow = TOTAL_ROWS - (spec.row + 1);
    const screenU = TOTAL_UNITS - (spec.uStart + spec.uWidth);
    const depthScale = 0.94 + ((screenRow + 0.5) / TOTAL_ROWS) * 0.09;
    const lx = (-innerW * 0.5 + (screenU + spec.uWidth * 0.5) * (innerW / TOTAL_UNITS)) * depthScale;
    const ly = -innerH * 0.5 + (screenRow + 0.5) * (innerH / TOTAL_ROWS);
    const c = Math.cos(KB_TILT);
    const s = Math.sin(KB_TILT);
    return { x: KB_CX + lx * c - ly * s, y: KB_CY + lx * s + ly * c };
  }

  private render(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    const { offsetX, offsetY, uniformScale } = this.getViewportTransform();
    ctx.translate(offsetX, offsetY);
    ctx.scale(uniformScale, uniformScale);

    const layout = this.buildLayout();
    this.latte.renderBody(ctx, now, layout);
    this.drawGamingMouse(ctx);
    this.drawRgbKeyboard(ctx, uniformScale);
    this.latte.renderForeground(ctx, now, layout);
    if (!this.privacyMode) this.drawKeyBubbles(ctx);

    ctx.restore();
  }

  private drawGamingMouse(ctx: CanvasRenderingContext2D): void {
    const mx = MOUSE_X + this.mouseOffsetX;
    const my = MOUSE_Y + this.mouseOffsetY;
    const rx = 16.5;
    const ry = 24.5;
    const lPress = this.mouseLeftPress;
    const rPress = this.mouseRightPress;
    const mPress = Math.max(this.mouseMiddlePress, this.mouseScrollFlash);
    const lit = '#8ff3e6';

    const shell = (inset = 0) => {
      ctx.beginPath();
      ctx.moveTo(0, -ry + inset);
      ctx.bezierCurveTo(rx * 1.05 - inset, -ry + inset, rx - inset, ry * 0.15, rx * 0.82 - inset, ry * 0.62);
      ctx.bezierCurveTo(rx * 0.7 - inset, ry - inset, -rx * 0.7 + inset, ry - inset, -rx * 0.82 + inset, ry * 0.62);
      ctx.bezierCurveTo(-rx + inset, ry * 0.15, -rx * 1.05 + inset, -ry + inset, 0, -ry + inset);
      ctx.closePath();
    };

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-0.06);

    // Cable leaving the button end
    ctx.strokeStyle = '#1b1a1e';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, ry - 1);
    ctx.bezierCurveTo(1, ry + 8, -7, ry + 10, -5, ry + 20);
    ctx.stroke();

    // Soft drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.save();
    ctx.translate(0, 2.5);
    shell();
    ctx.fill();
    ctx.restore();

    // Graphite shell
    const body = ctx.createLinearGradient(-rx, 0, rx, 0);
    body.addColorStop(0, '#232227');
    body.addColorStop(0.5, '#38363d');
    body.addColorStop(1, '#232227');
    ctx.fillStyle = body;
    shell();
    ctx.fill();

    ctx.save();
    shell(0.6);
    ctx.clip();

    const seamY = ry * 0.08;
    ctx.fillStyle = lPress > 0.08 ? lit : '#302e35';
    ctx.globalAlpha = lPress > 0.08 ? 0.35 + 0.65 * lPress : 1;
    ctx.fillRect(0.6, seamY, rx + 2, ry + 2);
    ctx.globalAlpha = rPress > 0.08 ? 0.35 + 0.65 * rPress : 1;
    ctx.fillStyle = rPress > 0.08 ? lit : '#302e35';
    ctx.fillRect(-rx - 2, seamY, rx + 1.4, ry + 2);
    ctx.globalAlpha = 1;

    // Side RGB strips
    const led = ctx.createLinearGradient(0, -ry, 0, ry);
    led.addColorStop(0, '#ff7ac6');
    led.addColorStop(0.5, '#8b7bff');
    led.addColorStop(1, '#4fe3d1');
    ctx.strokeStyle = led;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.85;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * rx * 0.62, -ry * 0.72);
      ctx.quadraticCurveTo(sgn * rx * 1.02, -ry * 0.1, sgn * rx * 0.76, ry * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(10, 10, 12, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rx - 2, seamY);
    ctx.quadraticCurveTo(0, seamY - 2.2, rx + 2, seamY);
    ctx.moveTo(0, seamY - 1);
    ctx.lineTo(0, ry + 2);
    ctx.stroke();
    ctx.restore();

    // Glowing scroll wheel
    ctx.fillStyle = '#121115';
    this.roundRect(ctx, -2.4, seamY + 2.5, 4.8, 9.5, 2.4);
    ctx.fill();
    ctx.fillStyle = mPress > 0.12 ? lit : '#4fe3d1';
    ctx.globalAlpha = mPress > 0.12 ? 1 : 0.6;
    this.roundRect(ctx, -1.4, seamY + 3.4 + this.mouseMiddlePress * 0.8, 2.8, 7.6, 1.4);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#0f0e11';
    ctx.lineWidth = 1.3;
    shell();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.45, -ry * 0.78);
    ctx.quadraticCurveTo(0, -ry * 0.95, rx * 0.45, -ry * 0.78);
    ctx.stroke();

    ctx.restore();
  }

  private drawRgbKeyboard(ctx: CanvasRenderingContext2D, uniformScale: number): void {
    const innerW = KB_W - 14;
    const innerH = KB_H - 12;
    const topHalfW = (KB_W * 0.955) / 2;
    const botHalfW = (KB_W * 1.035) / 2;
    const halfH = KB_H / 2;
    const rowH = innerH / TOTAL_ROWS;
    const unitW = innerW / TOTAL_UNITS;
    const gap = 0.9;

    const drawKey = (target: CanvasRenderingContext2D, key: KeySpec, press: number) => {
      const screenRow = TOTAL_ROWS - (key.row + 1);
      const screenU = TOTAL_UNITS - (key.uStart + key.uWidth);
      const depthScale = 0.94 + ((screenRow + 0.5) / TOTAL_ROWS) * 0.09;

      const x = (-innerW / 2 + screenU * unitW + gap * 0.5) * depthScale;
      const w = (key.uWidth * unitW - gap) * depthScale;
      const y = -innerH / 2 + screenRow * rowH + gap * 0.5 + press * 2.0;
      const h = rowH - gap - 0.8;

      let topColor = '#3c3b41';
      let sideColor = '#232227';
      if (press > 0.14) {
        topColor = '#8ff3e6';
        sideColor = '#3fb3a5';
      } else if (key.accent === 'orange') {
        topColor = '#f2c14e';
        sideColor = '#a9822a';
      } else if (key.accent === 'mod' || key.id === 'space') {
        topColor = '#56545c';
        sideColor = '#36343b';
      }

      if (press > 0.01) {
        target.fillStyle = '#1c1b1f';
        target.fillRect(x - 0.4, -innerH / 2 + screenRow * rowH + gap * 0.5 - 0.4, w + 0.8, h + 3.8);
      }

      target.fillStyle = sideColor;
      this.roundRect(target, x, y + 1.4, w, h, 1.8);
      target.fill();

      target.fillStyle = topColor;
      this.roundRect(target, x, y, w, h - 0.9, 1.8);
      target.fill();

      const legend = key.id === 'space' ? '' : key.id === 'esc' ? 'Esc' : key.label;
      if (legend) {
        const fontSize = legend.length >= 3 ? 5.6 : legend.length === 2 ? 6.4 : 7.8;
        target.save();
        target.translate(x + w * 0.5, y + (h - 0.9) * 0.5);
        target.rotate(Math.PI);
        target.font = `700 ${fontSize}px -apple-system, system-ui, sans-serif`;
        target.fillStyle = press > 0.14 ? '#111214' : key.accent === 'orange' ? '#2a2418' : '#d8dbe3';
        target.textAlign = 'center';
        target.textBaseline = 'middle';
        target.fillText(legend, 0, 0);
        target.restore();
      }
    };

    const cacheScale = Math.min(2.5, Math.max(1.5, Math.ceil(uniformScale * 2) / 2));
    const padMargin = 20;
    const cacheLogW = Math.ceil(botHalfW * 2 + padMargin * 2);
    const cacheLogH = Math.ceil(KB_H + padMargin * 2);
    const nextKey = `${cacheScale}`;

    if (!this.kbCacheCanvas || this.kbCacheKey !== nextKey) {
      if (!this.kbCacheCanvas) this.kbCacheCanvas = document.createElement('canvas');
      this.kbCacheCanvas.width = Math.round(cacheLogW * cacheScale);
      this.kbCacheCanvas.height = Math.round(cacheLogH * cacheScale);
      const cg = this.kbCacheCanvas.getContext('2d');
      if (cg) {
        cg.clearRect(0, 0, this.kbCacheCanvas.width, this.kbCacheCanvas.height);
        cg.save();
        cg.scale(cacheScale, cacheScale);
        cg.translate(cacheLogW * 0.5, cacheLogH * 0.5);

        // Cached RGB underglow halo (0 per-frame blur!)
        const glow = cg.createLinearGradient(-botHalfW, 0, botHalfW, 0);
        glow.addColorStop(0, '#4fe3d1');
        glow.addColorStop(0.5, '#8b7bff');
        glow.addColorStop(1, '#ff7ac6');
        cg.strokeStyle = glow;
        for (const [w, a] of [[14, 0.08], [9, 0.13], [5, 0.22]] as const) {
          cg.globalAlpha = a;
          cg.lineWidth = w;
          this.trapezoidPath(cg, topHalfW, botHalfW, -halfH + 2, halfH + 3, 7);
          cg.stroke();
        }
        cg.globalAlpha = 1;

        cg.save();
        cg.shadowColor = 'rgba(0, 0, 0, 0.34)';
        cg.shadowBlur = 10;
        cg.shadowOffsetY = 5;
        cg.fillStyle = '#141317';
        this.trapezoidPath(cg, topHalfW, botHalfW, -halfH + 3.5, halfH + 5.5, 6.5);
        cg.fill();
        cg.restore();

        cg.fillStyle = '#2a292e';
        cg.strokeStyle = '#4a4850';
        cg.lineWidth = 1.1;
        this.trapezoidPath(cg, topHalfW, botHalfW, -halfH, halfH, 6.5);
        cg.fill();
        cg.stroke();

        cg.fillStyle = '#1c1b1f';
        this.trapezoidPath(cg, topHalfW - 5, botHalfW - 5, -halfH + 4, halfH - 4, 3.5);
        cg.fill();

        for (const key of KEYBOARD_KEYS) drawKey(cg, key, 0);
        cg.restore();
        this.kbCacheKey = nextKey;
      }
    }

    ctx.save();
    ctx.translate(KB_CX, KB_CY + this.kbBounce * 1.1);
    ctx.rotate(KB_TILT);

    if (this.kbCacheCanvas) {
      ctx.drawImage(this.kbCacheCanvas, -cacheLogW * 0.5, -cacheLogH * 0.5, cacheLogW, cacheLogH);
    }

    let maxPress = 0;
    for (const key of KEYBOARD_KEYS) {
      const anim = this.keyAnims.get(key.id);
      const press = anim ? anim.press : 0;
      if (press > maxPress) maxPress = press;
      if (press > 0.01) drawKey(ctx, key, press);
    }

    // Reactive RGB rim strip
    const strip = ctx.createLinearGradient(-botHalfW, 0, botHalfW, 0);
    strip.addColorStop(0, '#4fe3d1');
    strip.addColorStop(0.5, '#8b7bff');
    strip.addColorStop(1, '#ff7ac6');
    ctx.save();
    ctx.globalAlpha = 0.38 + 0.62 * Math.min(1, maxPress);
    ctx.strokeStyle = strip;
    ctx.lineWidth = 1.7;
    this.trapezoidPath(ctx, topHalfW + 0.8, botHalfW + 0.8, -halfH - 0.8, halfH + 0.8, 7);
    ctx.stroke();
    ctx.restore();

    if (this.privacyClose > 0.06) {
      ctx.save();
      ctx.globalAlpha = this.privacyClose;
      ctx.fillStyle = 'rgba(18, 20, 28, 0.82)';
      this.trapezoidPath(ctx, topHalfW - 2, botHalfW - 2, -halfH + 1.5, halfH - 1.5, 5.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 200, 75, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.font = '700 13px -apple-system, "PingFang SC", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dots = performance.now() - this.privacyTypingAt < 350 ? ' • • •' : '';
      ctx.fillText('🔒 密码输入中' + dots, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawKeyBubbles(ctx: CanvasRenderingContext2D): void {
    for (const b of this.keyBubbles) {
      const u = Math.min(1, b.age / b.lifetime);
      const pop = u < 0.14 ? 0.65 + (u / 0.14) * 0.45 : u < 0.28 ? 1.1 - ((u - 0.14) / 0.14) * 0.1 : 1.0;
      const alpha = u > 0.65 ? Math.max(0, (1 - u) / 0.35) : 1;

      ctx.save();
      ctx.globalAlpha = alpha * 0.94;
      ctx.translate(b.x, b.y);
      ctx.scale(pop, pop);
      ctx.font = '700 14px -apple-system, "PingFang SC", sans-serif';
      const tw = Math.max(20, ctx.measureText(b.label).width + 14);
      const th = 22;
      ctx.fillStyle = 'rgba(24, 24, 30, 0.90)';
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, -tw * 0.5, -th * 0.5, tw, th, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8f9fc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, 0, 0.5);
      ctx.restore();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private trapezoidPath(
    ctx: CanvasRenderingContext2D,
    topHalfW: number,
    botHalfW: number,
    topY: number,
    botY: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(-topHalfW + r, topY);
    ctx.lineTo(topHalfW - r, topY);
    ctx.quadraticCurveTo(topHalfW, topY, topHalfW + (botHalfW - topHalfW) * 0.08, topY + r);
    ctx.lineTo(botHalfW - (botHalfW - topHalfW) * 0.04, botY - r);
    ctx.quadraticCurveTo(botHalfW, botY, botHalfW - r, botY);
    ctx.lineTo(-botHalfW + r, botY);
    ctx.quadraticCurveTo(-botHalfW, botY, -botHalfW + (botHalfW - topHalfW) * 0.04, botY - r);
    ctx.lineTo(-topHalfW - (botHalfW - topHalfW) * 0.08, topY + r);
    ctx.quadraticCurveTo(-topHalfW, topY, -topHalfW + r, topY);
    ctx.closePath();
  }
}
