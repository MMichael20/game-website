// src/audio/ProceduralMusicEngine.ts
// Real-time procedural music generation using Web Audio API
// Uses Hungarian minor scale, chord progressions, and synth voices

import {
  SceneMusicProfile, MidiNote, VoiceConfig, VoiceType,
  ChordProgression, ChordDefinition, ScaleDefinition,
  ADSREnvelope, CrossfadeConfig,
} from './audioTypes';

export class ProceduralMusicEngine {
  private ctx: AudioContext;
  private outputA: GainNode;
  private outputB: GainNode;
  private activeSlot: 'A' | 'B' = 'A';

  private currentProfile: SceneMusicProfile | null = null;
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private currentBeat = 0;
  private currentChordIndex = 0;
  private beatsInCurrentChord = 0;
  private currentProgression: ChordProgression | null = null;
  private barCount = 0;
  private playing = false;

  // Melody state
  private lastMelodyNote: MidiNote = 0;
  private phrasePosition = 0;
  private phraseDirection: 1 | -1 = 1;

  // Node tracking for cleanup
  private activeNodeSets: Set<AudioNode[]> = new Set();

  // Scheduler params
  private static readonly SCHEDULE_INTERVAL_MS = 50;
  private static readonly LOOK_AHEAD_S = 0.15;

  constructor(ctx: AudioContext, slotA: GainNode, slotB: GainNode) {
    this.ctx = ctx;
    this.outputA = slotA;
    this.outputB = slotB;
  }

  get activeOutput(): GainNode {
    return this.activeSlot === 'A' ? this.outputA : this.outputB;
  }

  get inactiveOutput(): GainNode {
    return this.activeSlot === 'A' ? this.outputB : this.outputA;
  }

  play(profile: SceneMusicProfile, crossfade?: CrossfadeConfig): void {
    if (this.currentProfile && this.playing) {
      // Crossfade to new profile
      const fadeDuration = crossfade?.duration ?? 2.0;
      this.crossfade(fadeDuration);
      // Start new music on the now-active (previously inactive) slot
      this.startOnActiveSlot(profile);
    } else {
      // Fresh start
      this.startOnActiveSlot(profile);
    }
  }

  stop(fadeOutSeconds = 1.5): void {
    if (!this.playing) return;
    this.playing = false;

    // Fade out active slot
    const output = this.activeOutput;
    const t = this.ctx.currentTime;
    output.gain.setValueAtTime(output.gain.value, t);
    output.gain.linearRampToValueAtTime(0, t + fadeOutSeconds);

    // Stop scheduler
    if (this.schedulerInterval != null) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    // Snapshot and cleanup nodes after fade
    const nodesToClean = new Set(this.activeNodeSets);
    this.activeNodeSets = new Set();
    setTimeout(() => {
      for (const nodes of nodesToClean) {
        for (const node of nodes) {
          try { node.disconnect(); } catch { /* ok */ }
        }
      }
    }, fadeOutSeconds * 1000 + 200);
  }

