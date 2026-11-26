/**
 * Zero-waste Web Audio cat synthesizer (cozy purr + soft kitten meow + starlight chime):
 * - Lazy-creates AudioContext only on interaction / Easter egg trigger.
 * - Automatically suspends AudioContext shortly after sounds finish so CoreAudio
 *   consumes 0% CPU and allows hardware audio sleep whenever idle.
 */
class CatAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.7;
  private graphReady = false;
  private masterGain: GainNode | null = null;
  private currentIntensity = 0;
  private suspendTimer: number | null = null;
  private busyUntil = 0;

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

  /** Unlock AudioContext on any user pointer gesture so rare Easter eggs can play softly later. */
  public unlock(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.scheduleSuspendIfSilent(450)).catch(() => {});
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0.005) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private cancelSuspendTimer(): void {
    if (this.suspendTimer !== null) {
      window.clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }

  private scheduleSuspendIfSilent(delayMs = 750): void {
    this.cancelSuspendTimer();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const remainingBusy = Math.max(0, this.busyUntil - performance.now());
    this.suspendTimer = window.setTimeout(() => {
      this.suspendTimer = null;
      if (
        this.ctx &&
        this.ctx.state === 'running' &&
        this.currentIntensity <= 0.01 &&
        performance.now() >= this.busyUntil
      ) {
        void this.ctx.suspend().catch(() => {});
      }
    }, delayMs + remainingBusy);
  }

  private ensurePurrGraph(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    if (this.graphReady) return true;

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

  /**
   * Soft, warm, cozy kitten "miao~" synthesized with dual vocal formant glide.
   * Gentle and comforting (never startling), auto-suspends CoreAudio afterwards.
   */
  public playMeow(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.cancelSuspendTimer();
    const run = () => {
      const now = ctx.currentTime + 0.01;
      const pitchMul = 0.94 + Math.random() * 0.13;
      const dur = 0.38;

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';

      // "mi-a-o~" natural rising-then-falling kitten pitch contour
      const glide = (param: AudioParam, mult: number) => {
        param.setValueAtTime(560 * pitchMul * mult, now);
        param.exponentialRampToValueAtTime(890 * pitchMul * mult, now + 0.11);
        param.exponentialRampToValueAtTime(720 * pitchMul * mult, now + 0.24);
        param.exponentialRampToValueAtTime(510 * pitchMul * mult, now + dur);
      };
      glide(osc1.frequency, 1.0);
      glide(osc2.frequency, 1.004);

      const mix1 = ctx.createGain();
      mix1.gain.value = 0.72;
      const mix2 = ctx.createGain();
      mix2.gain.value = 0.28;

      // Two soft feline vocal formants: "ee" -> "aa" -> "oo"
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = 3.2;
      f1.frequency.setValueAtTime(680, now);
      f1.frequency.exponentialRampToValueAtTime(1020, now + 0.13);
      f1.frequency.exponentialRampToValueAtTime(620, now + dur);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = 4.0;
      f2.frequency.setValueAtTime(2150, now);
      f2.frequency.exponentialRampToValueAtTime(1650, now + 0.18);
      f2.frequency.exponentialRampToValueAtTime(1280, now + dur);
      const f2Gain = ctx.createGain();
      f2Gain.gain.value = 0.45;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;

      const env = ctx.createGain();
      const peak = 0.17 * this.volume;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.055);
      env.gain.setValueAtTime(peak * 0.92, now + 0.17);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.03);

      osc1.connect(mix1);
      osc2.connect(mix2);
      mix1.connect(f1);
      mix2.connect(f1);
      mix1.connect(f2);
      mix2.connect(f2);
      f1.connect(lp);
      f2.connect(f2Gain);
      f2Gain.connect(lp);
      lp.connect(env);
      env.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur + 0.05);
      osc2.stop(now + dur + 0.05);

      this.busyUntil = Math.max(this.busyUntil, performance.now() + 520);
      this.scheduleSuspendIfSilent(650);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(run).catch(() => {});
    } else {
      run();
    }
  }

  /** Delicate, whisper-soft 2-note music-box sparkle for rare Starlight Fever bursts. */
  public playChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.cancelSuspendTimer();
    const run = () => {
      const now = ctx.currentTime + 0.01;
      const notes = [1046.5, 1318.5, 1568.0]; // C6 - E6 - G6 gentle triad
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.065;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        const g = ctx.createGain();
        const peak = 0.045 * this.volume;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
      });
      this.busyUntil = Math.max(this.busyUntil, performance.now() + 560);
      this.scheduleSuspendIfSilent(650);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(run).catch(() => {});
    } else {
      run();
    }
  }
}

export const catAudio = new CatAudio();
