// src/audio/audioData.ts
// Scene profiles, scales, voice presets, SFX definitions — pure data, no logic

import {
  ScaleDefinition, ChordProgression, VoiceConfig, VoiceType,
  SceneMusicProfile, SceneAmbientProfile, SFXDefinition,
  FootstepSurface,
} from './audioTypes';

// ─── Scale Definitions ──────────────────────────────────────────────

export const HUNGARIAN_MINOR: ScaleDefinition = {
  name: 'Hungarian Minor',
  intervals: [0, 2, 3, 6, 7, 8, 11], // A B C D# E F G#
};

export const NATURAL_MINOR: ScaleDefinition = {
  name: 'Natural Minor',
  intervals: [0, 2, 3, 5, 7, 8, 10],
};

export const DORIAN: ScaleDefinition = {
  name: 'Dorian',
  intervals: [0, 2, 3, 5, 7, 9, 10],
};

export const PENTATONIC_MINOR: ScaleDefinition = {
  name: 'Pentatonic Minor',
  intervals: [0, 3, 5, 7, 10],
};

// ─── Chord Progressions ─────────────────────────────────────────────

const PROG_AM_DM_E7_AM: ChordProgression = {
  name: 'classic_minor',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7], beats: 4 },       // Am
    { rootOffset: 5, intervals: [0, 3, 7], beats: 4 },       // Dm
    { rootOffset: 7, intervals: [0, 4, 7, 10], beats: 4 },   // E7
    { rootOffset: 0, intervals: [0, 3, 7], beats: 4 },       // Am
  ],
  totalBeats: 16,
};

const PROG_AM_F_G_E7: ChordProgression = {
  name: 'dramatic',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7], beats: 4 },       // Am
    { rootOffset: 8, intervals: [0, 4, 7], beats: 4 },       // F (bVI)
    { rootOffset: 10, intervals: [0, 4, 7], beats: 4 },      // G (bVII)
    { rootOffset: 7, intervals: [0, 4, 7, 10], beats: 4 },   // E7
  ],
  totalBeats: 16,
};

const PROG_AM_DM_SLOW: ChordProgression = {
  name: 'serene',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7], beats: 8 },       // Am
    { rootOffset: 5, intervals: [0, 3, 7], beats: 8 },       // Dm
  ],
  totalBeats: 16,
};

const PROG_JAZZ_TURNAROUND: ChordProgression = {
  name: 'jazz_turnaround',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7, 10], beats: 4 },   // Am7
    { rootOffset: 5, intervals: [0, 3, 7, 10], beats: 4 },   // Dm7
    { rootOffset: 7, intervals: [0, 4, 7, 10], beats: 4 },   // E7
    { rootOffset: 0, intervals: [0, 3, 7], beats: 4 },       // Am
  ],
  totalBeats: 16,
};

const PROG_STATELY: ChordProgression = {
  name: 'stately',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7], beats: 8 },       // Am
    { rootOffset: 7, intervals: [0, 4, 7], beats: 4 },       // E
    { rootOffset: 0, intervals: [0, 3, 7], beats: 4 },       // Am
  ],
  totalBeats: 16,
};

const PROG_ENERGETIC: ChordProgression = {
  name: 'energetic',
  chords: [
    { rootOffset: 0, intervals: [0, 3, 7], beats: 2 },       // Am
    { rootOffset: 5, intervals: [0, 3, 7], beats: 2 },       // Dm
    { rootOffset: 7, intervals: [0, 4, 7], beats: 2 },       // E
    { rootOffset: 0, intervals: [0, 3, 7], beats: 2 },       // Am
    { rootOffset: 8, intervals: [0, 4, 7], beats: 2 },       // F
    { rootOffset: 10, intervals: [0, 4, 7], beats: 2 },      // G
    { rootOffset: 7, intervals: [0, 4, 7, 10], beats: 2 },   // E7
    { rootOffset: 0, intervals: [0, 3, 7], beats: 2 },       // Am
  ],
  totalBeats: 16,
};

// ─── Voice Presets ──────────────────────────────────────────────────

