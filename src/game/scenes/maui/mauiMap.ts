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
  // Airbnb compound additions
  StonePath = 9,
  WoodDeck = 10,
  TennisCourt = 11,
  Asphalt = 12,
  HedgeWall = 13,
  PoolEdge = 14,
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
    if (y >= 27) return MauiTileType.Ocean;
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
    if (y >= 27) return false;
    // Hotel building footprint
    if (x >= 22 && x <= 29 && y >= 4 && y <= 8) return false;
    // Restaurant building footprint
    if (x >= 10 && x <= 14 && y >= 15 && y <= 17) return false;
    // Lifeguard tower
    if (x === 1 && y === 16) return false;
    // Beach shack
    if (x >= 35 && x <= 36 && y >= 15 && y <= 16) return false;
    // Parked cars on sidewalk
    if ((x === 5 || x === 15 || x === 35) && y === 10) return false;
    // Taxi
    if (x === 40 && y === 10) return false;
    // Everything else walkable
    return true;
  });
});

/** Check if a Maui tile is walkable */
export function isMauiWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAUI_WIDTH || tileY < 0 || tileY >= MAUI_HEIGHT) return false;
  return mauiWalkGrid[tileY][tileX];
}

/** Get the tile type at a given position */
export function getMauiTileType(tileX: number, tileY: number): number {
  if (tileX < 0 || tileX >= MAUI_WIDTH || tileY < 0 || tileY >= MAUI_HEIGHT) return -1;
  return mauiTileGrid[tileY][tileX];
}

export const MAUI_DECORATIONS = [
  // Airbnb area
  { type: 'compound-preview', tileX: 37, tileY: 4 },
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
  // Beach — new decorations
  { type: 'sandcastle', tileX: 18, tileY: 19 },
  { type: 'beach-chair', tileX: 5, tileY: 18 },
  { type: 'beach-chair', tileX: 20, tileY: 17 },
  { type: 'beach-umbrella', tileX: 22, tileY: 17 },
  { type: 'beach-towel', tileX: 23, tileY: 18 },
  { type: 'beach-towel', tileX: 15, tileY: 19 },
  { type: 'volleyball-net', tileX: 28, tileY: 16 },
  { type: 'beach-shack', tileX: 35, tileY: 15 },
  { type: 'lifeguard-tower', tileX: 1, tileY: 16 },
  { type: 'shell', tileX: 12, tileY: 20 },
  { type: 'shell', tileX: 30, tileY: 19 },
  { type: 'palm-tree', tileX: 25, tileY: 14 },
  { type: 'palm-tree', tileX: 38, tileY: 14 },
  { type: 'surfboard', tileX: 32, tileY: 17 },
  // Restaurant area
  { type: 'palm-tree', tileX: 8, tileY: 16 },
  { type: 'palm-tree', tileX: 16, tileY: 16 },
  // Taxi
  { type: 'maui-taxi', tileX: 40, tileY: 10 },
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
    interactionData: { lines: ['Welcome to the Airbnb!', 'Head inside to rest up.'] },
    facingDirection: 'down',
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
  {
    id: 'lifeguard', tileX: 2, tileY: 16, behavior: 'idle',
    texture: 'npc-lifeguard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Stay safe out there!', 'Waves are looking good today.'] },
    facingDirection: 'down',
  },
  {
    id: 'beach-bar-attendant', tileX: 36, tileY: 14, behavior: 'idle',
    texture: 'npc-beach-bar', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Want a smoothie? Mango, pineapple, guava!'] },
    facingDirection: 'down',
  },
  { id: 'sandcastle-kid', tileX: 19, tileY: 19, behavior: 'sit', texture: 'npc-sandcastle-kid' },
  { id: 'beachgoer-3', tileX: 21, tileY: 18, behavior: 'sit', texture: 'npc-maui-tourist' },
  { id: 'shore-walker', tileX: 5, tileY: 21, behavior: 'walk', texture: 'npc-maui-local',
    walkPath: [{ x: 5, y: 21 }, { x: 30, y: 21 }] },
];

export const MAUI_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'maui_hotel',
    centerX: tileToWorld(26, 9).x,
    centerY: tileToWorld(26, 9).y,
    radius: 48,
    promptText: 'Tap to enter Airbnb',
  },
  {
    id: 'maui_airbnb',
    centerX: tileToWorld(37, 5).x,
    centerY: tileToWorld(37, 5).y,
    radius: 48,
    promptText: 'Enter Airbnb compound',
  },
  {
    id: 'maui_surfing',
    centerX: tileToWorld(10, 22).x,
    centerY: tileToWorld(10, 22).y,
    radius: 48,
    promptText: 'Tap to go Surfing',
  },
  {
    id: 'maui_taxi',
    centerX: tileToWorld(40, 10).x,
    centerY: tileToWorld(40, 10).y,
    radius: 48,
    promptText: 'Tap to take Taxi to Airport',
  },
];
