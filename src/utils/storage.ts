export interface AvatarConfig {
  hair: number;
  hairColor: string;
  skin: number;
  outfit: number;
  accessory: string | null;
}

export interface GameState {
  avatar1: AvatarConfig | null;
  avatar2: AvatarConfig | null;
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
}

const STORAGE_KEY = 'couples-map-game';

function getDefaultState(): GameState {
  return {
    avatar1: null,
    avatar2: null,
    visitedCheckpoints: [],
    miniGameScores: {},
  };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(raw) };
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveAvatars(avatar1: AvatarConfig, avatar2: AvatarConfig): void {
  const state = loadGameState();
  state.avatar1 = avatar1;
  state.avatar2 = avatar2;
  saveGameState(state);
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
  return state.avatar1 !== null;
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
