// src/audio/AudioManager.ts
// Central audio facade — coordinates music, ambient, and SFX engines

import {
  AudioPreferences, DEFAULT_AUDIO_PREFS, SFXId, FootstepSurface,
} from './audioTypes';
import { SCENE_MUSIC_PROFILES, SCENE_AMBIENT_PROFILES, MINIGAME_MUSIC_MAP } from './audioData';
import { ProceduralMusicEngine } from './ProceduralMusicEngine';
import { AmbientSoundEngine } from './AmbientSoundEngine';
import { SFXEngine } from './SFXEngine';

const AUDIO_PREFS_KEY = 'couples-map-game-audio';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private musicSlotA: GainNode | null = null;
  private musicSlotB: GainNode | null = null;

  private musicEngine: ProceduralMusicEngine | null = null;
  private ambientEngine: AmbientSoundEngine | null = null;
  private sfxEngine: SFXEngine | null = null;

  private preferences: AudioPreferences = { ...DEFAULT_AUDIO_PREFS };
  private initialized = false;
  private unlocked = false;
  private currentSceneKey: string | null = null;

  // Footstep surface tracking
  private lastFootstepSurface: FootstepSurface = 'stone';

  // ─── Initialization ──────────────────────────────────────────────

  init(phaserGame: Phaser.Game): void {
    if (this.initialized) return;

    try {
      // Share Phaser's AudioContext
      const soundManager = phaserGame.sound as any;
      if (soundManager?.context) {
        this.ctx = soundManager.context;
      } else {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch {
      // AudioContext not supported — silent mode
      // AudioContext not available — running silent
      return;
    }

    // Load saved preferences
    this.preferences = this.loadPreferences();

    // Build audio bus structure
    this.buildBusStructure();

    // Create engines
    if (!this.ctx) return;
    this.musicEngine = new ProceduralMusicEngine(this.ctx, this.musicSlotA!, this.musicSlotB!);
    this.ambientEngine = new AmbientSoundEngine(this.ctx, this.ambientBus!);
    this.sfxEngine = new SFXEngine(this.ctx, this.sfxBus!);

    // Apply saved volumes
    this.applyVolumes();

    // Tab visibility handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Safety net: if the AudioContext ever drops to 'suspended' after init
    // (iOS lock-screen return, tab backgrounding, OS audio-focus interrupt),
    // the next user pointer gesture re-resumes it. Idempotent and cheap when
    // already running.
    document.addEventListener('pointerdown', this.handleUserGesture, { capture: true });

    this.initialized = true;
  }

  async unlock(): Promise<void> {
    if (this.unlocked || !this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.unlocked = true;
    } catch {
      // Failed to unlock AudioContext — will retry on next user gesture
    }
  }

  // ─── Scene Transitions ───────────────────────────────────────────

  transitionToScene(sceneKey: string): void {
    if (!this.initialized || !this.unlocked || this.preferences.muted) return;
    if (sceneKey === this.currentSceneKey) return;

    this.ensureContextRunning();

    this.currentSceneKey = sceneKey;

    // Transition ambient
    const ambientProfile = SCENE_AMBIENT_PROFILES[sceneKey];
    if (ambientProfile && this.ambientEngine) {
      this.ambientEngine.setProfile(ambientProfile, 1.5);
    } else if (this.ambientEngine) {
      this.ambientEngine.stopAll(1.5);
    }

    // Transition music — look up direct profile or minigame mapping
    const musicProfile = SCENE_MUSIC_PROFILES[sceneKey]
      ?? (MINIGAME_MUSIC_MAP[sceneKey] ? SCENE_MUSIC_PROFILES[MINIGAME_MUSIC_MAP[sceneKey]] : undefined);

    if (musicProfile && this.musicEngine) {
      this.musicEngine.play(musicProfile, { duration: 2.0, curve: 'linear' });
    } else if (this.musicEngine) {
      this.musicEngine.stop(1.5);
    }
  }

  // ─── SFX ─────────────────────────────────────────────────────────

  playSFX(id: SFXId): void {
    if (!this.initialized || !this.unlocked || this.preferences.muted) return;
    this.ensureContextRunning();
    this.sfxEngine?.play(id);
  }

  /** Adjust a specific ambient layer's gain (for proximity effects) */
  setProximityLayerGain(layerType: string, gain: number): void {
    if (!this.initialized || !this.unlocked) return;
    this.ambientEngine?.setLayerGain(layerType as any, gain, 0.3);
  }

  playFootstep(surface: FootstepSurface): void {
    if (!this.initialized || !this.unlocked || this.preferences.muted) return;
    this.ensureContextRunning();

    const sfxMap: Record<FootstepSurface, SFXId> = {
      stone: 'footstep_stone',
      grass: 'footstep_grass',
      wood: 'footstep_wood',
      carpet: 'footstep_carpet',
      tile: 'footstep_tile',
    };

    this.sfxEngine?.playVariant(sfxMap[surface], 1.5);
    this.lastFootstepSurface = surface;
  }

  // ─── Volume Control ──────────────────────────────────────────────

  setMasterVolume(value: number): void {
    this.preferences.masterVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.savePreferences();
  }

  setMusicVolume(value: number): void {
    this.preferences.musicVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.savePreferences();
  }

  setSFXVolume(value: number): void {
    this.preferences.sfxVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.savePreferences();
  }

  setAmbientVolume(value: number): void {
    this.preferences.ambientVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.savePreferences();
  }

  setMuted(muted: boolean): void {
    this.preferences.muted = muted;
    this.applyVolumes();
    this.savePreferences();

    if (muted) {
      this.musicEngine?.stop(0.3);
      this.ambientEngine?.stopAll(0.3);
    } else {
      // Re-enter current scene to restart birds
      if (this.currentSceneKey) {
        const key = this.currentSceneKey;
        this.currentSceneKey = null;
        this.transitionToScene(key);
      }
    }
  }

  getMasterVolume(): number { return this.preferences.masterVolume; }
  getMusicVolume(): number { return this.preferences.musicVolume; }
  getSFXVolume(): number { return this.preferences.sfxVolume; }
  getAmbientVolume(): number { return this.preferences.ambientVolume; }
  isMuted(): boolean { return this.preferences.muted; }

  // ─── Lifecycle ───────────────────────────────────────────────────

  stopAll(): void {
    this.musicEngine?.stop(0.5);
    this.ambientEngine?.stopAll(0.5);
    this.currentSceneKey = null;
  }

  suspend(): void {
    this.musicEngine?.pause();
    this.ambientEngine?.stopAll(0.3);
  }

  resume(): void {
    if (this.preferences.muted) return;
    // The AudioContext itself may have been suspended by the browser when the
    // tab was hidden — resume it before prodding engines, otherwise music
    // restarts into a silent context and appears stuck.
    this.ensureContextRunning();
    this.musicEngine?.resume();
    // Re-enter scene to restart ambient
    if (this.currentSceneKey) {
      const key = this.currentSceneKey;
      this.currentSceneKey = null;
      this.transitionToScene(key);
    }
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleUserGesture, { capture: true } as any);
    this.musicEngine?.destroy();
    this.ambientEngine?.destroy();
    this.sfxEngine?.destroy();
    try {
      this.masterGain?.disconnect();
      this.musicBus?.disconnect();
      this.ambientBus?.disconnect();
      this.sfxBus?.disconnect();
      this.musicSlotA?.disconnect();
      this.musicSlotB?.disconnect();
    } catch { /* ok */ }
    this.initialized = false;
  }

  // ─── Internal ────────────────────────────────────────────────────

  private buildBusStructure(): void {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.masterGain);

    this.ambientBus = this.ctx.createGain();
    this.ambientBus.connect(this.masterGain);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.masterGain);

    // Crossfade slots for music
    this.musicSlotA = this.ctx.createGain();
    this.musicSlotA.connect(this.musicBus);

    this.musicSlotB = this.ctx.createGain();
    this.musicSlotB.gain.value = 0;
    this.musicSlotB.connect(this.musicBus);
  }

  private applyVolumes(): void {
    if (!this.masterGain || !this.musicBus || !this.ambientBus || !this.sfxBus) return;

    const t = this.ctx?.currentTime ?? 0;
    const rampTime = t + 0.05;

    // Anchor current values before ramping (spec compliance)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.ambientBus.gain.setValueAtTime(this.ambientBus.gain.value, t);
    this.sfxBus.gain.setValueAtTime(this.sfxBus.gain.value, t);

    if (this.preferences.muted) {
      this.masterGain.gain.linearRampToValueAtTime(0, rampTime);
    } else {
      this.masterGain.gain.linearRampToValueAtTime(this.preferences.masterVolume, rampTime);
    }
    this.musicBus.gain.linearRampToValueAtTime(this.preferences.musicVolume, rampTime);
    this.ambientBus.gain.linearRampToValueAtTime(this.preferences.ambientVolume, rampTime);
    this.sfxBus.gain.linearRampToValueAtTime(this.preferences.sfxVolume, rampTime);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.suspend();
    } else {
      this.resume();
    }
  };

  // Fires on any user pointer gesture. If the AudioContext is suspended
  // (typical after iOS lock/unlock or tab backgrounding), re-resume it.
  // No-op when the context is already running.
  private handleUserGesture = (): void => {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  };

  // Lazy resume called on every play/transition path. ctx.resume() returns
  // a Promise that we intentionally fire-and-forget — waiting would race
  // with the caller's SFX trigger and produce dropped frames instead of
  // the occasional silent first note (which self-heals on the next call).
  private ensureContextRunning(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ─── Preferences Persistence ─────────────────────────────────────

  private loadPreferences(): AudioPreferences {
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_PREFS };
      const parsed = JSON.parse(raw);
      return {
        masterVolume: parsed.masterVolume ?? DEFAULT_AUDIO_PREFS.masterVolume,
        musicVolume: parsed.musicVolume ?? DEFAULT_AUDIO_PREFS.musicVolume,
        sfxVolume: parsed.sfxVolume ?? DEFAULT_AUDIO_PREFS.sfxVolume,
        ambientVolume: parsed.ambientVolume ?? DEFAULT_AUDIO_PREFS.ambientVolume,
        muted: parsed.muted ?? DEFAULT_AUDIO_PREFS.muted,
      };
    } catch {
      return { ...DEFAULT_AUDIO_PREFS };
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(this.preferences));
    } catch { /* ok, non-critical */ }
  }
}

export const audioManager = new AudioManager();
