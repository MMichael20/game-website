// src/game/scenes/maui/AirbnbCompoundScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import {
  COMPOUND_WIDTH, COMPOUND_HEIGHT, compoundTileGrid, isCompoundWalkable,
  getCompoundTileType, COMPOUND_NPCS, COMPOUND_CHECKPOINT_ZONES,
  COMPOUND_DECORATIONS, COMPOUND_BUILDINGS,
} from './airbnbCompoundMap';

interface CompoundReturnData {
  returnX?: number;
  returnY?: number;
}

export class AirbnbCompoundScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;
  private returnPos: CompoundReturnData = {};
  private playerInWater = false;
  private partnerInWater = false;

  constructor() {
    super({ key: 'AirbnbCompoundScene' });
  }

  init(data?: any): void {
    super.init(data);
    if (data?.returnX != null && data?.returnY != null && !data?.returnFromInterior) {
      this.returnPos = { returnX: data.returnX, returnY: data.returnY };
    } else {
      this.returnPos = {};
    }
  }

  getConfig(): OverworldConfig {
    // Spawn position priority:
    // 1. OverworldScene.init() handles returnFromInterior (exit checkpoint uses this)
    // 2. returnPos from minigame return (e.g., tennis → compound)
    // 3. Default: parking area tile (19, 30)
    const spawnPos = this.returnPos.returnX
      ? { x: this.returnPos.returnX, y: this.returnPos.returnY! }
      : tileToWorld(19, 30);

    return {
      mapWidth: COMPOUND_WIDTH,
      mapHeight: COMPOUND_HEIGHT,
      tileGrid: compoundTileGrid,
      walkCheck: isCompoundWalkable,
      npcs: COMPOUND_NPCS,
      checkpointZones: COMPOUND_CHECKPOINT_ZONES,
      spawnX: spawnPos.x,
      spawnY: spawnPos.y,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      compound_exit: 'Exit',
      compound_tennis: 'Tennis',
      compound_pool_dive: 'Pool',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('AirbnbCompoundScene');
  }

  onCreateExtras(): void {
    COMPOUND_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    COMPOUND_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getCompoundTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
    });
    this.waterSystem.create();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Swimsuit swap when stepping on water tiles (pool/jacuzzi)
    const ptx = Math.floor(this.player.sprite.x / TILE_SIZE);
    const pty = Math.floor(this.player.sprite.y / TILE_SIZE);
    const playerOnWater = getCompoundTileType(ptx, pty) === MauiTileType.ShallowWater;
    if (playerOnWater && !this.playerInWater) {
      this.playerInWater = true;
      this.player.setTemporaryTexture('player-swimsuit', this);
    } else if (!playerOnWater && this.playerInWater) {
      this.playerInWater = false;
      this.player.restoreTexture(this);
    }

    const patx = Math.floor(this.partner.sprite.x / TILE_SIZE);
    const paty = Math.floor(this.partner.sprite.y / TILE_SIZE);
    const partnerOnWater = getCompoundTileType(patx, paty) === MauiTileType.ShallowWater;
    if (partnerOnWater && !this.partnerInWater) {
      this.partnerInWater = true;
      this.partner.setTemporaryTexture('partner-swimsuit', this);
    } else if (!partnerOnWater && this.partnerInWater) {
      this.partnerInWater = false;
      this.partner.restoreTexture(this);
    }

    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();

    if (zone.id === 'compound_exit') {
      this.fadeToScene('MauiOverworldScene', {
        returnFromInterior: true,
        returnX: tileToWorld(37, 5).x,
        returnY: tileToWorld(37, 5).y,
      });
    } else if (zone.id === 'compound_tennis') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TennisScene', {
        returnScene: 'AirbnbCompoundScene',
        returnX: pos.x,
        returnY: pos.y,
      });
    } else if (zone.id === 'compound_pool_dive') {
      uiManager.showNPCDialog(
        ['The diving board bounces invitingly...', 'Pool dive minigame coming soon!'],
        () => { uiManager.hideNPCDialog(); },
      );
    }
  }

  shutdown(): void {
    if (this.playerInWater) {
      this.player.restoreTexture(this);
      this.playerInWater = false;
    }
    if (this.partnerInWater) {
      this.partner.restoreTexture(this);
      this.partnerInWater = false;
    }
    this.waterSystem.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op
  }
}
