// src/game/scenes/maui/MauiOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
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
      spawnX: 38 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 2 * TILE_SIZE + TILE_SIZE / 2,
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

    // Driving cars (visual-only, not NPCs)
    const mapPxWidth = MAUI_WIDTH * TILE_SIZE;
    const carDefs = [
      { key: 'car-red',   y: 12, direction: 1,  delay: 0 },
      { key: 'car-blue',  y: 11, direction: -1, delay: 3000 },
      { key: 'car-white', y: 13, direction: 1,  delay: 6000 },
    ];

    carDefs.forEach(def => {
      const worldY = def.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = def.direction > 0 ? -48 : mapPxWidth + 48;
      const endX = def.direction > 0 ? mapPxWidth + 48 : -48;
      const car = this.add.sprite(startX, worldY, def.key).setDepth(-3);
      if (def.direction < 0) car.setFlipX(true);

      this.time.delayedCall(def.delay, () => {
        this.tweens.add({
          targets: car,
          x: endX,
          duration: 10000,
          ease: 'Linear',
          repeat: -1,
          onRepeat: () => { car.x = startX; },
        });
      });
    });
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    if (zone.id === 'maui_hotel') {
      this.fadeToScene('MauiHotelScene', { returnX: pos.x, returnY: pos.y });
    } else if (zone.id === 'maui_tennis') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TennisScene', { returnScene: 'MauiOverworldScene' });
    }
  }

  protected onBack(): void {
    // No-op for now
  }
}
