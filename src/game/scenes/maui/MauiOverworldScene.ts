// src/game/scenes/maui/MauiOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import {
  MAUI_WIDTH, MAUI_HEIGHT, mauiTileGrid, isMauiWalkable,
  MAUI_NPCS, MAUI_CHECKPOINT_ZONES, MAUI_DECORATIONS, MAUI_BUILDINGS,
} from './mauiMap';

export class MauiOverworldScene extends OverworldScene {
  constructor() {
    super({ key: 'MauiOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: MAUI_WIDTH,
      mapHeight: MAUI_HEIGHT,
      tileGrid: mauiTileGrid,
      walkCheck: isMauiWalkable,
      npcs: MAUI_NPCS,
      checkpointZones: MAUI_CHECKPOINT_ZONES,
      spawnX: 24 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 10 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'maui-terrain',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiOverworldScene');
  }

  onCreateExtras(): void {
    // Decorations
    MAUI_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    // Buildings
    MAUI_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });
  }

  onEnterCheckpoint(_zone: CheckpointZone): void {
    // No checkpoint zones in Maui yet — return handled by NPC cutscene-trigger
  }

  protected onBack(): void {
    // No-op for now
  }
}
