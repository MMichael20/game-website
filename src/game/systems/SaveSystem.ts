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

// One-shot flag set by loadGameState when a corrupt save was found and
// reset to defaults. Consumed (cleared) by the main menu so we can show
// a single toast. Kept as module state so consumers don't have to thread
// a return value through every loader.
let corruptedSaveDetected = false;

/**
 * Sanity-check a migrated GameStateV3 shape. Catches partially-valid JSON
 * that JSON.parse accepts but that would crash the game at runtime (e.g.,
 * outfits became a string, visitedCheckpoints became null, scene key is a
 * number). Returns the error string on first failure, or null when valid.
 */
function validateState(s: unknown): string | null {
  if (!s || typeof s !== 'object') return 'state is not an object';
  const o = s as Partial<GameStateV3>;
  if (o.version !== 3) return `version is ${String(o.version)} not 3`;
  if (!o.outfits || typeof o.outfits !== 'object') return 'outfits is missing';
  if (typeof o.outfits.player !== 'number' || typeof o.outfits.partner !== 'number') {
    return 'outfits.player/partner must be numbers';
  }
  if (!Array.isArray(o.visitedCheckpoints)) return 'visitedCheckpoints is not an array';
  if (o.miniGameScores == null || typeof o.miniGameScores !== 'object') {
    return 'miniGameScores is not an object';
  }
  if (o.bestScores == null || typeof o.bestScores !== 'object') {
    return 'bestScores is not an object';
  }
  if (typeof o.currentScene !== 'string') return 'currentScene is not a string';
  if (o.playerPosition !== undefined) {
    const p = o.playerPosition;
    if (!p || typeof p !== 'object' || typeof p.x !== 'number' || typeof p.y !== 'number') {
      return 'playerPosition shape invalid';
    }
  }
  return null;
}

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

    let state: GameStateV3;
    try {
      state = migrate(JSON.parse(raw));
    } catch (err) {
      console.warn('[SaveSystem] migration failed:', err);
      corruptedSaveDetected = true;
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultState();
    }

    // Belt-and-suspenders: even if migration "succeeded," the result may be
    // malformed (e.g. raw JSON had {version: 3} but outfits was a string).
    // Previously we'd crash at first field access; now we fall back to
    // defaults and surface a toast so the player knows their progress
    // couldn't be recovered.
    const validationError = validateState(state);
    if (validationError) {
      console.warn(`[SaveSystem] save rejected by validator: ${validationError}`);
      corruptedSaveDetected = true;
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultState();
    }

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
    // JSON.parse failures or localStorage access errors (private-mode Safari)
    // both land here — treat the same as a corrupted save.
    corruptedSaveDetected = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
    return getDefaultState();
  }
}

/**
 * Returns true exactly once if the most recent loadGameState() detected a
 * corrupt save and had to fall back to defaults. Lets the main menu show a
 * "save couldn't be loaded" toast without loadGameState re-warning on every
 * subsequent call.
 */
export function consumeCorruptedSaveFlag(): boolean {
  const flag = corruptedSaveDetected;
  corruptedSaveDetected = false;
  return flag;
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

export function getVisitedCheckpoints(): string[] {
  return loadGameState().visitedCheckpoints;
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