  pause(): void {
    if (this.schedulerInterval != null) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  resume(): void {
    if (this.playing && this.schedulerInterval == null) {
      this.nextBeatTime = this.ctx.currentTime + 0.1;
      this.startScheduler();
    }
  }

  destroy(): void {
    this.stop(0);
    this.cleanupAllNodes();
  }

  // ─── Internal: Start Music ───────────────────────────────────────

  private startOnActiveSlot(profile: SceneMusicProfile): void {
    this.currentProfile = profile;
    this.playing = true;

    // Reset state
    this.currentBeat = 0;
    this.currentChordIndex = 0;
    this.beatsInCurrentChord = 0;
    this.barCount = 0;
    this.phrasePosition = 0;
    this.phraseDirection = 1;
    this.lastMelodyNote = profile.rootNote + 12; // Start melody one octave up
    this.currentProgression = this.pickProgression(profile);

    // Set active output to full volume
    this.activeOutput.gain.setValueAtTime(1, this.ctx.currentTime);

    // Start scheduling
    this.nextBeatTime = this.ctx.currentTime + 0.2; // Small delay to avoid clicks
    this.startScheduler();
  }

  private startScheduler(): void {
    if (this.schedulerInterval != null) clearInterval(this.schedulerInterval);
    this.schedulerInterval = setInterval(
      () => this.scheduleLoop(),
      ProceduralMusicEngine.SCHEDULE_INTERVAL_MS
    );
  }

  // ─── Look-Ahead Scheduler ───────────────────────────────────────

  private scheduleLoop(): void {
    if (!this.playing || !this.currentProfile || !this.currentProgression) return;

    const profile = this.currentProfile;
    const beatDuration = 60 / profile.bpm;
    const lookAheadEnd = this.ctx.currentTime + ProceduralMusicEngine.LOOK_AHEAD_S;

    while (this.nextBeatTime < lookAheadEnd) {
      this.scheduleBeat(this.nextBeatTime, this.currentBeat, profile);

      // Advance beat
      this.beatsInCurrentChord++;
      this.currentBeat++;
      this.phrasePosition++;

      // Check if chord is exhausted
      const chord = this.currentProgression.chords[this.currentChordIndex];
      if (this.beatsInCurrentChord >= chord.beats) {
        this.advanceChord(profile);
      }

      // Calculate next beat time (with swing)
      let nextDuration = beatDuration;
      if (profile.swing > 0 && this.currentBeat % 2 === 1) {
        nextDuration *= (1 + profile.swing * 0.33);
      } else if (profile.swing > 0 && this.currentBeat % 2 === 0) {
        nextDuration *= (1 - profile.swing * 0.33);
      }
      this.nextBeatTime += nextDuration;
    }
  }

  // ─── Beat Scheduling ─────────────────────────────────────────────

  private scheduleBeat(time: number, beat: number, profile: SceneMusicProfile): void {
    if (!this.currentProgression) return;

    const chord = this.currentProgression.chords[this.currentChordIndex];
    const chordTones = this.getChordTones(chord, profile.rootNote);
    const beatDuration = 60 / profile.bpm;
    const isDownbeat = beat % 4 === 0;
    const isHalfbeat = beat % 2 === 0;

    const voices = profile.voices;

    // Bass: plays on downbeats and beat 3
    if (voices.bass && (isDownbeat || beat % 4 === 2)) {
      const bassNote = profile.rootNote + chord.rootOffset - 12;
      const noteDur = isDownbeat ? beatDuration * 1.8 : beatDuration * 0.9;
      this.scheduleBassNote(time, bassNote, noteDur, voices.bass);
    }

    // Pad: sustained chord, refreshed every 4 beats
    if (voices.pad && isDownbeat) {
      const padDuration = beatDuration * 3.5;
      this.schedulePadChord(time, chordTones, padDuration, voices.pad);
    }

    // Violin (melodic): density-based scheduling
    if (voices.violin && Math.random() < profile.melody.density) {
      const melodyNote = this.generateMelodyNote(beat, chordTones, profile);
      if (melodyNote != null) {
        const dur = beatDuration * (0.5 + Math.random() * 1.0);
        this.scheduleViolinNote(time, melodyNote, dur, voices.violin);
      }
    }

    // Pluck: arpeggiated patterns
    if (voices.pluck) {
      if (isHalfbeat || (profile.energy > 0.5 && Math.random() < profile.energy)) {
        const noteIndex = beat % chordTones.length;
        const pluckNote = chordTones[noteIndex];
        this.schedulePluckNote(time, pluckNote, beatDuration * 0.4, voices.pluck);
      }
    }

    // Cimbalom: ornamental rapid notes (added in iteration 10)
    if (voices.cimbalom && isDownbeat) {
      this.scheduleCimbalomPattern(time, chordTones, beatDuration, voices.cimbalom);
    }

    // Accordion: sustained chords (added in iteration 10)
    if (voices.accordion && isDownbeat) {
      this.scheduleAccordionChord(time, chordTones, beatDuration * 3, voices.accordion);
    }
  }

  // ─── Voice Scheduling ────────────────────────────────────────────

  private scheduleBassNote(time: number, note: MidiNote, duration: number, voice: VoiceConfig): void {
    const freq = this.midiToFreq(note);
    const { osc, env, nodes } = this.createEnvelopedOsc(
      time, freq, 'triangle', voice.envelope, this.activeOutput, voice.gain
    );

    if (voice.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = voice.filter.type;
      filter.frequency.value = voice.filter.frequency;
      if (voice.filter.Q) filter.Q.value = voice.filter.Q;
      osc.disconnect();
      osc.connect(filter).connect(env);
      nodes.push(filter);
    }

    osc.start(time);
    osc.stop(time + duration + voice.envelope.release);
    this.trackNodes(nodes, time + duration + voice.envelope.release + 0.1);
  }

  private schedulePadChord(time: number, chordTones: MidiNote[], duration: number, voice: VoiceConfig): void {
    const nodes: AudioNode[] = [];
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = voice.gain;
    nodes.push(mixGain);

    // Optional filter
    let destination: AudioNode = this.activeOutput;
    if (voice.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = voice.filter.type;
      filter.frequency.value = voice.filter.frequency;
      if (voice.filter.Q) filter.Q.value = voice.filter.Q;
      filter.connect(destination);
      destination = filter;
      nodes.push(filter);
    }
    mixGain.connect(destination);

    for (const note of chordTones) {
      const freq = this.midiToFreq(note);
      const unisonCount = voice.unisonCount ?? 1;
      const detune = voice.detuneCents ?? 0;

      for (let u = 0; u < unisonCount; u++) {
        const osc = this.ctx.createOscillator();
        osc.type = (voice.oscType === 'fm' ? 'sawtooth' : voice.oscType) as OscillatorType;
        osc.frequency.value = freq;
        osc.detune.value = (u - (unisonCount - 1) / 2) * detune;

        const env = this.ctx.createGain();
        const peakGain = 1 / (chordTones.length * unisonCount);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(peakGain * voice.envelope.sustain, time + voice.envelope.attack);
        env.gain.setValueAtTime(peakGain * voice.envelope.sustain, time + duration);
        env.gain.linearRampToValueAtTime(0, time + duration + voice.envelope.release);

        osc.connect(env).connect(mixGain);
        osc.start(time);
        osc.stop(time + duration + voice.envelope.release + 0.01);
        nodes.push(osc, env);
      }
    }

    this.trackNodes(nodes, time + duration + voice.envelope.release + 0.1);
  }

  private scheduleViolinNote(time: number, note: MidiNote, duration: number, voice: VoiceConfig): void {
    const freq = this.midiToFreq(note);
    const nodes: AudioNode[] = [];

    const unisonCount = voice.unisonCount ?? 1;
    const detune = voice.detuneCents ?? 0;
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = voice.gain;
    nodes.push(mixGain);

    let destination: AudioNode = this.activeOutput;
    if (voice.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = voice.filter.type;
      filter.frequency.value = voice.filter.frequency;
      if (voice.filter.Q) filter.Q.value = voice.filter.Q;
      filter.connect(destination);
      destination = filter;
      nodes.push(filter);
    }
    mixGain.connect(destination);

    for (let u = 0; u < unisonCount; u++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = (u - (unisonCount - 1) / 2) * detune;

      // Vibrato
      if (voice.vibrato) {
        const vib = this.ctx.createOscillator();
        vib.frequency.value = voice.vibrato.rate;
        const vibGain = this.ctx.createGain();
        vibGain.gain.setValueAtTime(0, time);
        vibGain.gain.linearRampToValueAtTime(
          voice.vibrato.depth, time + voice.vibrato.delay
        );
        vib.connect(vibGain).connect(osc.detune);
        vib.start(time);
        vib.stop(time + duration + voice.envelope.release + 0.01);
        nodes.push(vib, vibGain);
      }

      const env = this.ctx.createGain();
      const peakGain = 1 / unisonCount;
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(peakGain, time + voice.envelope.attack);
      env.gain.linearRampToValueAtTime(
        peakGain * voice.envelope.sustain, time + voice.envelope.attack + voice.envelope.decay
      );
      env.gain.setValueAtTime(peakGain * voice.envelope.sustain, time + duration);
      env.gain.linearRampToValueAtTime(0, time + duration + voice.envelope.release);

      osc.connect(env).connect(mixGain);
      osc.start(time);
      osc.stop(time + duration + voice.envelope.release + 0.01);
      nodes.push(osc, env);
    }

    this.trackNodes(nodes, time + duration + voice.envelope.release + 0.1);
  }

  private schedulePluckNote(time: number, note: MidiNote, duration: number, voice: VoiceConfig): void {
    const freq = this.midiToFreq(note);

    if (voice.oscType === 'fm') {
      // FM pluck
      const ratio = voice.fmRatio ?? 2;
      const index = voice.fmIndex ?? 1;

      const modulator = this.ctx.createOscillator();
      modulator.frequency.setValueAtTime(freq * ratio, time);
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(freq * index, time);
      modGain.gain.exponentialRampToValueAtTime(1, time + duration);

      const carrier = this.ctx.createOscillator();
      carrier.frequency.setValueAtTime(freq, time);
      modulator.connect(modGain).connect(carrier.frequency);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(voice.gain, time);
      env.gain.exponentialRampToValueAtTime(0.001, time + duration);

      carrier.connect(env).connect(this.activeOutput);
      modulator.start(time);
      carrier.start(time);
      modulator.stop(time + duration + 0.01);
      carrier.stop(time + duration + 0.01);

      this.trackNodes([modulator, modGain, carrier, env], time + duration + 0.1);
    } else {
      // Simple pluck
      const { osc, env, nodes } = this.createEnvelopedOsc(
        time, freq, voice.oscType as OscillatorType ?? 'triangle',
        voice.envelope, this.activeOutput, voice.gain
      );
      osc.start(time);
      osc.stop(time + duration + voice.envelope.release);
      this.trackNodes(nodes, time + duration + voice.envelope.release + 0.1);
    }
  }

  private scheduleCimbalomPattern(time: number, chordTones: MidiNote[], beatDuration: number, voice: VoiceConfig): void {
    // Rapid arpeggiated pattern
    const notes = [...chordTones, chordTones[0] + 12];
    const noteSpacing = beatDuration * 0.12;

    for (let i = 0; i < notes.length; i++) {
      const noteTime = time + i * noteSpacing;
      const freq = this.midiToFreq(notes[i]);

      if (voice.oscType === 'fm') {
        const ratio = voice.fmRatio ?? 3.5;
        const index = voice.fmIndex ?? 2;

        const mod = this.ctx.createOscillator();
        mod.frequency.setValueAtTime(freq * ratio, noteTime);
        const modG = this.ctx.createGain();
        modG.gain.setValueAtTime(freq * index, noteTime);
        modG.gain.exponentialRampToValueAtTime(1, noteTime + 0.15);

        const car = this.ctx.createOscillator();
        car.frequency.setValueAtTime(freq, noteTime);
        mod.connect(modG).connect(car.frequency);

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(voice.gain * 0.7, noteTime);
        env.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

        const hpf = this.ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = voice.filter?.frequency ?? 800;

        car.connect(hpf).connect(env).connect(this.activeOutput);
        mod.start(noteTime);
        car.start(noteTime);
        mod.stop(noteTime + 0.25);
        car.stop(noteTime + 0.25);

        this.trackNodes([mod, modG, car, hpf, env], noteTime + 0.3);
      }
    }
  }

  private scheduleAccordionChord(time: number, chordTones: MidiNote[], duration: number, voice: VoiceConfig): void {
    const nodes: AudioNode[] = [];
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = voice.gain;
    nodes.push(mixGain);

    let dest: AudioNode = this.activeOutput;
    if (voice.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = voice.filter.type;
      filter.frequency.value = voice.filter.frequency;
      filter.connect(dest);
      dest = filter;
      nodes.push(filter);
    }
    mixGain.connect(dest);

    for (const note of chordTones) {
      const freq = this.midiToFreq(note);
      const detuneVals = [-8, 0, 8]; // Detuned reed pairs

      for (const dt of detuneVals) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = dt;

        const env = this.ctx.createGain();
        const peak = 1 / (chordTones.length * detuneVals.length);
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(peak * voice.envelope.sustain, time + voice.envelope.attack);
        env.gain.setValueAtTime(peak * voice.envelope.sustain, time + duration);
        env.gain.linearRampToValueAtTime(0, time + duration + voice.envelope.release);

        osc.connect(env).connect(mixGain);
        osc.start(time);
        osc.stop(time + duration + voice.envelope.release + 0.01);
        nodes.push(osc, env);
      }
    }

    this.trackNodes(nodes, time + duration + voice.envelope.release + 0.1);
  }

