// src/game/scenes/maui/hanaPulloverLayouts.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export type HanaStop = 'waterfall' | 'bamboo' | 'blacksand';

export interface HanaPulloverLayout {
  width: number;
  height: number;
  tileGrid: number[][];
  walkCheck: (x: number, y: number) => boolean;
  getTileType: (x: number, y: number) => number;
  npcs: NPCDef[];
  checkpointZones: CheckpointZone[];
  decorations: Array<{ type: string; tileX: number; tileY: number }>;
  buildings: Array<{ name: string; tileX: number; tileY: number; tileW: number; tileH: number }>;
}

export function getHanaPulloverLayout(stop: HanaStop): HanaPulloverLayout {
  switch (stop) {
    case 'waterfall': return getWaterfallLayout();
    case 'bamboo': return getBambooLayout();
    case 'blacksand': return getBlackSandLayout();
  }
}

function getWaterfallLayout(): HanaPulloverLayout {
  const width = 20;
  const height = 15;

  const tileGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (y <= 2) return MauiTileType.Stone;
      if (y >= 3 && y <= 5 && x >= 7 && x <= 12) return MauiTileType.ShallowWater;
      if (x === 10 && y >= 6 && y <= 14) return MauiTileType.StonePath;
      return MauiTileType.Grass;
    })
  );

  const walkCheck = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    if (y <= 2) return false;
    return true;
  };

  const getTileType = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return MauiTileType.Grass;
    return tileGrid[y][x];
  };

  const npcs: NPCDef[] = [
    {
      id: 'hiker',
      tileX: 6,
      tileY: 8,
      behavior: 'idle',
      texture: 'npc-hiker',
      interactable: true,
      onInteract: 'dialog',
      interactionData: {
        lines: ["What a view!", "The mist from the falls is so refreshing."],
      },
    },
  ];

  const exitPos = tileToWorld(10, 14);
  const checkpointZones: CheckpointZone[] = [
    {
      id: 'hana_return',
      centerX: exitPos.x,
      centerY: exitPos.y,
      radius: 48,
      promptText: 'Return to Car',
    },
  ];

  const decorations = [
    { type: 'waterfall', tileX: 8, tileY: 0 },
    { type: 'mossy-rock', tileX: 4, tileY: 5 },
    { type: 'mossy-rock', tileX: 14, tileY: 4 },
    { type: 'palm-tree', tileX: 2, tileY: 10 },
    { type: 'palm-tree', tileX: 17, tileY: 8 },
  ];

  return { width, height, tileGrid, walkCheck, getTileType, npcs, checkpointZones, decorations, buildings: [] };
}

function getBambooLayout(): HanaPulloverLayout {
  const width = 20;
  const height = 15;

  const tileGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      // Winding stone path: x=10 for y=14-10
      if (x === 10 && y >= 10 && y <= 14) return MauiTileType.StonePath;
      // x=10-12 for y=10 (horizontal segment)
      if (y === 10 && x >= 10 && x <= 12) return MauiTileType.StonePath;
      // x=12 for y=6-10
      if (x === 12 && y >= 6 && y <= 10) return MauiTileType.StonePath;
      // x=8-12 for y=6 (horizontal segment)
      if (y === 6 && x >= 8 && x <= 12) return MauiTileType.StonePath;
      // x=8 for y=2-6
      if (x === 8 && y >= 2 && y <= 6) return MauiTileType.StonePath;
      return MauiTileType.Grass;
    })
  );

  const walkCheck = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return true;
  };

  const getTileType = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return MauiTileType.Grass;
    return tileGrid[y][x];
  };

  const npcs: NPCDef[] = [
    {
      id: 'trail-guide',
      tileX: 12,
      tileY: 7,
      behavior: 'idle',
      texture: 'npc-trail-guide',
      interactable: true,
      onInteract: 'dialog',
      interactionData: {
        lines: ["This bamboo forest is over 100 years old.", "Listen to the wind through the stalks..."],
      },
    },
  ];

  const exitPos = tileToWorld(10, 14);
  const checkpointZones: CheckpointZone[] = [
    {
      id: 'hana_return',
      centerX: exitPos.x,
      centerY: exitPos.y,
      radius: 48,
      promptText: 'Return to Car',
    },
  ];

  const decorations = [
    { type: 'bamboo-stalk', tileX: 4, tileY: 3 },
    { type: 'bamboo-stalk', tileX: 6, tileY: 5 },
    { type: 'bamboo-stalk', tileX: 3, tileY: 8 },
    { type: 'bamboo-stalk', tileX: 14, tileY: 2 },
    { type: 'bamboo-stalk', tileX: 16, tileY: 4 },
    { type: 'bamboo-stalk', tileX: 15, tileY: 9 },
    { type: 'bamboo-stalk', tileX: 5, tileY: 11 },
    { type: 'bamboo-stalk', tileX: 17, tileY: 7 },
    { type: 'hana-sign', tileX: 10, tileY: 13 },
  ];

  return { width, height, tileGrid, walkCheck, getTileType, npcs, checkpointZones, decorations, buildings: [] };
}

function getBlackSandLayout(): HanaPulloverLayout {
  const width = 20;
  const height = 15;

  const tileGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, _x) => {
      if (y <= 7) return MauiTileType.BlackSand;
      if (y >= 8 && y <= 10) return MauiTileType.ShallowWater;
      return MauiTileType.Ocean;
    })
  );

  const walkCheck = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    if (y >= 11) return false;
    return true;
  };

  const getTileType = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return MauiTileType.BlackSand;
    return tileGrid[y][x];
  };

  const npcs: NPCDef[] = [
    {
      id: 'geologist',
      tileX: 12,
      tileY: 3,
      behavior: 'idle',
      texture: 'npc-geologist',
      interactable: true,
      onInteract: 'dialog',
      interactionData: {
        lines: ["This black sand comes from volcanic basalt.", "It takes thousands of years to form!"],
      },
    },
  ];

  const exitPos = tileToWorld(10, 0);
  const checkpointZones: CheckpointZone[] = [
    {
      id: 'hana_return',
      centerX: exitPos.x,
      centerY: exitPos.y,
      radius: 48,
      promptText: 'Return to Car',
    },
  ];

  const decorations = [
    { type: 'volcanic-rock', tileX: 3, tileY: 2 },
    { type: 'volcanic-rock', tileX: 15, tileY: 4 },
    { type: 'volcanic-rock', tileX: 8, tileY: 6 },
    { type: 'driftwood-hana', tileX: 6, tileY: 1 },
    { type: 'driftwood-hana', tileX: 14, tileY: 5 },
  ];

  return { width, height, tileGrid, walkCheck, getTileType, npcs, checkpointZones, decorations, buildings: [] };
}
