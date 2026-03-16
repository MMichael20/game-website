// src/game/data/checkpoints.ts
import checkpointData from './checkpoints.json';

export interface QuizConfig {
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
}

export interface CatchConfig {
  items: string[];
  speed: number;
  spawnRate: number;
}

export interface MatchConfig {
  pairs: Array<{ a: string; b: string }>;
}

export interface Checkpoint {
  id: string;
  name: string;
  icon: string;
  miniGame: {
    type: 'quiz' | 'catch' | 'match';
    config: QuizConfig | CatchConfig | MatchConfig;
  };
}

// MVP checkpoints only — cafe, home, pizzeria deferred
export const CHECKPOINTS: Checkpoint[] = (checkpointData as any).checkpoints
  .filter((cp: any) => ['restaurant', 'park', 'cinema'].includes(cp.id) && cp.miniGame != null)
  .map((cp: any) => ({ id: cp.id, name: cp.name, icon: cp.icon, miniGame: cp.miniGame }));

export const VALID_CHECKPOINT_IDS = CHECKPOINTS.map(cp => cp.id);
