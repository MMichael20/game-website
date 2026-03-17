// src/game/scenes/maui/HanaPulloverScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import { getHanaPulloverLayout, HanaStop } from './hanaPulloverLayouts';

export class HanaPulloverScene extends OverworldScene {
  private stop: HanaStop = 'waterfall';
  private resumeSegment = 0;
  private returnX?: number;
  private returnY?: number;
  private waterSystem!: WaterEffectSystem;

  constructor() {
    super({ key: 'HanaPulloverScene' });
  }

  init(data?: any): void {
    super.init(data);
    this.stop = data?.stop ?? 'waterfall';
    this.resumeSegment = data?.resumeSegment ?? 0;
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  getConfig(): OverworldConfig {
    const layout = getHanaPulloverLayout(this.stop);
    const exitZone = layout.checkpointZones[0];
    return {
      mapWidth: layout.width,
      mapHeight: layout.height,
      tileGrid: layout.tileGrid,
      walkCheck: layout.walkCheck,
      npcs: layout.npcs,
      checkpointZones: layout.checkpointZones,
      spawnX: exitZone.centerX,
      spawnY: exitZone.centerY,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return { hana_return: 'Car' };
  }

  create(): void {
    super.create();
    saveCurrentScene('HanaDrivingScene');
  }

  onCreateExtras(): void {
    const layout = getHanaPulloverLayout(this.stop);
    layout.decorations.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });
    layout.buildings.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });

    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: layout.getTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
    });
    this.waterSystem.create();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    if (zone.id === 'hana_return') {
      this.fadeToScene('HanaDrivingScene', {
        resumeSegment: this.resumeSegment + 1,
        returnX: this.returnX,
        returnY: this.returnY,
      });
    }
  }

  shutdown(): void {
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // no-op
  }
}