export const VOICE_PRESETS: Record<VoiceType, VoiceConfig> = {
  cimbalom: {
    type: 'cimbalom',
    oscType: 'fm',
    fmRatio: 3.5,
    fmIndex: 2.0,
    envelope: { attack: 0.002, decay: 0.3, sustain: 0.1, release: 0.4 },
    filter: { type: 'highpass', frequency: 800 },
    gain: 0.25,
  },
  violin: {
    type: 'violin',
    oscType: 'sawtooth',
    detuneCents: 3,
    unisonCount: 2,
    envelope: { attack: 0.08, decay: 0.1, sustain: 0.7, release: 0.3 },
    filter: { type: 'lowpass', frequency: 4000, Q: 1.5 },
    vibrato: { rate: 5.5, depth: 15, delay: 0.2 },
    gain: 0.22,
  },
  accordion: {
    type: 'accordion',
    oscType: 'square',
    detuneCents: 8,
    unisonCount: 2,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.2 },
    filter: { type: 'lowpass', frequency: 2500 },
    gain: 0.15,
  },
  bass: {
    type: 'bass',
    oscType: 'triangle',
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.3 },
    filter: { type: 'lowpass', frequency: 600 },
    gain: 0.35,
  },
  pad: {
    type: 'pad',
    oscType: 'sawtooth',
    detuneCents: 12,
    unisonCount: 3,
    envelope: { attack: 0.8, decay: 0.3, sustain: 0.4, release: 1.0 },
    filter: { type: 'lowpass', frequency: 1200, Q: 0.7 },
    gain: 0.12,
  },
  pluck: {
    type: 'pluck',
    oscType: 'fm',
    fmRatio: 2.0,
    fmIndex: 1.5,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.15 },
    gain: 0.25,
  },
};

// ─── Scene Music Profiles ───────────────────────────────────────────

