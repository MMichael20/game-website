// src/game/scenes/maui/MauiOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import {
  MAUI_WIDTH, MAUI_HEIGHT, mauiTileGrid, isMauiWalkable,
  MAUI_NPCS, MAUI_CHECKPOINT_ZONES, MAUI_DECORATIONS, MAUI_BUILDINGS,
  getMauiTileType, MauiTileType,
} from './mauiMap';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';

const BEACH_TILE_Y = 14;

export class MauiOverworldScene extends OverworldScene {
  private playerOnBeach = false;
  private partnerOnBeach = false;
  private waterSystem!: WaterEffectSystem;

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

  getLabelMap(): Record<string, string> {
    return {
      maui_hotel: 'Airbnb',
      maui_airbnb: 'Airbnb Compound',
      maui_surfing: 'Surf Spot',
      maui_taxi: 'Taxi',
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

    this.addWaveAnimations();
    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getMauiTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: (tileY) => tileY >= 25,
    });
    this.waterSystem.create();

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

  private addWaveAnimations(): void {
    const wavePositions = [
      { x: 3, y: 26 }, { x: 10, y: 26 }, { x: 18, y: 26 },
      { x: 26, y: 26 }, { x: 34, y: 26 }, { x: 42, y: 26 },
    ];

    wavePositions.forEach((wp, i) => {
      const pos = tileToWorld(wp.x, wp.y);
      const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
        .setDepth(-8)
        .setAlpha(0.6);

      this.tweens.add({
        targets: wave,
        x: pos.x + 16,
        alpha: 0.25,
        duration: 2000 + i * 200,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
        delay: i * 300,
      });
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Beach swimsuit detection (zone-based, NOT water-tile-based)
    const playerTileY = Math.floor(this.player.sprite.y / TILE_SIZE);
    if (playerTileY >= BEACH_TILE_Y && !this.playerOnBeach) {
      this.playerOnBeach = true;
      this.player.setTemporaryTexture('player-swimsuit', this);
    } else if (playerTileY < BEACH_TILE_Y && this.playerOnBeach) {
      this.playerOnBeach = false;
      this.player.restoreTexture(this);
    }

    const partnerTileY = Math.floor(this.partner.sprite.y / TILE_SIZE);
    if (partnerTileY >= BEACH_TILE_Y && !this.partnerOnBeach) {
      this.partnerOnBeach = true;
      this.partner.setTemporaryTexture('partner-swimsuit', this);
    } else if (partnerTileY < BEACH_TILE_Y && this.partnerOnBeach) {
      this.partnerOnBeach = false;
      this.partner.restoreTexture(this);
    }

    // Water overlay effects
    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    if (zone.id === 'maui_hotel') {
      this.fadeToScene('MauiHotelScene', { returnX: pos.x, returnY: pos.y });
    } else if (zone.id === 'maui_airbnb') {
      this.fadeToScene('AirbnbCompoundScene', { returnX: pos.x, returnY: pos.y });
    } else if (zone.id === 'maui_surfing') {
      uiManager.showNPCDialog(['Cowabunga! You caught a gnarly wave!'], () => {
        uiManager.hideNPCDialog();
      });
    } else if (zone.id === 'maui_taxi') {
      uiManager.showNPCDialog(
        ['Ready to head to the airport?', 'Hang loose! Enjoy your flight home!'],
        () => {
          uiManager.hideNPCDialog();
          uiManager.hideHUD();
          uiManager.hideInteractionPrompt();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 500, ease: 'Linear',
            onComplete: () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            },
          });
        },
      );
    }
  }

  shutdown(): void {
    if (this.playerOnBeach) {
      this.player.restoreTexture(this);
      this.playerOnBeach = false;
    }
    if (this.partnerOnBeach) {
      this.partner.restoreTexture(this);
      this.partnerOnBeach = false;
    }
    this.waterSystem.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op for now
  }
}
