// src/game/scenes/budapest/BudapestOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import {
  BUDAPEST_WIDTH, BUDAPEST_HEIGHT, budapestTileGrid, isBudapestWalkable,
  BUDAPEST_NPCS, BUDAPEST_CHECKPOINT_ZONES, BUDAPEST_DECORATIONS, BUDAPEST_BUILDINGS,
  getBudapestTileType, BudapestTileType,
} from './budapestMap';

export class BudapestOverworldScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;

  constructor() {
    super({ key: 'BudapestOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: BUDAPEST_WIDTH,
      mapHeight: BUDAPEST_HEIGHT,
      tileGrid: budapestTileGrid,
      walkCheck: isBudapestWalkable,
      npcs: BUDAPEST_NPCS,
      checkpointZones: BUDAPEST_CHECKPOINT_ZONES,
      spawnX: 27 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 19 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'budapest-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      bp_eye: 'Budapest Eye',
      bp_airbnb: 'Airbnb',
      bp_jewish_quarter: 'Jewish Quarter',
      bp_tram_stop_north: 'Tram Stop',
      bp_tram_stop_south: 'Tram Stop',
      bp_restaurant_1: 'Goulash House',
      bp_restaurant_2: 'Chimney Cake',
      bp_parliament: 'Parliament',
      bp_chain_bridge: 'Chain Bridge',
      bp_fishermans_bastion: 'Fisherman\'s Bastion',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestOverworldScene');
  }

  onCreateExtras(): void {
    // Decorations
    BUDAPEST_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    // Buildings
    BUDAPEST_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    // Water system for Danube
    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getBudapestTileType,
      waterTileValue: BudapestTileType.Water,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: () => true,
    });
    this.waterSystem.create();

    this.addDanubeWaves();
    this.addVehicles();
    this.addPigeons();
  }

  private addDanubeWaves(): void {
    for (const wy of [10, 11, 12]) {
      for (let wx = 0; wx < BUDAPEST_WIDTH; wx += 8) {
        const pos = tileToWorld(wx, wy);
        const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
          .setDepth(-8)
          .setAlpha(0.4);

        this.tweens.add({
          targets: wave,
          x: pos.x + 12,
          alpha: 0.15,
          duration: 2500 + Math.random() * 500,
          ease: 'Sine.easeInOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 1000,
        });
      }
    }
  }

  private addVehicles(): void {
    const mapPxW = BUDAPEST_WIDTH * TILE_SIZE;
    const defs = [
      { key: 'budapest-tram', y: 17, dir: 1, delay: 0, dur: 20000 },
      { key: 'budapest-tram', y: 17, dir: -1, delay: 10000, dur: 22000 },
      { key: 'budapest-bus', y: 16, dir: 1, delay: 5000, dur: 15000 },
      { key: 'budapest-bus', y: 18, dir: -1, delay: 12000, dur: 18000 },
      { key: 'budapest-car-blue', y: 16, dir: 1, delay: 0, dur: 12000 },
      { key: 'budapest-car-red', y: 18, dir: -1, delay: 3000, dur: 10000 },
      { key: 'budapest-car-white', y: 16, dir: 1, delay: 7000, dur: 11000 },
      { key: 'budapest-car-gray', y: 18, dir: -1, delay: 9000, dur: 13000 },
      { key: 'budapest-car-red', y: 14, dir: 1, delay: 2000, dur: 14000 },
      { key: 'budapest-car-blue', y: 14, dir: -1, delay: 8000, dur: 16000 },
    ];

    defs.forEach(d => {
      const worldY = d.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = d.dir > 0 ? -80 : mapPxW + 80;
      const endX = d.dir > 0 ? mapPxW + 80 : -80;
      const v = this.add.sprite(startX, worldY, d.key).setDepth(-3);
      if (d.dir < 0) v.setFlipX(true);

      this.time.delayedCall(d.delay, () => {
        this.tweens.add({
          targets: v,
          x: endX,
          duration: d.dur,
          ease: 'Linear',
          repeat: -1,
          onRepeat: () => { v.x = startX; },
        });
      });
    });
  }

  private addPigeons(): void {
    for (let i = 0; i < 5; i++) {
      const px = (25 + Math.random() * 4) * TILE_SIZE;
      const py = (20 + Math.random() * 2) * TILE_SIZE;
      const p = this.add.image(px, py, 'deco-bp-pigeon')
        .setDepth(-6)
        .setAlpha(0.8);

      this.tweens.add({
        targets: p,
        x: px + (Math.random() - 0.5) * 64,
        y: py + (Math.random() - 0.5) * 32,
        duration: 3000 + Math.random() * 2000,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2000,
      });
    }
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();

    switch (zone.id) {
      case 'bp_eye':
        this.fadeToScene('BudapestEyeScene');
        break;

      case 'bp_airbnb':
        this.fadeToScene('BudapestAirbnbScene', { returnX: pos.x, returnY: pos.y });
        break;

      case 'bp_jewish_quarter':
        this.fadeToScene('JewishQuarterScene');
        break;

      case 'bp_tram_stop_north':
      case 'bp_tram_stop_south':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y });
        break;

      case 'bp_restaurant_1':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Welcome to Goulash House!', 'Try our famous Hungarian goulash!', 'The lángos with sour cream is incredible today.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_restaurant_2':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Budapest\'s best chimney cake shop!', 'Cinnamon, chocolate, or walnut?', 'Fresh off the spit — enjoy!'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_parliament':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Hungarian Parliament Building.', 'Neo-Gothic masterpiece, completed in 1904.', 'It houses the Holy Crown of Hungary.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_chain_bridge':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['The Széchenyi Chain Bridge.', 'First permanent bridge across the Danube, built in 1849.', 'It connects Buda and Pest — two cities that became one.'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;

      case 'bp_fishermans_bastion':
        this.inputSystem.freeze();
        uiManager.showNPCDialog(
          ['Fisherman\'s Bastion.', 'Seven towers for the seven Magyar chieftains who founded Hungary.', 'The view from here is breathtaking!'],
          () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); },
        );
        break;
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.waterSystem.update(this.player, this.partner);
  }

  shutdown(): void {
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op for now
  }
}