export const SCENE_MUSIC_PROFILES: Record<string, SceneMusicProfile> = {

  // ── Budapest Overworld: moderate energy, Hungarian folk ──
  BudapestOverworldScene: {
    sceneKey: 'BudapestOverworldScene',
    bpm: 100,
    rootNote: 57,  // A3
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_AM_DM_E7_AM, PROG_AM_F_G_E7],
    voices: {
      bass: VOICE_PRESETS.bass,
      violin: VOICE_PRESETS.violin,
      pad: VOICE_PRESETS.pad,
      cimbalom: { ...VOICE_PRESETS.cimbalom, gain: 0.18 },
    },
    melody: {
      density: 0.5,
      maxJump: 3,
      octaveRange: [0, 1],
      callResponse: true,
      phraseLength: 4,
    },
    energy: 0.45,
    swing: 0.15,
  },

  // ── Danube Cruise: slow, romantic ──
  DanubeCruiseScene: {
    sceneKey: 'DanubeCruiseScene',
    bpm: 68,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      violin: { ...VOICE_PRESETS.violin, gain: 0.3 },
      pad: { ...VOICE_PRESETS.pad, gain: 0.2 },
      bass: { ...VOICE_PRESETS.bass, gain: 0.2 },
      cimbalom: { ...VOICE_PRESETS.cimbalom, gain: 0.12 },
    },
    melody: {
      density: 0.3,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 8,
    },
    energy: 0.2,
    swing: 0,
  },

  // ── Ruin Bar: jazzy, upbeat ──
  RuinBarScene: {
    sceneKey: 'RuinBarScene',
    bpm: 125,
    rootNote: 57,
    scale: DORIAN,
    progressions: [PROG_JAZZ_TURNAROUND],
    voices: {
      bass: VOICE_PRESETS.bass,
      pluck: { ...VOICE_PRESETS.pluck, gain: 0.2 },
      accordion: { ...VOICE_PRESETS.accordion, gain: 0.15 },
      pad: { ...VOICE_PRESETS.pad, gain: 0.08 },
    },
    melody: {
      density: 0.65,
      maxJump: 4,
      octaveRange: [-1, 1],
      callResponse: true,
      phraseLength: 4,
    },
    energy: 0.65,
    swing: 0.3,
  },

  // ── Thermal Baths: serene, minimal ──
  ThermalBathScene: {
    sceneKey: 'ThermalBathScene',
    bpm: 56,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.25 },
    },
    melody: {
      density: 0.15,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 8,
    },
    energy: 0.1,
    swing: 0,
  },

  // ── Jewish Quarter: lively street music ──
  JewishQuarterScene: {
    sceneKey: 'JewishQuarterScene',
    bpm: 115,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_AM_DM_E7_AM, PROG_ENERGETIC],
    voices: {
      bass: VOICE_PRESETS.bass,
      violin: VOICE_PRESETS.violin,
      cimbalom: VOICE_PRESETS.cimbalom,
      accordion: { ...VOICE_PRESETS.accordion, gain: 0.12 },
    },
    melody: {
      density: 0.6,
      maxJump: 3,
      octaveRange: [0, 1],
      callResponse: true,
      phraseLength: 4,
    },
    energy: 0.6,
    swing: 0.2,
  },

  // ── Budapest Eye: dreamy, wonder ──
  BudapestEyeScene: {
    sceneKey: 'BudapestEyeScene',
    bpm: 72,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_AM_F_G_E7],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.25 },
      violin: { ...VOICE_PRESETS.violin, gain: 0.15 },
    },
    melody: {
      density: 0.25,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 8,
    },
    energy: 0.2,
    swing: 0,
  },

  // ── Bus Ride: moving, gentle ──
  BudapestBusRideScene: {
    sceneKey: 'BudapestBusRideScene',
    bpm: 84,
    rootNote: 57,
    scale: NATURAL_MINOR,
    progressions: [PROG_AM_DM_E7_AM],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.2 },
      bass: { ...VOICE_PRESETS.bass, gain: 0.15 },
      accordion: { ...VOICE_PRESETS.accordion, gain: 0.1 },
    },
    melody: {
      density: 0.3,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 4,
    },
    energy: 0.3,
    swing: 0,
  },

  // ── Airbnb scenes: cozy, homey ──
  BudapestAirbnbScene: {
    sceneKey: 'BudapestAirbnbScene',
    bpm: 76,
    rootNote: 57,
    scale: NATURAL_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.18 },
    },
    melody: {
      density: 0.2,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 8,
    },
    energy: 0.15,
    swing: 0,
  },

  // ── Minigame: action-oriented ──
  MinigameDefault: {
    sceneKey: 'MinigameDefault',
    bpm: 140,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_ENERGETIC],
    voices: {
      bass: VOICE_PRESETS.bass,
      pluck: { ...VOICE_PRESETS.pluck, gain: 0.3 },
    },
    melody: {
      density: 0.7,
      maxJump: 3,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 4,
    },
    energy: 0.75,
    swing: 0.1,
  },

  // ── Minigame: chase/escape (intense) ──
  MinigameChase: {
    sceneKey: 'MinigameChase',
    bpm: 155,
    rootNote: 57,
    scale: HUNGARIAN_MINOR,
    progressions: [PROG_ENERGETIC],
    voices: {
      bass: { ...VOICE_PRESETS.bass, gain: 0.4 },
      pluck: { ...VOICE_PRESETS.pluck, gain: 0.3 },
    },
    melody: {
      density: 0.8,
      maxJump: 4,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 2,
    },
    energy: 0.85,
    swing: 0,
  },

  // ── Minigame: quiz (moderate) ──
  MinigameQuiz: {
    sceneKey: 'MinigameQuiz',
    bpm: 95,
    rootNote: 57,
    scale: NATURAL_MINOR,
    progressions: [PROG_AM_DM_E7_AM],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.15 },
      bass: { ...VOICE_PRESETS.bass, gain: 0.2 },
    },
    melody: {
      density: 0.35,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 4,
    },
    energy: 0.35,
    swing: 0.1,
  },

  // ── World Scene (first overworld): whimsical ──
  WorldScene: {
    sceneKey: 'WorldScene',
    bpm: 105,
    rootNote: 60,  // C4
    scale: PENTATONIC_MINOR,
    progressions: [PROG_AM_DM_E7_AM],
    voices: {
      pluck: VOICE_PRESETS.pluck,
      pad: { ...VOICE_PRESETS.pad, gain: 0.15 },
      bass: { ...VOICE_PRESETS.bass, gain: 0.25 },
    },
    melody: {
      density: 0.5,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: true,
      phraseLength: 4,
    },
    energy: 0.4,
    swing: 0.1,
  },

  // ── Maui Overworld: tropical, relaxed ──
  MauiOverworldScene: {
    sceneKey: 'MauiOverworldScene',
    bpm: 92,
    rootNote: 60,
    scale: PENTATONIC_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      pluck: { ...VOICE_PRESETS.pluck, gain: 0.25 },
      pad: { ...VOICE_PRESETS.pad, gain: 0.18 },
      bass: { ...VOICE_PRESETS.bass, gain: 0.2 },
    },
    melody: {
      density: 0.4,
      maxJump: 3,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 4,
    },
    energy: 0.35,
    swing: 0.2,
  },

  // ── Airport: neutral, transitional ──
  AirportInteriorScene: {
    sceneKey: 'AirportInteriorScene',
    bpm: 80,
    rootNote: 60,
    scale: NATURAL_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.12 },
    },
    melody: {
      density: 0.1,
      maxJump: 2,
      octaveRange: [0, 1],
      callResponse: false,
      phraseLength: 8,
    },
    energy: 0.1,
    swing: 0,
  },

  // ── Airplane Cutscene: ambient drone ──
  AirplaneCutscene: {
    sceneKey: 'AirplaneCutscene',
    bpm: 60,
    rootNote: 57,
    scale: NATURAL_MINOR,
    progressions: [PROG_AM_DM_SLOW],
    voices: {
      pad: { ...VOICE_PRESETS.pad, gain: 0.15 },
    },
    melody: {
      density: 0.05,
      maxJump: 1,
      octaveRange: [0, 0],
      callResponse: false,
      phraseLength: 16,
    },
    energy: 0.05,
    swing: 0,
  },
};