  // ─── Melody Generation ───────────────────────────────────────────

  private generateMelodyNote(
    beat: number,
    chordTones: MidiNote[],
    profile: SceneMusicProfile
  ): MidiNote | null {
    const melody = profile.melody;

    // Call-and-response: rest during response end
    if (melody.callResponse && this.phrasePosition >= melody.phraseLength * 2 - 1) {
      this.phrasePosition = 0;
      this.phraseDirection *= -1;
      return null; // breath
    }

    const scale = profile.scale;
    const root = profile.rootNote;
    const scaleNotes = this.getScaleNotes(root, scale, melody.octaveRange[0], melody.octaveRange[1]);
    if (scaleNotes.length === 0) return null;

    const isStrongBeat = beat % 4 === 0;

    // On strong beats, gravitate toward chord tones
    if (isStrongBeat && chordTones.length > 0 && Math.random() < 0.7) {
      const closest = this.findClosestNote(this.lastMelodyNote, chordTones);
      this.lastMelodyNote = closest;
      return closest;
    }

    // Constrained random walk: 70% stepwise, 30% leap
    const currentIndex = this.findNearestScaleIndex(this.lastMelodyNote, scaleNotes);
    const isStep = Math.random() < 0.7;
    const maxJump = isStep ? 1 : melody.maxJump;
    const jump = Math.floor(Math.random() * maxJump + 1) * this.phraseDirection;

    let newIndex = currentIndex + jump;
    newIndex = Math.max(0, Math.min(scaleNotes.length - 1, newIndex));

    // Reverse direction at boundaries
    if (newIndex <= 1 || newIndex >= scaleNotes.length - 2) {
      this.phraseDirection *= -1;
    }

    this.lastMelodyNote = scaleNotes[newIndex];
    return scaleNotes[newIndex];
  }

