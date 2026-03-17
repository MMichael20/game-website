// src/game/scenes/maui/sunBeachMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export const SUNBEACH_WIDTH = 30;
export const SUNBEACH_HEIGHT = 20;

export function getSunBeachTileType(x: number, y: number): number {
  if (x < 0 || x >= SUNBEACH_WIDTH || y < 0 || y >= SUNBEACH_HEIGHT) return -1;
  return sunBeachTileGrid[y][x];
}

export const sunBeachTileGrid: number[][] = Array.from({ length: SUNBEACH_HEIGHT }, (_, y) => {
  return Array.from({ length: SUNBEACH_WIDTH }, (_, x) => {
    if (y <= 1) return MauiTileType.Asphalt;
    if (y <= 3) return MauiTileType.Grass;
    if (y <= 10) return MauiTileType.Sand;
    if (y <= 14) return MauiTileType.ShallowWater;
    return MauiTileType.Ocean;
  });
});

export function isSunBeachWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= SUNBEACH_WIDTH || tileY < 0 || tileY >= SUNBEACH_HEIGHT) return false;
  // Left and right border walls
  if (tileX <= 0 || tileX >= 29) return false;
  // Deep ocean not walkable
  if (tileY >= 15) return false;
  // Parked cars block movement
  if ((tileX === 14 || tileX === 16) && tileY === 0) return false;
  return true;
}

export const SUNBEACH_DECORATIONS = [
  { type: 'sun-beach-sign', tileX: 13, tileY: 3 },
  { type: 'turtle-nest', tileX: 4, tileY: 6 },
  { type: 'turtle-nest', tileX: 18, tileY: 5 },
  { type: 'beach-grass', tileX: 1, tileY: 3 },
  { type: 'beach-grass', tileX: 28, tileY: 3 },
  { type: 'beach-grass', tileX: 3, tileY: 4 },
  { type: 'beach-grass', tileX: 26, tileY: 4 },
  { type: 'driftwood', tileX: 10, tileY: 9 },
  { type: 'driftwood', tileX: 22, tileY: 10 },
  { type: 'palm-tree', tileX: 0, tileY: 2 },
  { type: 'palm-tree', tileX: 29, tileY: 2 },
  { type: 'palm-tree', tileX: 7, tileY: 3 },
  { type: 'palm-tree', tileX: 23, tileY: 3 },
  { type: 'beach-umbrella', tileX: 16, tileY: 7 },
  { type: 'beach-towel', tileX: 17, tileY: 8 },
  { type: 'maui-parkedcar', tileX: 14, tileY: 0 },
  { type: 'maui-parkedcar', tileX: 16, tileY: 0 },
];

export const SUNBEACH_NPCS: NPCDef[] = [
  {
    id: 'turtle-sand-1', tileX: 8, tileY: 6, behavior: 'walk',
    texture: 'npc-turtle', walkPath: [{ x: 8, y: 6 }, { x: 14, y: 6 }], speed: 15,
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['*The turtle slowly looks at you*', 'It seems unbothered by your presence.'] },
  },
  {
    id: 'turtle-sand-2', tileX: 20, tileY: 8, behavior: 'idle',
    texture: 'npc-turtle', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['*The turtle is sunbathing*', 'Living its best life.'] },
  },
  {
    id: 'turtle-water-1', tileX: 12, tileY: 12, behavior: 'walk',
    texture: 'npc-turtle-water', walkPath: [{ x: 10, y: 12 }, { x: 18, y: 12 }], speed: 20,
  },
  {
    id: 'turtle-water-2', tileX: 22, tileY: 13, behavior: 'walk',
    texture: 'npc-turtle-water', walkPath: [{ x: 20, y: 13 }, { x: 26, y: 13 }], speed: 25,
  },
  {
    id: 'nature-guide-npc', tileX: 5, tileY: 4, behavior: 'idle',
    texture: 'npc-nature-guide', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Welcome to Sun Beach!', 'This is a protected nesting area for green sea turtles.', 'Please enjoy from a respectful distance.'] },
  },
  {
    id: 'tourist-camera-npc', tileX: 24, tileY: 7, behavior: 'idle',
    texture: 'npc-tourist-camera', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ["I've been trying to get the perfect photo all day!", 'These turtles are amazing.'] },
  },
];

export const SUNBEACH_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'sunbeach_exit',
    centerX: tileToWorld(15, 0).x,
    centerY: tileToWorld(15, 0).y,
    radius: 48,
    promptText: 'Return to Car',
  },
  {
    id: 'sunbeach_turtle_game',
    centerX: tileToWorld(5, 5).x,
    centerY: tileToWorld(5, 5).y,
    radius: 64,
    promptText: 'Play Turtle Rescue?',
  },
];
