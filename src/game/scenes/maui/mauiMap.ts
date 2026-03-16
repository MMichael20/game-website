// src/game/scenes/maui/mauiMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';

export const MAUI_WIDTH = 45;
export const MAUI_HEIGHT = 30;

export const enum MauiTileType {
  Sand = 0,
  SandStone = 1,
  Stone = 2,
  ShallowWater = 3,
  Ocean = 4,
  Grass = 5,
  Road = 6,
  ParkingLot = 7,
  Sidewalk = 8,
}

// 45×30 tile grid — row-major: mauiTileGrid[y][x]
export const mauiTileGrid: number[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    // 1. Parking lot: top-right corner
    if (x >= 35 && y >= 0 && y <= 5) return MauiTileType.ParkingLot;
    // 2. Sidewalk row
    if (y === 10) return MauiTileType.Sidewalk;
    // 3. Road
    if (y >= 11 && y <= 13) return MauiTileType.Road;
    // 4. Ocean
    if (y >= 25) return MauiTileType.Ocean;
    // 5. Shallow water (left side)
    if (y >= 21 && x <= 20) return MauiTileType.ShallowWater;
    // 6. Shallow water (center)
    if (y >= 23) return MauiTileType.ShallowWater;
    // 7. Sand
    if (y >= 14) return MauiTileType.Sand;
    // 8. SandStone — hotel plaza
    if (x >= 21 && x <= 30 && y >= 3 && y <= 9) return MauiTileType.SandStone;
    // 9. Stone paths
    //    Horizontal path at y=5 from x=3 to x=32
    if (y === 5 && x >= 3 && x <= 32) return MauiTileType.Stone;
    //    Vertical path at x=15, y=3..9
    if (x === 15 && y >= 3 && y <= 9) return MauiTileType.Stone;
    //    Vertical path at x=33, y=3..9
    if (x === 33 && y >= 3 && y <= 9) return MauiTileType.Stone;
    // 10. Default: Grass
    return MauiTileType.Grass;
  });
});

// Walkability grid — true = passable
export const mauiWalkGrid: boolean[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    // Map borders
    if (x === 0 || x === 44 || y === 0 || y === 29) return false;
    // Ocean
    if (y >= 25) return false;
    // Hotel building footprint
    if (x >= 22 && x <= 29 && y >= 4 && y <= 8) return false;
    // Restaurant building footprint
    if (x >= 10 && x <= 14 && y >= 15 && y <= 17) return false;
    // Jacuzzi
    if (x >= 34 && x <= 35 && y >= 3 && y <= 4) return false;
    // Parked cars on sidewalk
    if ((x === 5 || x === 15 || x === 35) && y === 10) return false;
    // Everything else walkable
    return true;
  });
});

/** Check if a Maui tile is walkable */
export function isMauiWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAUI_WIDTH || tileY < 0 || tileY >= MAUI_HEIGHT) return false;
  return mauiWalkGrid[tileY][tileX];
}

export const MAUI_DECORATIONS = [
  // Airbnb area
  { type: 'maui-jacuzzi', tileX: 34, tileY: 3 },
  { type: 'maui-tenniscourt', tileX: 38, tileY: 6 },
  { type: 'maui-parkedcar', tileX: 36, tileY: 1 },
  { type: 'maui-parkedcar', tileX: 39, tileY: 1 },
  { type: 'palm-tree', tileX: 33, tileY: 1 },
  { type: 'palm-tree', tileX: 33, tileY: 7 },
  // Hotel area
  { type: 'palm-tree', tileX: 20, tileY: 5 },
  { type: 'palm-tree', tileX: 31, tileY: 5 },
  // Road — static parked cars
  { type: 'maui-parkedcar', tileX: 5, tileY: 10 },
  { type: 'maui-parkedcar', tileX: 15, tileY: 10 },
  { type: 'maui-parkedcar', tileX: 35, tileY: 10 },
  // Beach
  { type: 'palm-tree', tileX: 2, tileY: 15 },
  { type: 'palm-tree', tileX: 8, tileY: 14 },
  { type: 'beach-umbrella', tileX: 4, tileY: 17 },
  { type: 'beach-towel', tileX: 6, tileY: 18 },
  { type: 'surfboard', tileX: 10, tileY: 17 },
  // Restaurant area
  { type: 'palm-tree', tileX: 8, tileY: 16 },
  { type: 'palm-tree', tileX: 16, tileY: 16 },
];

export const MAUI_BUILDINGS = [
  { name: 'maui-hotel', tileX: 22, tileY: 4, tileW: 8, tileH: 5 },
  { name: 'maui-restaurant', tileX: 10, tileY: 15, tileW: 5, tileH: 3 },
];

export const MAUI_NPCS: NPCDef[] = [
  {
    id: 'restaurant-owner', tileX: 12, tileY: 14, behavior: 'idle',
    texture: 'npc-maui-restaurant', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome! Best curry on the island.', 'We have been here for 20 years. Aloha!'] },
    facingDirection: 'down',
  },
  {
    id: 'hotel-greeter', tileX: 25, tileY: 10, behavior: 'idle',
    texture: 'npc-maui-greeter', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to the hotel!', 'Head inside to rest up.'] },
    facingDirection: 'down',
  },
  {
    id: 'jacuzzi-npc', tileX: 34, tileY: 5, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['This jacuzzi is amazing!', 'So relaxing after a day at the beach...', 'Ahhh...'] },
    facingDirection: 'up',
  },
  {
    id: 'airbnb-neighbor', tileX: 37, tileY: 5, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Hey neighbor! This Airbnb is great, right?', 'Have you tried the tennis court?'] },
    facingDirection: 'left',
  },
  {
    id: 'beach-surfer', tileX: 7, tileY: 17, behavior: 'idle',
    texture: 'npc-surfer', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ["Surf's up, brah!", 'Maui has the best breaks in all of Hawaii.'] },
    facingDirection: 'down',
  },
  { id: 'maui-walker-1', tileX: 16, tileY: 5, behavior: 'walk', texture: 'npc-maui-local',
    walkPath: [{ x: 12, y: 5 }, { x: 20, y: 5 }] },
  { id: 'beachgoer-1', tileX: 3, tileY: 17, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'beachgoer-2', tileX: 14, tileY: 18, behavior: 'sit', texture: 'npc-traveler-2' },
];

export const MAUI_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'maui_hotel',
    centerX: tileToWorld(26, 9).x,
    centerY: tileToWorld(26, 9).y,
    radius: 48,
    promptText: 'Tap to enter Hotel',
  },
  {
    id: 'maui_tennis',
    centerX: tileToWorld(40, 8).x,
    centerY: tileToWorld(40, 8).y,
    radius: 64,
    promptText: 'Tap to play Tennis',
  },
];
