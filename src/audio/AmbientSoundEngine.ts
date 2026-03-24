// src/audio/AmbientSoundEngine.ts
// Environmental audio layers — noise-based ambient sounds

import { AmbientLayerType, AmbientLayerConfig, SceneAmbientProfile } from './audioTypes';

interface AmbientLayer {
  type: AmbientLayerType;
  gainNode: GainNode;
  nodes: AudioNode[];
  timers: number[];  // setTimeout IDs for periodic sounds
  destroy(): void;
}

export class AmbientSoundEngine {
  private ctx: AudioContext;
  private output: GainNode;
  private activeLayers: Map<AmbientLayerType, AmbientLayer> = new Map();

  // Shared noise buffers
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  // Reverb
  private convolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private reverbOutputNode: GainNode;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.output = output;

    // Create reverb routing
    this.reverbOutputNode = ctx.createGain();
    this.reverbOutputNode.connect(output);
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1.0;
    this.dryGain.connect(this.reverbOutputNode);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0;
    this.reverbGain.connect(this.reverbOutputNode);

    this.initNoiseBuffers();
  }

  setProfile(profile: SceneAmbientProfile, fadeDuration = 1.5): void {
    const newTypes = new Set(profile.layers.map(l => l.type));

    // Fade out layers not in the new profile
    for (const [type, layer] of this.activeLayers) {
      if (!newTypes.has(type)) {
        this.fadeOutLayer(layer, fadeDuration);
        this.activeLayers.delete(type);
      }
    }

    // Add or update layers
    for (const layerConfig of profile.layers) {
      const existing = this.activeLayers.get(layerConfig.type);
      if (existing) {
        // Adjust gain (anchor before ramp for spec compliance)
        existing.gainNode.gain.setValueAtTime(existing.gainNode.gain.value, this.ctx.currentTime);
        existing.gainNode.gain.linearRampToValueAtTime(
          layerConfig.gain, this.ctx.currentTime + fadeDuration
        );
      } else {
        // Create new layer
        const layer = this.createLayer(layerConfig);
        if (layer) {
          // Fade in
          layer.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
          layer.gainNode.gain.linearRampToValueAtTime(
            layerConfig.gain, this.ctx.currentTime + fadeDuration
          );
          this.activeLayers.set(layerConfig.type, layer);
        }
      }
    }

    // Update reverb
    this.updateReverb(profile.reverbDecay, profile.reverbMix, fadeDuration);
  }

  setLayerGain(type: AmbientLayerType, gain: number, fadeDuration = 0.5): void {
    const layer = this.activeLayers.get(type);
    if (layer) {
      layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, this.ctx.currentTime);
      layer.gainNode.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + fadeDuration);
    }
  }

  stopAll(fadeDuration = 1.0): void {
    for (const [type, layer] of this.activeLayers) {
      this.fadeOutLayer(layer, fadeDuration);
    }
    this.activeLayers.clear();
  }

  destroy(): void {
    for (const [, layer] of this.activeLayers) {
      layer.destroy();
    }
    this.activeLayers.clear();
    try {
      this.dryGain?.disconnect();
      this.reverbGain?.disconnect();
      this.convolver?.disconnect();
      this.reverbOutputNode.disconnect();
    } catch { /* ok */ }
    this.whiteNoiseBuffer = null;
    this.brownNoiseBuffer = null;
  }

  // ─── Noise Buffers ───────────────────────────────────────────────

  private initNoiseBuffers(): void {
    const sr = this.ctx.sampleRate;
    const len = sr * 2;

    this.whiteNoiseBuffer = this.ctx.createBuffer(1, len, sr);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) whiteData[i] = Math.random() * 2 - 1;

    this.brownNoiseBuffer = this.ctx.createBuffer(1, len, sr);
    const brownData = this.brownNoiseBuffer.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v += (Math.random() * 2 - 1) * 0.02;
      v = Math.max(-1, Math.min(1, v));
      brownData[i] = v;
    }
  }

  // ─── Layer Creation ──────────────────────────────────────────────

  private createLayer(config: AmbientLayerConfig): AmbientLayer | null {
    const creators: Record<AmbientLayerType, (p: Record<string, number>) => AmbientLayer | null> = {
      water_flow: (p) => this.createWaterFlow(p),
      water_lapping: (p) => this.createWaterLapping(p),
      crowd_murmur: (p) => this.createCrowdMurmur(p),
      wind_gentle: (p) => this.createWind(p),
      birds: (p) => this.createBirds(p),
      steam_hiss: (p) => this.createSteamHiss(p),
      indoor_reverb: () => this.createIndoorReverb(),
      bar_chatter: (p) => this.createBarChatter(p),
    };

    const creator = creators[config.type];
    if (!creator) return null;

    const layer = creator(config.params);
    if (layer) {
      layer.gainNode.gain.value = config.gain;
    }
    return layer;
  }

  // ─── Water Flow: filtered brown noise with LFO ──────────────────

  private createWaterFlow(params: Record<string, number>): AmbientLayer {
    const { filterFreq = 300, speed = 0.5 } = params;
    const nodes: AudioNode[] = [];

    const source = this.createNoiseSource('brown');
    nodes.push(source);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.5;
    nodes.push(filter);

    // LFO for gentle filter modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = speed * 0.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = filterFreq * 0.3;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    nodes.push(lfo, lfoGain);

    const gainNode = this.ctx.createGain();
    nodes.push(gainNode);

    source.connect(filter).connect(gainNode).connect(this.dryGain!);
    source.start();

    return {
      type: 'water_flow',
      gainNode,
      nodes,
      timers: [],
      destroy: () => this.destroyNodes(nodes, []),
    };
  }

  // ─── Water Lapping: rhythmic noise pulses ────────────────────────

  private createWaterLapping(params: Record<string, number>): AmbientLayer {
    const { speed = 0.3 } = params;
    const nodes: AudioNode[] = [];

    const source = this.createNoiseSource('brown');
    nodes.push(source);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.3;
    nodes.push(filter);

    // Amplitude modulation for lapping rhythm
    const ampLFO = this.ctx.createOscillator();
    ampLFO.frequency.value = speed;
    const ampGain = this.ctx.createGain();
    ampGain.gain.value = 0.5;
    ampLFO.connect(ampGain);
    nodes.push(ampLFO, ampGain);

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.5;
    ampGain.connect(gainNode.gain);
    nodes.push(gainNode);

    source.connect(filter).connect(gainNode).connect(this.dryGain!);
    source.start();
    ampLFO.start();

    return {
      type: 'water_lapping',
      gainNode,
      nodes,
      timers: [],
      destroy: () => this.destroyNodes(nodes, []),
    };
  }

  // ─── Crowd Murmur: layered filtered noise ───────────────────────

  private createCrowdMurmur(params: Record<string, number>): AmbientLayer {
    const { density = 0.4 } = params;
    const nodes: AudioNode[] = [];
    const gainNode = this.ctx.createGain();
    nodes.push(gainNode);

    // Two noise layers at speech frequencies
    const freqs = [400, 1200];
    for (const freq of freqs) {
      const source = this.createNoiseSource('white');
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 1.5;

      // Slow amplitude modulation
      const ampLFO = this.ctx.createOscillator();
      ampLFO.frequency.value = 0.1 + Math.random() * 0.2;
      const ampMod = this.ctx.createGain();
      ampMod.gain.value = density * 0.3;
      ampLFO.connect(ampMod);

      const layerGain = this.ctx.createGain();
      layerGain.gain.value = density * 0.5;
      ampMod.connect(layerGain.gain);

      source.connect(filter).connect(layerGain).connect(gainNode);
      source.start();
      ampLFO.start();
      nodes.push(source, filter, ampLFO, ampMod, layerGain);
    }

    gainNode.connect(this.dryGain!);

    return {
      type: 'crowd_murmur',
      gainNode,
      nodes,
      timers: [],
      destroy: () => this.destroyNodes(nodes, []),
    };
  }

  // ─── Wind: filtered noise with slow sweep ───────────────────────

  private createWind(params: Record<string, number>): AmbientLayer {
    const { speed = 0.3 } = params;
    const nodes: AudioNode[] = [];

    const source = this.createNoiseSource('white');
    nodes.push(source);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.3;
    nodes.push(filter);

    // Slow filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05 + speed * 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    nodes.push(lfo, lfoGain);

    // Gentle amplitude modulation
    const ampLFO = this.ctx.createOscillator();
    ampLFO.frequency.value = 0.08;
    const ampGain = this.ctx.createGain();
    ampGain.gain.value = 0.3;
    ampLFO.connect(ampGain);
    ampLFO.start();
    nodes.push(ampLFO, ampGain);

    const gainNode = this.ctx.createGain();
    ampGain.connect(gainNode.gain);
    nodes.push(gainNode);

    source.connect(filter).connect(gainNode).connect(this.dryGain!);
    source.start();

    return {
      type: 'wind_gentle',
      gainNode,
      nodes,
      timers: [],
      destroy: () => this.destroyNodes(nodes, []),
    };
  }

  // ─── Birds: periodic chirp bursts ────────────────────────────────

  private createBirds(params: Record<string, number>): AmbientLayer {
    const { count = 2, interval = 4 } = params;
    const nodes: AudioNode[] = [];
    const timers: number[] = [];

    const gainNode = this.ctx.createGain();
    gainNode.connect(this.dryGain!);
    nodes.push(gainNode);

    // Schedule periodic bird chirps
    for (let b = 0; b < count; b++) {
      const birdFreq = 2000 + Math.random() * 2000; // 2-4 kHz
      const scheduleChirp = () => {
        if (!this.activeLayers.has('birds')) return;
        this.playBirdChirp(gainNode, birdFreq);
        const nextDelay = (interval + Math.random() * interval) * 1000;
        const timer = window.setTimeout(scheduleChirp, nextDelay);
        timers.push(timer);
      };
      // Stagger initial start
      const initialDelay = (1 + Math.random() * interval) * 1000;
      const timer = window.setTimeout(scheduleChirp, initialDelay);
      timers.push(timer);
    }

    return {
      type: 'birds',
      gainNode,
      nodes,
      timers,
      destroy: () => this.destroyNodes(nodes, timers),
    };
  }

  private playBirdChirp(destination: AudioNode, baseFreq: number): void {
    const time = this.ctx.currentTime;
    const chirpCount = 2 + Math.floor(Math.random() * 3); // 2-4 chirps

    for (let i = 0; i < chirpCount; i++) {
      const t = time + i * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const f = baseFreq * (0.9 + Math.random() * 0.2);
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.08);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.15, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(env).connect(destination);
      osc.start(t);
      osc.stop(t + 0.1);

      setTimeout(() => {
        try { osc.disconnect(); env.disconnect(); } catch { /* ok */ }
      }, (t - this.ctx.currentTime + 0.15) * 1000);
    }
  }

  // ─── Steam Hiss: highpass-filtered noise ─────────────────────────

  private createSteamHiss(params: Record<string, number>): AmbientLayer {
    const { intensity = 0.5 } = params;
    const nodes: AudioNode[] = [];

    const source = this.createNoiseSource('white');
    nodes.push(source);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    nodes.push(filter);

    // Slow pulsation
    const ampLFO = this.ctx.createOscillator();
    ampLFO.frequency.value = 0.15;
    const ampGain = this.ctx.createGain();
    ampGain.gain.value = intensity * 0.3;
    ampLFO.connect(ampGain);
    ampLFO.start();
    nodes.push(ampLFO, ampGain);

    const gainNode = this.ctx.createGain();
    ampGain.connect(gainNode.gain);
    nodes.push(gainNode);

    source.connect(filter).connect(gainNode).connect(this.dryGain!);
    source.start();

    return {
      type: 'steam_hiss',
      gainNode,
      nodes,
      timers: [],
      destroy: () => this.destroyNodes(nodes, []),
    };
  }

  // ─── Indoor Reverb: adds room feel ───────────────────────────────

  private createIndoorReverb(): AmbientLayer {
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(this.dryGain!);

    return {
      type: 'indoor_reverb',
      gainNode,
      nodes: [gainNode],
      timers: [],
      destroy: () => {
        try { gainNode.disconnect(); } catch { /* ok */ }
      },
    };
  }

  // ─── Bar Chatter: crowd + glass clinks ──────────────────────────

  private createBarChatter(params: Record<string, number>): AmbientLayer {
    const { density = 0.5 } = params;
    const nodes: AudioNode[] = [];
    const timers: number[] = [];

    const gainNode = this.ctx.createGain();
    nodes.push(gainNode);

    // Base chatter (crowd murmur at bar frequencies)
    const source = this.createNoiseSource('white');
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;

    const ampLFO = this.ctx.createOscillator();
    ampLFO.frequency.value = 0.15;
    const ampMod = this.ctx.createGain();
    ampMod.gain.value = density * 0.25;
    ampLFO.connect(ampMod);

    const chatterGain = this.ctx.createGain();
    chatterGain.gain.value = density * 0.6;
    ampMod.connect(chatterGain.gain);

    source.connect(filter).connect(chatterGain).connect(gainNode);
    source.start();
    ampLFO.start();
    nodes.push(source, filter, ampLFO, ampMod, chatterGain);

    // Periodic glass clinks
    const scheduleClink = () => {
      if (!this.activeLayers.has('bar_chatter')) return;
      this.playGlassClink(gainNode);
      const delay = (2 + Math.random() * 4) * 1000;
      const timer = window.setTimeout(scheduleClink, delay);
      timers.push(timer);
    };
    const initialTimer = window.setTimeout(scheduleClink, (1 + Math.random() * 3) * 1000);
    timers.push(initialTimer);

    gainNode.connect(this.dryGain!);

    return {
      type: 'bar_chatter',
      gainNode,
      nodes,
      timers,
      destroy: () => this.destroyNodes(nodes, timers),
    };
  }

  private playGlassClink(destination: AudioNode): void {
    const time = this.ctx.currentTime;
    const freq = 3000 + Math.random() * 2000;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.08, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(env).connect(destination);
    osc.start(time);
    osc.stop(time + 0.2);

    setTimeout(() => {
      try { osc.disconnect(); env.disconnect(); } catch { /* ok */ }
    }, 300);
  }

  // ─── Reverb ──────────────────────────────────────────────────────

  private updateReverb(decay: number, mix: number, fadeDuration: number): void {
    if (!this.reverbGain || !this.dryGain) return;

    const t = this.ctx.currentTime;
    this.reverbGain.gain.setValueAtTime(this.reverbGain.gain.value, t);
    this.reverbGain.gain.linearRampToValueAtTime(mix, t + fadeDuration);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, t);
    this.dryGain.gain.linearRampToValueAtTime(1 - mix * 0.5, t + fadeDuration);

    // Create new impulse response if decay changed significantly
    if (mix > 0 && decay > 0) {
      this.createReverbImpulse(decay);
    }
  }

  private createReverbImpulse(decay: number): void {
    const sr = this.ctx.sampleRate;
    const length = sr * decay;
    const impulse = this.ctx.createBuffer(2, length, sr);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * decay * 0.3));
      }
    }

    // Replace convolver
    if (this.convolver) {
      try { this.convolver.disconnect(); } catch { /* ok */ }
    }
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = impulse;

    // Route dry signal through convolver to reverb gain
    this.dryGain!.connect(this.convolver);
    this.convolver.connect(this.reverbGain!);
  }

  // ─── Utilities ───────────────────────────────────────────────────

  private createNoiseSource(type: 'white' | 'brown'): AudioBufferSourceNode {
    const buffer = type === 'white' ? this.whiteNoiseBuffer : this.brownNoiseBuffer;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private fadeOutLayer(layer: AmbientLayer, duration: number): void {
    const t = this.ctx.currentTime;
    layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, t);
    layer.gainNode.gain.linearRampToValueAtTime(0, t + duration);
    setTimeout(() => layer.destroy(), duration * 1000 + 100);
  }

  private destroyNodes(nodes: AudioNode[], timers: number[]): void {
    for (const timer of timers) clearTimeout(timer);
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* ok */ }
    }
  }
}