  // ─── Chord Management ───────────────────────────────────────────

  private advanceChord(profile: SceneMusicProfile): void {
    if (!this.currentProgression) return;

    this.currentChordIndex++;
    this.beatsInCurrentChord = 0;

    if (this.currentChordIndex >= this.currentProgression.chords.length) {
      this.currentChordIndex = 0;
      this.barCount++;

      // Every 4 progressions, maybe switch to a different one
      if (this.barCount % 4 === 0 && profile.progressions.length > 1) {
        this.currentProgression = this.pickProgression(profile);
      }
    }
  }

  private pickProgression(profile: SceneMusicProfile): ChordProgression {
    const idx = Math.floor(Math.random() * profile.progressions.length);
    return profile.progressions[idx];
  }

  private getChordTones(chord: ChordDefinition, rootNote: MidiNote): MidiNote[] {
    return chord.intervals.map(i => rootNote + chord.rootOffset + i);
  }

  // ─── Crossfade ───────────────────────────────────────────────────

  private crossfade(duration: number): void {
    const t = this.ctx.currentTime;

    // Equal-power crossfade
    const fadeOut = this.activeOutput;
    const fadeIn = this.inactiveOutput;

    // Fade out current
    fadeOut.gain.setValueAtTime(fadeOut.gain.value, t);
    fadeOut.gain.linearRampToValueAtTime(0, t + duration);

    // Fade in new
    fadeIn.gain.setValueAtTime(0, t);
    fadeIn.gain.linearRampToValueAtTime(1, t + duration);

    // Snapshot only the OLD slot's nodes for cleanup
    const oldNodes = new Set(this.activeNodeSets);
    this.activeNodeSets = new Set(); // New slot starts clean

    // Switch active slot
    this.activeSlot = this.activeSlot === 'A' ? 'B' : 'A';

    // Cleanup only old slot nodes after fade
    setTimeout(() => {
      for (const nodes of oldNodes) {
        for (const node of nodes) {
          try { node.disconnect(); } catch { /* ok */ }
        }
      }
    }, duration * 1000 + 200);
  }

