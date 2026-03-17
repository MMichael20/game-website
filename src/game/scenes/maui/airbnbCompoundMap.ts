// src/game/scenes/maui/airbnbCompoundMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export const COMPOUND_WIDTH = 40;
export const COMPOUND_HEIGHT = 32;

export function getCompoundTileType(x: number, y: number): number {
  if (x < 0 || x >= COMPOUND_WIDTH || y < 0 || y >= COMPOUND_HEIGHT) return -1;
  return compoundTileGrid[y][x];
}

export const compoundTileGrid: number[][] = Array.from({ length: COMPOUND_HEIGHT }, (_, y) => {
  return Array.from({ length: COMPOUND_WIDTH }, (_, x) => {
    if (y === 0) return MauiTileType.HedgeWall;
    if (x === 0 || x === 39) return MauiTileType.HedgeWall;
    if (x >= 14 && x <= 25 && y >= 1 && y <= 8) return MauiTileType.StonePath;
    if (x >= 18 && x <= 21 && y >= 9 && y <= 30) return MauiTileType.StonePath;
    if (x >= 3 && x <= 9 && y >= 11 && y <= 17) {
      if (x >= 4 && x <= 8 && y >= 13 && y <= 16) return MauiTileType.ShallowWater;
      return MauiTileType.StonePath;
    }
    if (x >= 24 && x <= 31 && y >= 12 && y <= 18) {
      if (x >= 25 && x <= 30 && y >= 13 && y <= 18) return MauiTileType.ShallowWater;
      return MauiTileType.PoolEdge;
    }
    if (x >= 24 && x <= 33 && y >= 19 && y <= 20) return MauiTileType.WoodDeck;
    if (x >= 3 && x <= 16 && y >= 23 && y <= 28) return MauiTileType.TennisCourt;
    if (x >= 2 && x <= 17 && (y === 22 || y === 29)) return MauiTileType.StonePath;
    if ((x === 2 || x === 17) && y >= 22 && y <= 29) return MauiTileType.StonePath;
    if (y >= 30) return MauiTileType.Asphalt;
    if (x >= 26 && x <= 38 && y >= 22 && y <= 29) return MauiTileType.Grass;
    return MauiTileType.Grass;
  });
});

export function isCompoundWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= COMPOUND_WIDTH || tileY < 0 || tileY >= COMPOUND_HEIGHT) return false;
  const tile = compoundTileGrid[tileY][tileX];
  if (tile === MauiTileType.HedgeWall) return false;
  if (tile === MauiTileType.TennisCourt) return false;
  if (tileX >= 14 && tileX <= 25 && tileY >= 1 && tileY <= 8) return false;
  return true;
}

export const COMPOUND_DECORATIONS = [
  { type: 'palm-tree', tileX: 2, tileY: 2 },
  { type: 'palm-tree', tileX: 6, tileY: 1 },
  { type: 'palm-tree', tileX: 12, tileY: 2 },
  { type: 'palm-tree', tileX: 28, tileY: 2 },
  { type: 'palm-tree', tileX: 34, tileY: 3 },
  { type: 'palm-tree', tileX: 28, tileY: 23 },
  { type: 'palm-tree', tileX: 33, tileY: 25 },
  { type: 'compound-lounge-chair', tileX: 3, tileY: 4 },
  { type: 'compound-lounge-chair', tileX: 5, tileY: 4 },
  { type: 'compound-lounge-chair', tileX: 7, tileY: 18 },
  { type: 'compound-lounge-chair', tileX: 26, tileY: 19 },
  { type: 'compound-lounge-chair', tileX: 28, tileY: 19 },
  { type: 'compound-patio-table', tileX: 30, tileY: 24 },
  { type: 'compound-patio-table', tileX: 34, tileY: 26 },
  { type: 'compound-tiki-torch', tileX: 27, tileY: 25 },
  { type: 'compound-tiki-torch', tileX: 36, tileY: 22 },
  { type: 'compound-flower-bed', tileX: 30, tileY: 3 },
  { type: 'compound-flower-bed', tileX: 34, tileY: 5 },
  { type: 'compound-flower-bed', tileX: 36, tileY: 27 },
  { type: 'compound-tennis-bench', tileX: 3, tileY: 29 },
  { type: 'compound-tennis-bench', tileX: 10, tileY: 29 },
  { type: 'compound-diving-board', tileX: 24, tileY: 15 },
  { type: 'compound-sign', tileX: 19, tileY: 9 },
  { type: 'maui-parkedcar', tileX: 4, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 10, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 28, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 35, tileY: 31 },
];

export const COMPOUND_BUILDINGS = [
  { name: 'airbnb-building', tileX: 14, tileY: 1, tileW: 12, tileH: 8 },
];

export const COMPOUND_NPCS: NPCDef[] = [
  {
    id: 'airbnb-host', tileX: 19, tileY: 9, behavior: 'idle',
    texture: 'npc-maui-greeter', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Maui Breeze! Make yourself at home.',
      "The pool's great this time of year!",
      "Don't forget to try the hot tub — you've earned it.",
    ]},
    facingDirection: 'down',
  },
  {
    id: 'pool-attendant', tileX: 32, tileY: 14, behavior: 'idle',
    texture: 'npc-lifeguard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'The pool is perfect for a dive!',
      'Careful on the deck, it can be slippery!',
    ]},
    facingDirection: 'left',
  },
  {
    id: 'tennis-player-npc', tileX: 9, tileY: 21, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Wanna hit some balls? Step onto the court!',
      'I play every morning before the heat kicks in.',
    ]},
    facingDirection: 'down',
  },
  {
    id: 'jacuzzi-relaxer', tileX: 5, tileY: 12, behavior: 'sit',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Ahhhh... the warm jets massage your tired muscles.',
      'So relaxing...',
      'You feel completely refreshed!',
    ]},
    facingDirection: 'down',
  },
];

export const COMPOUND_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'compound_exit',
    centerX: tileToWorld(19, 31).x,
    centerY: tileToWorld(19, 31).y,
    radius: 48,
    promptText: 'Leave compound',
  },
  {
    id: 'compound_tennis',
    centerX: tileToWorld(9, 22).x,
    centerY: tileToWorld(9, 22).y,
    radius: 64,
    promptText: 'Play Tennis?',
  },
  {
    id: 'compound_pool_dive',
    centerX: tileToWorld(27, 13).x,
    centerY: tileToWorld(27, 13).y,
    radius: 48,
    promptText: 'Dive in!',
  },
];
