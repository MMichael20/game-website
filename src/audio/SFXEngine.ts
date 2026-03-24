// src/audio/SFXEngine.ts
// Procedural sound effects engine — generates one-shot sounds via Web Audio API
// Footsteps are pre-rendered at init for realistic quality

import { SFXId, SFXDefinition, SFXGeneratorType } from './audioTypes';
import { SFX_DEFINITIONS } from './audioData';

// Footstep surface configs for pre-rendering
interface FootstepConfig {
  // Impact layer
  impactFreq: number;
  impactDecay: number;
  // Body layer (filtered noise)
  bodyFilterFreq: number;
  bodyFilterQ: number;
  bodyGain: number;
  bodyDecay: number;
  // Character
  brightness: number;   // highpass cutoff (higher = brighter/harder surface)
  duration: number;
  gain: number;
  variants: number;     // how many pre-rendered variants
}

const FOOTSTEP_CONFIGS: Record<string, FootstepConfig> = {
  footstep_stone: {
    impactFreq: 120, impactDecay: 0.04,
    bodyFilterFreq: 800, bodyFilterQ: 0.8, bodyGain: 0.6, bodyDecay: 0.1,
    brightness: 200, duration: 0.12, gain: 0.35, variants: 4,
  },
  footstep_grass: {
    impactFreq: 80, impactDecay: 0.02,
    bodyFilterFreq: 2500, bodyFilterQ: 0.3, bodyGain: 0.8, bodyDecay: 0.08,
    brightness: 400, duration: 0.09, gain: 0.2, variants: 4,
  },
  footstep_wood: {
    impactFreq: 180, impactDecay: 0.06,
    bodyFilterFreq: 600, bodyFilterQ: 1.2, bodyGain: 0.4, bodyDecay: 0.12,
    brightness: 150, duration: 0.14, gain: 0.3, variants: 4,
  },
  footstep_carpet: {
    impactFreq: 60, impactDecay: 0.02,
    bodyFilterFreq: 1200, bodyFilterQ: 0.2, bodyGain: 0.9, bodyDecay: 0.06,
    brightness: 600, duration: 0.07, gain: 0.12, variants: 4,
  },
  footstep_tile: {
    impactFreq: 200, impactDecay: 0.05,
    bodyFilterFreq: 1500, bodyFilterQ: 1.5, bodyGain: 0.5, bodyDecay: 0.15,
    brightness: 300, duration: 0.13, gain: 0.28, variants: 4,
  },
};

export class SFXEngine {
  private ctx: AudioContext;
  private output: GainNode;
  private definitions: Map<SFXId, SFXDefinition>;

  // Throttling
  private lastPlayTime: Map<string, number> = new Map();
  private static readonly MIN_INTERVALS: Partial<Record<SFXId, number>> = {
    footstep_stone: 0.22,
    footstep_grass: 0.25,
    footstep_wood: 0.22,
    footstep_carpet: 0.25,
    footstep_tile: 0.22,
    water_wade: 0.3,
    ui_click: 0.08,
    mg_timer_warning: 0.5,
  };

  // Pre-generated noise buffers (reused for non-footstep SFX)
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  // Pre-rendered footstep buffers: id -> array of variant buffers
  private footstepBuffers: Map<string, AudioBuffer[]> = new Map();
  private footstepVariantIndex: Map<string, number> = new Map();

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.output = output;
    this.definitions = new Map();

    for (const def of SFX_DEFINITIONS) {
      this.definitions.set(def.id, def);
    }