// Map minigame scene keys to their music profile
export const MINIGAME_MUSIC_MAP: Record<string, string> = {
  QuizScene: 'MinigameQuiz',
  RuinBarQuizScene: 'MinigameQuiz',
  CatchScene: 'MinigameDefault',
  MatchScene: 'MinigameDefault',
  TennisScene: 'MinigameDefault',
  ChaseBabyScene: 'MinigameDefault',
  TurtleRescueScene: 'MinigameDefault',
  CurryHuntScene: 'MinigameDefault',
  LangosCatchScene: 'MinigameDefault',
  PaprikaSortScene: 'MinigameDefault',
  ChimneyCakeScene: 'MinigameDefault',
  TramDashScene: 'MinigameChase',
  GuardEscapeScene: 'MinigameChase',
  RooftopChaseScene: 'MinigameChase',
  DanubeKayakScene: 'MinigameChase',
  JazzSeatScene: 'MinigameDefault',
};

// ─── Scene Ambient Profiles ─────────────────────────────────────────

export const SCENE_AMBIENT_PROFILES: Record<string, SceneAmbientProfile> = {

  // Birds only on overworld maps — no music, no noise layers
  BudapestOverworldScene: {
    sceneKey: 'BudapestOverworldScene',
    layers: [
      { type: 'birds', gain: 0.1, params: { count: 3, interval: 4 } },
    ],
    reverbMix: 0,
    reverbDecay: 0,
  },

  JewishQuarterScene: {
    sceneKey: 'JewishQuarterScene',
    layers: [
      { type: 'birds', gain: 0.08, params: { count: 2, interval: 5 } },
    ],
    reverbMix: 0,
    reverbDecay: 0,
  },

  WorldScene: {
    sceneKey: 'WorldScene',
    layers: [
      { type: 'birds', gain: 0.1, params: { count: 3, interval: 4 } },
    ],
    reverbMix: 0,
    reverbDecay: 0,
  },

  MauiOverworldScene: {
    sceneKey: 'MauiOverworldScene',
    layers: [
      { type: 'birds', gain: 0.12, params: { count: 3, interval: 3 } },
    ],
    reverbMix: 0,
    reverbDecay: 0,
  },
};

// ─── SFX Definitions ────────────────────────────────────────────────

