// src/audio/audioTypes.ts
// All shared types and interfaces for the procedural audio system

// ─── Volume / Preferences ───────────────────────────────────────────

export interface AudioPreferences {
  masterVolume: number;   // 0.0 - 1.0
  musicVolume: number;    // 0.0 - 1.0
  sfxVolume: number;      // 0.0 - 1.0
  ambientVolume: number;  // 0.0 - 1.0
  muted: boolean;
}

export const DEFAULT_AUDIO_PREFS: AudioPreferences = {
  masterVolume: 0.7,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  ambientVolume: 0.5,
  muted: false,
};

// ─── Musical Theory ─────────────────────────────────────────────────

/** MIDI note numbers. A3 = 57, A4 = 69, etc. */
export type MidiNote = number;

export interface ScaleDefinition {
  name: string;
  /** Semitone intervals from root (e.g., [0, 2, 3, 6, 7, 8, 11] for Hungarian minor) */
  intervals: number[];
}

export interface ChordDefinition {
  /** Root as semitone offset from scale root */
  rootOffset: number;
  /** Intervals above root in semitones */
  intervals: number[];
  /** Duration in beats */
  beats: number;
}

export interface ChordProgression {
  name: string;
  chords: ChordDefinition[];
  totalBeats: number;
}

// ─── Synth Voice Types ──────────────────────────────────────────────

export type VoiceType = 'cimbalom' | 'violin' | 'accordion' | 'bass' | 'pad' | 'pluck';

export interface ADSREnvelope {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // level 0.0-1.0
  release: number;  // seconds
}

export interface FilterConfig {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
}

export interface VibratoConfig {
  rate: number;   // Hz
  depth: number;  // cents
  delay: number;  // seconds before vibrato starts
}

export interface VoiceConfig {
  type: VoiceType;
  oscType: OscillatorType | 'fm';
  fmRatio?: number;
  fmIndex?: number;
  detuneCents?: number;
  unisonCount?: number;
  envelope: ADSREnvelope;
  filter?: FilterConfig;
  vibrato?: VibratoConfig;
  gain: number;
}

// ─── Scene Music Profile ────────────────────────────────────────────

export interface MelodyConfig {
  /** Probability of note on each subdivision (0.0-1.0) */
  density: number;
  /** Maximum interval jump in scale degrees */
  maxJump: number;
  /** Octave range [low, high] relative to root */
  octaveRange: [number, number];
  /** Whether melody uses call-and-response phrasing */
  callResponse: boolean;
  /** Phrase length in beats */
  phraseLength: number;
}

export interface SceneMusicProfile {
  sceneKey: string;
  bpm: number;
  rootNote: MidiNote;
  scale: ScaleDefinition;
  progressions: ChordProgression[];
  voices: Partial<Record<VoiceType, VoiceConfig>>;
  melody: MelodyConfig;
  /** Overall energy level 0.0-1.0 */
  energy: number;
  /** Swing amount 0.0-1.0 */
  swing: number;
}

// ─── Ambient Layer Types ────────────────────────────────────────────

export type AmbientLayerType =
  | 'water_flow'
  | 'water_lapping'
  | 'crowd_murmur'
  | 'wind_gentle'
  | 'birds'
  | 'steam_hiss'
  | 'indoor_reverb'
  | 'bar_chatter';

export interface AmbientLayerConfig {
  type: AmbientLayerType;
  gain: number;
  params: Record<string, number>;
}

export interface SceneAmbientProfile {
  sceneKey: string;
  layers: AmbientLayerConfig[];
  reverbMix: number;
  reverbDecay: number;
}

// ─── SFX Types ──────────────────────────────────────────────────────

export type SFXId =
  // UI
  | 'ui_click'
  | 'ui_confirm'
  | 'ui_cancel'
  | 'ui_dialog_advance'
  | 'ui_dialog_open'
  // Player
  | 'footstep_stone'
  | 'footstep_grass'
  | 'footstep_wood'
  | 'footstep_carpet'
  | 'footstep_tile'
  | 'water_splash'
  | 'water_wade'
  // Minigame
  | 'mg_correct'
  | 'mg_wrong'
  | 'mg_catch'
  | 'mg_miss'
  | 'mg_timer_warning'
  | 'mg_score_up'
  | 'mg_complete'
  | 'mg_fail'
  | 'mg_start'
  // Environmental
  | 'tram_bell'
  | 'boat_horn'
  | 'pigeon_coo'
  | 'door_open'
  | 'door_close'
  | 'camera_shutter'
  | 'sparkle'
  | 'whoosh';

export type SFXGeneratorType =
  | 'tone_burst'
  | 'noise_burst'
  | 'fm_hit'
  | 'chirp'
  | 'rumble'
  | 'metallic'
  | 'filtered_noise';

export interface SFXDefinition {
  id: SFXId;
  generator: SFXGeneratorType;
  params: Record<string, number>;
  duration: number;
  gain: number;
}

// ─── Surface Mapping (for footsteps) ────────────────────────────────

export type FootstepSurface = 'stone' | 'grass' | 'wood' | 'carpet' | 'tile';

// ─── Crossfade ──────────────────────────────────────────────────────

export interface CrossfadeConfig {
  duration: number;
  curve: 'linear' | 'equal_power';
}