    this.initNoiseBuffers();
    this.prerenderFootsteps();
  }

  play(id: SFXId): void {
    const minInterval = SFXEngine.MIN_INTERVALS[id] ?? 0;
    if (minInterval > 0) {
      const now = this.ctx.currentTime;
      const lastTime = this.lastPlayTime.get(id) ?? 0;
      if (now - lastTime < minInterval) return;
      this.lastPlayTime.set(id, now);
    }

    // Use pre-rendered buffer for footsteps
    if (this.footstepBuffers.has(id)) {
      this.playFootstepBuffer(id);
      return;
    }

    const def = this.definitions.get(id);
    if (!def) return;
    this.generate(def, 0);
  }

  playVariant(id: SFXId, pitchShiftRange = 2): void {
    const minInterval = SFXEngine.MIN_INTERVALS[id] ?? 0;
    if (minInterval > 0) {
      const now = this.ctx.currentTime;
      const lastTime = this.lastPlayTime.get(id) ?? 0;
      if (now - lastTime < minInterval) return;
      this.lastPlayTime.set(id, now);
    }

    // Use pre-rendered buffer for footsteps (already has built-in variation)
    if (this.footstepBuffers.has(id)) {
      this.playFootstepBuffer(id);
      return;
    }

    const def = this.definitions.get(id);
    if (!def) return;
    this.generate(def, pitchShiftRange);
  }

  destroy(): void {
    this.whiteNoiseBuffer = null;
    this.brownNoiseBuffer = null;
    this.footstepBuffers.clear();
    this.definitions.clear();
    this.lastPlayTime.clear();
  }

  // ─── Pre-rendered Footsteps ──────────────────────────────────────

  private prerenderFootsteps(): void {
    for (const [id, config] of Object.entries(FOOTSTEP_CONFIGS)) {
      const variants: AudioBuffer[] = [];
      for (let v = 0; v < config.variants; v++) {
        const buffer = this.renderFootstep(config, v);
        variants.push(buffer);
      }
      this.footstepBuffers.set(id, variants);
      this.footstepVariantIndex.set(id, 0);
    }
  }

  private renderFootstep(config: FootstepConfig, seed: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const length = Math.ceil(sr * config.duration);
    const buffer = this.ctx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    // Seeded random for reproducible but varied results
    let rngState = seed * 12345 + 67890;
    const rng = () => {
      rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
      return (rngState / 0x7fffffff) * 2 - 1;
    };

    // Layer 1: Impact transient (low thud)
    const impactSamples = Math.ceil(sr * config.impactDecay);
    for (let i = 0; i < impactSamples && i < length; i++) {
      const t = i / sr;
      const env = Math.exp(-t / (config.impactDecay * 0.4));
      // Pitch-varying sine for natural impact
      const pitchVar = 1 + (seed % 5) * 0.04;
      data[i] += Math.sin(2 * Math.PI * config.impactFreq * pitchVar * t) * env * 0.5;
    }

    // Layer 2: Body (filtered noise — the main character of the footstep)
    const bodySamples = Math.ceil(sr * config.bodyDecay);
    // Simple 1-pole lowpass for shaping
    let lpState = 0;
    const lpCoeff = Math.exp(-2 * Math.PI * config.bodyFilterFreq / sr);
    // Simple 1-pole highpass to remove muddiness
    let hpState = 0;
    let hpPrev = 0;
    const hpCoeff = Math.exp(-2 * Math.PI * config.brightness / sr);

    for (let i = 0; i < bodySamples && i < length; i++) {
      const t = i / sr;
      const env = Math.exp(-t / (config.bodyDecay * 0.35));
      const noise = rng();

      // Lowpass
      lpState = lpState * lpCoeff + noise * (1 - lpCoeff);
      // Highpass
      const hpOut = hpCoeff * (hpState + lpState - hpPrev);
      hpPrev = lpState;
      hpState = hpOut;

      data[i] += hpOut * env * config.bodyGain;
    }

    // Layer 3: Texture scatter (tiny random clicks for grit)
    const clickCount = 3 + (seed % 4);
    for (let c = 0; c < clickCount; c++) {
      const clickPos = Math.floor(Math.abs(rng()) * length * 0.5);
      const clickLen = Math.floor(sr * 0.002);
      for (let i = 0; i < clickLen && clickPos + i < length; i++) {
        data[clickPos + i] += rng() * 0.08 * Math.exp(-i / (clickLen * 0.3));
      }
    }

    // Normalize and apply master gain
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (peak > 0) {
      const scale = config.gain / peak;
      for (let i = 0; i < length; i++) data[i] *= scale;
    }

    return buffer;
  }

  private playFootstepBuffer(id: string): void {
    const variants = this.footstepBuffers.get(id);
    if (!variants || variants.length === 0) return;

    // Cycle through variants to avoid repetition
    let idx = this.footstepVariantIndex.get(id) ?? 0;
    const buffer = variants[idx];
    this.footstepVariantIndex.set(id, (idx + 1) % variants.length);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Slight random pitch variation (+/- 3 semitones)
    source.playbackRate.value = Math.pow(2, ((Math.random() * 2 - 1) * 3) / 12);

    const gain = this.ctx.createGain();
    // Slight random volume variation
    gain.gain.value = 0.8 + Math.random() * 0.4;

    source.connect(gain).connect(this.output);
    source.start(this.ctx.currentTime);

    const dur = buffer.duration / source.playbackRate.value;
    this.scheduleCleanup([source, gain], this.ctx.currentTime + dur + 0.05);
  }

  // ─── Noise Buffer Pre-generation ─────────────────────────────────

  private initNoiseBuffers(): void {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;

    this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    this.brownNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const brownData = this.brownNoiseBuffer.getChannelData(0);
    let lastVal = 0;
    for (let i = 0; i < length; i++) {
      lastVal += (Math.random() * 2 - 1) * 0.02;
      if (lastVal > 1) lastVal = 1;
      if (lastVal < -1) lastVal = -1;
      brownData[i] = lastVal;
    }
  }

  // ─── Generator Dispatch (for non-footstep SFX) ──────────────────

  private generate(def: SFXDefinition, pitchShiftRange: number): void {
    const time = this.ctx.currentTime;
    const pitchMult = pitchShiftRange > 0
      ? Math.pow(2, ((Math.random() * 2 - 1) * pitchShiftRange) / 12)
      : 1;

    const generators: Record<SFXGeneratorType, () => void> = {
      tone_burst: () => this.genToneBurst(def, time, pitchMult),
      noise_burst: () => this.genNoiseBurst(def, time, pitchMult),
      fm_hit: () => this.genFMHit(def, time, pitchMult),
      chirp: () => this.genChirp(def, time, pitchMult),
      rumble: () => this.genRumble(def, time, pitchMult),
      metallic: () => this.genMetallic(def, time, pitchMult),
      filtered_noise: () => this.genFilteredNoise(def, time),
    };

    generators[def.generator]();
  }

  // ─── Tone Burst ──────────────────────────────────────────────────

  private genToneBurst(def: SFXDefinition, time: number, pitchMult: number): void {
    const { freq, type = 0 } = def.params;
    const oscTypes: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

    const osc = this.ctx.createOscillator();
    osc.type = oscTypes[type] ?? 'sine';
    osc.frequency.setValueAtTime(freq * pitchMult, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(def.gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    osc.connect(env).connect(this.output);
    osc.start(time);
    osc.stop(time + def.duration + 0.01);
    this.scheduleCleanup([osc, env], time + def.duration + 0.05);
  }

  // ─── Noise Burst ─────────────────────────────────────────────────

  private genNoiseBurst(def: SFXDefinition, time: number, pitchMult: number): void {
    const { filterFreq, filterQ = 1, noiseType = 0 } = def.params;
    const buffer = noiseType === 0 ? this.whiteNoiseBuffer : this.brownNoiseBuffer;
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loopStart = Math.random() * 1.5;
    source.loopEnd = source.loopStart + def.duration;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq * pitchMult, time);
    filter.Q.setValueAtTime(filterQ, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(def.gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    source.connect(filter).connect(env).connect(this.output);
    source.start(time, source.loopStart, def.duration + 0.02);
    this.scheduleCleanup([source, filter, env], time + def.duration + 0.05);
  }

  // ─── FM Hit ──────────────────────────────────────────────────────

  private genFMHit(def: SFXDefinition, time: number, pitchMult: number): void {
    const { freq, ratio = 2, index = 1 } = def.params;
    const carrierFreq = freq * pitchMult;

    const modulator = this.ctx.createOscillator();
    modulator.frequency.setValueAtTime(carrierFreq * ratio, time);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(carrierFreq * index, time);
    modGain.gain.exponentialRampToValueAtTime(0.1, time + def.duration);

    const carrier = this.ctx.createOscillator();
    carrier.frequency.setValueAtTime(carrierFreq, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(def.gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    modulator.connect(modGain).connect(carrier.frequency);
    carrier.connect(env).connect(this.output);

    modulator.start(time);
    carrier.start(time);
    modulator.stop(time + def.duration + 0.01);
    carrier.stop(time + def.duration + 0.01);
    this.scheduleCleanup([modulator, modGain, carrier, env], time + def.duration + 0.05);
  }

  // ─── Chirp ───────────────────────────────────────────────────────

  private genChirp(def: SFXDefinition, time: number, pitchMult: number): void {
    const { startFreq, endFreq, type = 0 } = def.params;
    const oscTypes: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

    const osc = this.ctx.createOscillator();
    osc.type = oscTypes[type] ?? 'sine';
    osc.frequency.setValueAtTime(startFreq * pitchMult, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq * pitchMult, 20), time + def.duration * 0.8
    );

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(def.gain, time + 0.005);
    env.gain.setValueAtTime(def.gain, time + def.duration * 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    osc.connect(env).connect(this.output);
    osc.start(time);
    osc.stop(time + def.duration + 0.01);
    this.scheduleCleanup([osc, env], time + def.duration + 0.05);
  }

  // ─── Rumble ──────────────────────────────────────────────────────

  private genRumble(def: SFXDefinition, time: number, pitchMult: number): void {
    const { freq, filterFreq = 200 } = def.params;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * pitchMult, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.Q.setValueAtTime(2, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(def.gain, time + 0.05);
    env.gain.setValueAtTime(def.gain, time + def.duration * 0.5);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    osc.connect(filter).connect(env).connect(this.output);
    osc.start(time);
    osc.stop(time + def.duration + 0.01);
    this.scheduleCleanup([osc, filter, env], time + def.duration + 0.05);
  }

  // ─── Metallic ────────────────────────────────────────────────────

  private genMetallic(def: SFXDefinition, time: number, pitchMult: number): void {
    const { freq } = def.params;
    const partials = [1, 2.4, 5.1];
    const baseFreq = freq * pitchMult;
    const nodes: AudioNode[] = [];

    for (let i = 0; i < partials.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * partials[i], time);

      const env = this.ctx.createGain();
      const amp = def.gain / (i + 1);
      env.gain.setValueAtTime(amp, time);
      env.gain.exponentialRampToValueAtTime(0.001, time + def.duration + i * 0.1);

      osc.connect(env).connect(this.output);
      osc.start(time);
      osc.stop(time + def.duration + i * 0.1 + 0.01);
      nodes.push(osc, env);
    }

    this.scheduleCleanup(nodes, time + def.duration + 0.5);
  }

  // ─── Filtered Noise ──────────────────────────────────────────────

  private genFilteredNoise(def: SFXDefinition, time: number): void {
    const { filterFreq = 1000, filterQ = 0.5 } = def.params;
    if (!this.whiteNoiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.Q.setValueAtTime(filterQ, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(def.gain, time + def.duration * 0.1);
    env.gain.setValueAtTime(def.gain, time + def.duration * 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, time + def.duration);

    source.connect(filter).connect(env).connect(this.output);
    source.start(time, Math.random() * 1.5, def.duration + 0.02);
    this.scheduleCleanup([source, filter, env], time + def.duration + 0.05);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────

  private scheduleCleanup(nodes: AudioNode[], atTime: number): void {
    const delay = Math.max(0, (atTime - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
    }, delay + 50);
  }
}