export const SFX_DEFINITIONS: SFXDefinition[] = [
  // UI sounds
  { id: 'ui_click', generator: 'tone_burst', params: { freq: 800, type: 0 }, duration: 0.06, gain: 0.3 },
  { id: 'ui_confirm', generator: 'chirp', params: { startFreq: 500, endFreq: 900, type: 0 }, duration: 0.12, gain: 0.3 },
  { id: 'ui_cancel', generator: 'chirp', params: { startFreq: 600, endFreq: 350, type: 0 }, duration: 0.12, gain: 0.25 },
  { id: 'ui_dialog_advance', generator: 'tone_burst', params: { freq: 650, type: 0 }, duration: 0.04, gain: 0.2 },
  { id: 'ui_dialog_open', generator: 'chirp', params: { startFreq: 300, endFreq: 600, type: 0 }, duration: 0.15, gain: 0.2 },

  // Footsteps
  { id: 'footstep_stone', generator: 'noise_burst', params: { filterFreq: 3000, filterQ: 2, noiseType: 0 }, duration: 0.05, gain: 0.2 },
  { id: 'footstep_grass', generator: 'noise_burst', params: { filterFreq: 1500, filterQ: 0.5, noiseType: 1 }, duration: 0.06, gain: 0.12 },
  { id: 'footstep_wood', generator: 'fm_hit', params: { freq: 200, ratio: 1.5, index: 0.5 }, duration: 0.05, gain: 0.22 },
  { id: 'footstep_carpet', generator: 'noise_burst', params: { filterFreq: 800, filterQ: 0.3, noiseType: 1 }, duration: 0.04, gain: 0.08 },
  { id: 'footstep_tile', generator: 'tone_burst', params: { freq: 1200, type: 0 }, duration: 0.03, gain: 0.15 },

  // Water
  { id: 'water_splash', generator: 'noise_burst', params: { filterFreq: 2000, filterQ: 1, noiseType: 0 }, duration: 0.25, gain: 0.3 },
  { id: 'water_wade', generator: 'filtered_noise', params: { filterFreq: 600, filterQ: 0.5 }, duration: 0.15, gain: 0.12 },

  // Minigame
  { id: 'mg_correct', generator: 'chirp', params: { startFreq: 500, endFreq: 1000, type: 0 }, duration: 0.18, gain: 0.35 },
  { id: 'mg_wrong', generator: 'chirp', params: { startFreq: 400, endFreq: 200, type: 1 }, duration: 0.22, gain: 0.3 },
  { id: 'mg_catch', generator: 'fm_hit', params: { freq: 600, ratio: 2.5, index: 1.0 }, duration: 0.08, gain: 0.3 },
  { id: 'mg_miss', generator: 'noise_burst', params: { filterFreq: 500, filterQ: 1.5, noiseType: 0 }, duration: 0.12, gain: 0.2 },
  { id: 'mg_timer_warning', generator: 'tone_burst', params: { freq: 1000, type: 1 }, duration: 0.08, gain: 0.25 },
  { id: 'mg_score_up', generator: 'chirp', params: { startFreq: 800, endFreq: 1200, type: 0 }, duration: 0.1, gain: 0.25 },
  { id: 'mg_complete', generator: 'chirp', params: { startFreq: 400, endFreq: 1200, type: 0 }, duration: 0.4, gain: 0.4 },
  { id: 'mg_fail', generator: 'chirp', params: { startFreq: 500, endFreq: 150, type: 1 }, duration: 0.5, gain: 0.3 },
  { id: 'mg_start', generator: 'chirp', params: { startFreq: 600, endFreq: 900, type: 0 }, duration: 0.2, gain: 0.3 },

  // Environmental
  { id: 'tram_bell', generator: 'metallic', params: { freq: 2000, modFreq: 340, modDepth: 0.5 }, duration: 0.7, gain: 0.2 },
  { id: 'boat_horn', generator: 'rumble', params: { freq: 110, filterFreq: 200 }, duration: 1.0, gain: 0.18 },
  { id: 'pigeon_coo', generator: 'chirp', params: { startFreq: 600, endFreq: 420, type: 0 }, duration: 0.25, gain: 0.1 },
  { id: 'door_open', generator: 'noise_burst', params: { filterFreq: 800, filterQ: 1, noiseType: 1 }, duration: 0.2, gain: 0.2 },
  { id: 'door_close', generator: 'noise_burst', params: { filterFreq: 500, filterQ: 1.5, noiseType: 1 }, duration: 0.15, gain: 0.25 },
  { id: 'camera_shutter', generator: 'metallic', params: { freq: 4000, modFreq: 100, modDepth: 0.8 }, duration: 0.12, gain: 0.25 },
  { id: 'sparkle', generator: 'chirp', params: { startFreq: 2000, endFreq: 4000, type: 0 }, duration: 0.3, gain: 0.15 },
  { id: 'whoosh', generator: 'filtered_noise', params: { filterFreq: 1500, filterQ: 0.8 }, duration: 0.3, gain: 0.2 },
];

// ─── Surface Mapping ────────────────────────────────────────────────

/** Map Budapest tile types to footstep surfaces. Indices match BudapestTileType enum. */
export const BUDAPEST_SURFACE_MAP: FootstepSurface[] = [
  'stone',  // 0 = Cobblestone
  'stone',  // 1 = Road
  'stone',  // 2 = TramTrack
  'stone',  // 3 = Sidewalk
  'grass',  // 4 = Grass
  'stone',  // 5 = Water (won't play footstep in water)
  'stone',  // 6 = Bridge
  'stone',  // 7 = Plaza
  'grass',  // 8 = ParkPath
  'stone',  // 9 = BudaCastle
  'stone',  // 10 = WaterShallow
];

/** Map InteriorTileType to footstep surfaces */
export const INTERIOR_SURFACE_MAP: FootstepSurface[] = [
  'wood',    // 0 = Wood
  'carpet',  // 1 = Carpet
  'tile',    // 2 = TileFloor
  'stone',   // 3 = Wall (shouldn't walk here)
  'wood',    // 4 = DoorFrame
  'carpet',  // 5 = CarpetBeige
];
