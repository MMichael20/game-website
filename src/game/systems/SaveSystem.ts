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

const STORAGE_KEY = 'couples-map-game';

export function getDefaultState(): GameStateV2 {
  return {
    version: 2,
    outfits: { player: 0, partner: 0 },
    visitedCheckpoints: [],
    miniGameScores: {},
    bestScores: {},
  };
}

function migrate(raw: any): GameStateV2 {
  if (raw?.version === 2) return raw as GameStateV2;
  if (raw?.version && raw.version > 2) return getDefaultState();

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

export function loadGameState(): GameStateV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return migrate(JSON.parse(raw));
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameStateV2): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.visitedCheckpoints.length > 0;
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
