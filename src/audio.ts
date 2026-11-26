/**
 * Zero-waste Web Audio cat purr synthesizer:
 * - Lazy-creates AudioContext only on first pet interaction.
 * - Automatically suspends AudioContext ~650ms after purring fades to silence so CoreAudio /
 *   WASAPI audio threads consume 0% CPU and allow hardware audio sleep whenever idle!
 */
class CatAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.7;
  private graphReady = false;
  private masterGain: GainNode | null = null;
  private currentIntensity = 0;
  private suspendTimer: number | null = null;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.setPurrIntensity(0);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(vol) ? vol : 0.7));
    if (this.currentIntensity > 0.01 && this.ctx && this.masterGain) {
      const targetGain = this.currentIntensity * 0.28 * this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
  }

  private cancelSuspendTimer(): void {
    if (this.suspendTimer !== null) {
      window.clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }

  private scheduleSuspendIfSilent(): void {
    this.cancelSuspendTimer();
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.suspendTimer = window.setTimeout(() => {
      this.suspendTimer = null;
      if (this.ctx && this.ctx.state === 'running' && this.currentIntensity <= 0.01) {
        void this.ctx.suspend().catch(() => {});
      }
    }, 700);
  }

  private ensurePurrGraph(): boolean {
    if (!this.enabled || this.volume <= 0.005) return false;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    if (this.graphReady) return true;

    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const bufLen = Math.floor(sampleRate * 3.0);
    const noiseBuf = ctx.createBuffer(1, bufLen, sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'bandpass';
    warmFilter.frequency.value = 190;
    warmFilter.Q.value = 1.15;
    const warmGain = ctx.createGain();
    warmGain.gain.value = 1.45;

    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 520;
    breathFilter.Q.value = 1.4;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.34;

    const flutterGain = ctx.createGain();
    flutterGain.gain.value = 0.65;
    const flutterLfo = ctx.createOscillator();
    flutterLfo.type = 'sine';
    flutterLfo.frequency.value = 24.5;
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.35;
    flutterLfo.connect(flutterDepth);
    flutterDepth.connect(flutterGain.gain);

    const breathCycleGain = ctx.createGain();
    breathCycleGain.gain.value = 0.76;
    const breathLfo = ctx.createOscillator();
    breathLfo.type = 'sine';
    breathLfo.frequency.value = 0.68;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.24;
    breathLfo.connect(breathDepth);
    breathDepth.connect(breathCycleGain.gain);

    const polishFilter = ctx.createBiquadFilter();
    polishFilter.type = 'lowpass';
    polishFilter.frequency.value = 1400;

    const master = ctx.createGain();
    master.gain.value = 0;

    noiseSrc.connect(warmFilter);
    warmFilter.connect(warmGain);
    warmGain.connect(flutterGain);

    noiseSrc.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(flutterGain);

    flutterGain.connect(breathCycleGain);
    breathCycleGain.connect(polishFilter);
    polishFilter.connect(master);
    master.connect(ctx.destination);

    noiseSrc.start();
    flutterLfo.start();
    breathLfo.start();

    this.masterGain = master;
    this.graphReady = true;
    return true;
  }

  /** Smoothly drives real-time organic cat purring (0 = silent, 1 = full cozy purr). */
  public setPurrIntensity(intensity: number): void {
    const target = this.enabled && this.volume > 0.005 ? Math.max(0, Math.min(1, intensity)) : 0;
    if (target <= 0.01 && !this.graphReady) return;
    if (Math.abs(target - this.currentIntensity) < 0.005) return;
    this.currentIntensity = target;

    if (target > 0.01) {
      this.cancelSuspendTimer();
      if (!this.ensurePurrGraph()) return;
    }
    if (!this.ctx || !this.masterGain) return;

    if (target > 0.01 && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const targetGain = target * 0.28 * this.volume;
    const timeConst = target > 0.01 ? 0.14 : 0.18;
    this.masterGain.gain.setTargetAtTime(targetGain, now, timeConst);

    if (target <= 0.01) {
      this.scheduleSuspendIfSilent();
    }
  }
}

export const catAudio = new CatAudio();
