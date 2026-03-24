// src/audio/SFXEngine.ts
// Procedural sound effects engine — generates one-shot sounds via Web Audio API

import { SFXId, SFXDefinition, SFXGeneratorType } from './audioTypes';
import { SFX_DEFINITIONS } from './audioData';

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

  // Pre-generated noise buffers (reused)
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.output = output;
    this.definitions = new Map();

    // Index definitions
    for (const def of SFX_DEFINITIONS) {
      this.definitions.set(def.id, def);
    }

    this.initNoiseBuffers();
  }

  play(id: SFXId): void {
    const def = this.definitions.get(id);
    if (!def) return;

    // Throttle check
    const minInterval = SFXEngine.MIN_INTERVALS[id] ?? 0;
    if (minInterval > 0) {
      const now = this.ctx.currentTime;
      const lastTime = this.lastPlayTime.get(id) ?? 0;
      if (now - lastTime < minInterval) return;
      this.lastPlayTime.set(id, now);
    }

    this.generate(def, 0);
  }

  playVariant(id: SFXId, pitchShiftRange = 2): void {
    const def = this.definitions.get(id);
    if (!def) return;

    const minInterval = SFXEngine.MIN_INTERVALS[id] ?? 0;
    if (minInterval > 0) {
      const now = this.ctx.currentTime;
      const lastTime = this.lastPlayTime.get(id) ?? 0;
      if (now - lastTime < minInterval) return;
      this.lastPlayTime.set(id, now);
    }

    this.generate(def, pitchShiftRange);
  }

  destroy(): void {
    this.whiteNoiseBuffer = null;
    this.brownNoiseBuffer = null;
    this.definitions.clear();
    this.lastPlayTime.clear();
  }

  // ─── Noise Buffer Pre-generation ─────────────────────────────────

  private initNoiseBuffers(): void {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2-second buffers

    // White noise
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Brown noise (accumulated random walk)
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

  // ─── Generator Dispatch ──────────────────────────────────────────

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

  // ─── Tone Burst: short pitched beep ──────────────────────────────

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

  // ─── Noise Burst: filtered noise for footsteps, swooshes ────────

  private genNoiseBurst(def: SFXDefinition, time: number, pitchMult: number): void {
    const { filterFreq, filterQ = 1, noiseType = 0 } = def.params;
    const buffer = noiseType === 0 ? this.whiteNoiseBuffer : this.brownNoiseBuffer;
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    // Random start position for variety
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

  // ─── FM Hit: FM percussion for catches, impacts ──────────────────

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

  // ─── Chirp: frequency sweep up or down ───────────────────────────

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

  // ─── Rumble: low frequency for boat horns, doors ─────────────────

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

  // ─── Metallic: ring-mod tone for bells, shutter ──────────────────

  private genMetallic(def: SFXDefinition, time: number, pitchMult: number): void {
    const { freq, modFreq, modDepth = 0.5 } = def.params;

    // Multiple inharmonic partials for bell-like tone
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

  // ─── Filtered Noise: shaped noise for steam, wind bursts ─────────

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
