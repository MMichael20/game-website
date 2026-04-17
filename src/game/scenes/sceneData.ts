// src/game/scenes/sceneData.ts
// Typed wrapper around `scene.start(key, data)` for the subset of scene
// transitions that pass non-trivial data. The rest of the codebase keeps
// using the loose `scene.start` API — this is not an attempt to type every
// transition, only to catch typos on the data-bearing ones.
//
// Adding a new entry: extend SceneDataMap with the scene key and its data
// shape. Pass-through calls (no data, or purely optional data) don't need
// to be listed here.

import Phaser from 'phaser';

/** Data shape for DressingRoomScene. */
export interface DressingRoomData {
  isNewGame: boolean;
}

/**
 * Common "came back from an interior/minigame" payload. Used by overworld
 * scenes to restore the player's pre-departure position after a fade-in.
 * Both returnX/returnY are optional — when missing, the overworld falls
 * back to the saved position or default spawn.
 */
export interface OverworldReturnData {
  returnFromInterior?: boolean;
  returnX?: number;
  returnY?: number;
}

/** Data for the inter-continental airplane cutscene. */
export interface AirplaneCutsceneData {
  destination: 'home' | 'maui' | 'budapest';
}

/**
 * Payload used when re-entering the Budapest Airbnb from the shower scene.
 * Fields are optional because the shower scene widens them that way — the
 * receiving InteriorScene defaults to the saved layout on missing values.
 */
export interface BudapestAirbnbReturnData {
  returnX?: number;
  returnY?: number;
}

/** Discriminated map of typed scene keys to their data payload shape. */
export interface SceneDataMap {
  DressingRoomScene: DressingRoomData;
  WorldScene: OverworldReturnData;
  MauiOverworldScene: OverworldReturnData;
  BudapestOverworldScene: OverworldReturnData;
  JewishQuarterScene: OverworldReturnData;
  AirplaneCutscene: AirplaneCutsceneData;
  BudapestAirbnbScene: BudapestAirbnbReturnData;
}

/**
 * Typed wrapper around `scene.scene.start`. Use this at call sites where
 * the target scene's key is listed in SceneDataMap; TypeScript will then
 * enforce the payload shape.
 *
 * Scenes not in the map can still use the raw `this.scene.start(key, data)`
 * API — this helper doesn't replace it, just adds type safety on top for
 * the transitions we care about.
 */
export function startScene<K extends keyof SceneDataMap>(
  scene: Phaser.Scene,
  key: K,
  data: SceneDataMap[K],
): void {
  scene.scene.start(key as string, data);
}
