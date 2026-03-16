// src/game/systems/SaveSystem.ts
import { VALID_CHECKPOINT_IDS } from '../data/checkpoints';
import { DEFAULT_SPAWN } from '../../utils/constants';

export interface GameStateV2 {
  version: 2;
  outfits: { player: number; partner: number };
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
  bestScores: Record<string, number>;
  playerPosition?: { x: number; y: number };
}

export interface GameStateV3 {
  version: 3;
  outfits: { player: number; partner: number };
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
  bestScores: Record<string, number>;
  playerPosition?: { x: number; y: number };
  currentScene: string;
}

const STORAGE_KEY = 'couples-map-game';

export function getDefaultState(): GameStateV3 {
  return {
    version: 3,
    outfits: { player: 0, partner: 0 },
    visitedCheckpoints: [],
    miniGameScores: {},
    bestScores: {},
    currentScene: 'WorldScene',
  };
}

function migrateV1ToV2(raw: any): GameStateV2 {
  const filteredScores = Object.fromEntries(
    Object.entries(raw?.miniGameScores ?? {})
      .filter(([id]) => VALID_CHECKPOINT_IDS.includes(id))
  ) as Record<string, number>;

  return {
    version: 2,
    outfits: {
      player: raw?.outfits?.herOutfit ?? 0,
      partner: raw?.outfits?.hisOutfit ?? 0,
    },
    visitedCheckpoints: (raw?.visitedCheckpoints ?? [])
      .filter((id: string) => VALID_CHECKPOINT_IDS.includes(id)),
    miniGameScores: filteredScores,
    bestScores: { ...filteredScores },
  };
}

function migrateV2ToV3(v2: GameStateV2): GameStateV3 {
  return {
    ...v2,
    version: 3,
    currentScene: 'WorldScene',
  };
}

function migrate(raw: any): GameStateV3 {
  if (raw?.version === 3) return raw as GameStateV3;
  if (raw?.version && raw.version > 3) return getDefaultState();
  if (raw?.version === 2) return migrateV2ToV3(raw as GameStateV2);

  // V1 -> V2 -> V3
  const v2 = migrateV1ToV2(raw);
  return migrateV2ToV3(v2);
}

export function loadGameState(): GameStateV3 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const state = migrate(JSON.parse(raw));

    // Migrate removed airport scene keys to unified interior scene
    const sceneKeyMigration: Record<string, string> = {
      'AirportEntranceScene': 'AirportInteriorScene',
      'AirportSecurityScene': 'AirportInteriorScene',
      'AirportGateScene': 'AirportInteriorScene',
    };
    if (state.currentScene && sceneKeyMigration[state.currentScene]) {
      state.currentScene = sceneKeyMigration[state.currentScene];
    }

    return state;
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameStateV3): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.visitedCheckpoints.length > 0 || state.currentScene !== 'WorldScene' || state.playerPosition != null;
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function markCheckpointVisited(id: string): void {
  const state = loadGameState();
  if (!state.visitedCheckpoints.includes(id)) {
    state.visitedCheckpoints.push(id);
    saveGameState(state);
  }
}

export function saveMiniGameScore(id: string, score: number): void {
  const state = loadGameState();
  state.miniGameScores[id] = score;
  if (!state.bestScores[id] || score > state.bestScores[id]) {
    state.bestScores[id] = score;
  }
  saveGameState(state);
}

export function savePlayerPosition(x: number, y: number): void {
  const state = loadGameState();
  state.playerPosition = { x, y };
  saveGameState(state);
}

export function getPlayerSpawn(): { x: number; y: number } {
  const state = loadGameState();
  return state.playerPosition ?? {
    x: DEFAULT_SPAWN.x * 32,
    y: DEFAULT_SPAWN.y * 32,
  };
}

export function saveOutfits(player: number, partner: number): void {
  const state = loadGameState();
  state.outfits = { player, partner };
  saveGameState(state);
}

export function saveCurrentScene(sceneKey: string): void {
  const state = loadGameState();
  state.currentScene = sceneKey;
  saveGameState(state);
}

export function getCurrentScene(): string {
  const state = loadGameState();
  return state.currentScene;
}
