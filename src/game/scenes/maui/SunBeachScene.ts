// src/game/scenes/maui/SunBeachScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import {
  SUNBEACH_WIDTH, SUNBEACH_HEIGHT, sunBeachTileGrid, isSunBeachWalkable,
  getSunBeachTileType, SUNBEACH_NPCS, SUNBEACH_CHECKPOINT_ZONES,
  SUNBEACH_DECORATIONS,
} from './sunBeachMap';

const BEACH_TILE_Y = 4;

export class SunBeachScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;
  private returnX?: number;
  private returnY?: number;
  private playerOnBeach = false;
  private partnerOnBeach = false;

  constructor() {
    super({ key: 'SunBeachScene' });
  }

  init(data?: any): void {
    super.init(data);
    this.playerOnBeach = false;
    this.partnerOnBeach = false;
    // Store return position for DrivingScene
    if (data?.returnX != null && !data?.returnFromInterior) {
      this.returnX = data.returnX;
      this.returnY = data.returnY;
    }
  }

  getConfig(): OverworldConfig {
    // Use return position if coming back from minigame, else default to parking
    const spawnPos = this.returnX != null
      ? { x: this.returnX!, y: this.returnY! }
      : tileToWorld(15, 1);

    return {
      mapWidth: SUNBEACH_WIDTH,
      mapHeight: SUNBEACH_HEIGHT,
      tileGrid: sunBeachTileGrid,
      walkCheck: isSunBeachWalkable,
      npcs: SUNBEACH_NPCS,
      checkpointZones: SUNBEACH_CHECKPOINT_ZONES,
      spawnX: spawnPos.x,
      spawnY: spawnPos.y,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      sunbeach_exit: 'Car',
      sunbeach_turtle_game: 'Turtle Rescue',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('SunBeachScene');
  }

  onCreateExtras(): void {
    SUNBEACH_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });

    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getSunBeachTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: (tileY) => tileY >= 15,
    });
    this.waterSystem.create();

    // Wave animations along shore (reuse existing deco-wave-foam texture from MauiTextures)
    for (let i = 0; i < 6; i++) {
      const pos = tileToWorld(i * 5 + 2, 14);
      const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
        .setDepth(-8).setAlpha(0.6);
      this.tweens.add({
        targets: wave, x: pos.x + 16, alpha: 0.25,
        duration: 2000 + i * 200, ease: 'Sine.easeInOut',
        repeat: -1, yoyo: true, delay: i * 300,
      });
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Swimsuit swap at beach zone (y >= BEACH_TILE_Y)
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

    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    if (zone.id === 'sunbeach_exit') {
      this.fadeToScene('DrivingScene', {
        returnX: this.returnX,
        returnY: this.returnY,
      });
    } else if (zone.id === 'sunbeach_turtle_game') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TurtleRescueScene', {
        returnScene: 'SunBeachScene',
        returnX: pos.x,
        returnY: pos.y,
      });
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
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void { /* no-op */ }
}