  // ─── Utility Functions ───────────────────────────────────────────

  private midiToFreq(note: MidiNote): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  private getScaleNotes(root: MidiNote, scale: ScaleDefinition, octLow: number, octHigh: number): MidiNote[] {
    const notes: MidiNote[] = [];
    for (let oct = octLow; oct <= octHigh; oct++) {
      for (const interval of scale.intervals) {
        notes.push(root + oct * 12 + interval);
      }
    }
    return notes.sort((a, b) => a - b);
  }

  private findClosestNote(target: MidiNote, notes: MidiNote[]): MidiNote {
    let closest = notes[0];
    let minDist = Math.abs(target - closest);
    for (let i = 1; i < notes.length; i++) {
      const dist = Math.abs(target - notes[i]);
      if (dist < minDist) {
        minDist = dist;
        closest = notes[i];
      }
    }
    return closest;
  }

  private findNearestScaleIndex(note: MidiNote, scaleNotes: MidiNote[]): number {
    let idx = 0;
    let minDist = Math.abs(note - scaleNotes[0]);
    for (let i = 1; i < scaleNotes.length; i++) {
      const d = Math.abs(note - scaleNotes[i]);
      if (d < minDist) { minDist = d; idx = i; }
    }
    return idx;
  }

  private createEnvelopedOsc(
    time: number, freq: number, oscType: OscillatorType,
    envelope: ADSREnvelope, destination: AudioNode, gain: number
  ): { osc: OscillatorNode; env: GainNode; nodes: AudioNode[] } {
    const osc = this.ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + envelope.attack);
    env.gain.linearRampToValueAtTime(
      gain * envelope.sustain, time + envelope.attack + envelope.decay
    );

    osc.connect(env).connect(destination);

    return { osc, env, nodes: [osc, env] };
  }

  // ─── Node Tracking & Cleanup ─────────────────────────────────────

  private trackNodes(nodes: AudioNode[], cleanupTime: number): void {
    this.activeNodeSets.add(nodes);

    // Safety cap: prevent memory leak from accumulated node sets
    if (this.activeNodeSets.size > 200) {
      const first = this.activeNodeSets.values().next().value;
      if (first) {
        for (const node of first) { try { node.disconnect(); } catch { /* ok */ } }
        this.activeNodeSets.delete(first);
      }
    }

    const delay = Math.max(0, (cleanupTime - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* ok */ }
      }
      this.activeNodeSets.delete(nodes);
    }, delay + 50);
  }

  private cleanupAllNodes(): void {
    for (const nodes of this.activeNodeSets) {
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* ok */ }
      }
    }
    this.activeNodeSets.clear();
  }
}
