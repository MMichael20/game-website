export interface OutfitSelection {
  herOutfit: number;
  hisOutfit: number;
}

export interface GameState {
  outfits: OutfitSelection;
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
}

const STORAGE_KEY = 'couples-map-game';

function getDefaultOutfits(): OutfitSelection {
  return { herOutfit: 0, hisOutfit: 0 };
}

function getDefaultState(): GameState {
  return {
    outfits: getDefaultOutfits(),
    visitedCheckpoints: [],
    miniGameScores: {},
  };
}

/**
 * Migrate old save format (with avatar1/avatar2 fields) to the new format.
 * Discards avatar data, keeps checkpoints and scores, defaults outfits.
 */
function migrateIfNeeded(parsed: Record<string, unknown>): GameState {
  if ('avatar1' in parsed) {
    return {
      outfits: getDefaultOutfits(),
      visitedCheckpoints: (parsed.visitedCheckpoints as string[]) ?? [],
      miniGameScores: (parsed.miniGameScores as Record<string, number>) ?? {},
    };
  }
  return {
    ...getDefaultState(),
    ...(parsed as Partial<GameState>),
  };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return migrateIfNeeded(parsed);
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveOutfitSelection(outfits: OutfitSelection): void {
  const state = loadGameState();
  state.outfits = outfits;
  saveGameState(state);
}

export function loadOutfitSelection(): OutfitSelection {
  return loadGameState().outfits;
}

export function markCheckpointVisited(checkpointId: string): void {
  const state = loadGameState();
  if (!state.visitedCheckpoints.includes(checkpointId)) {
    state.visitedCheckpoints.push(checkpointId);
    saveGameState(state);
  }
}

export function saveMiniGameScore(checkpointId: string, score: number, lowerIsBetter = false): void {
  const state = loadGameState();
  const existing = state.miniGameScores[checkpointId];
  const isBetter = lowerIsBetter ? score < existing : score > existing;
  if (existing === undefined || isBetter) {
    state.miniGameScores[checkpointId] = score;
    saveGameState(state);
  }
}

export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.outfits !== null || state.visitedCheckpoints.length > 0;
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
