import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import {
  JQ_WIDTH, JQ_HEIGHT, jqTileGrid, isJQWalkable,
  JQ_NPCS, JQ_CHECKPOINT_ZONES, JQ_DECORATIONS, JQ_BUILDINGS,
} from './jewishQuarterMap';

export class JewishQuarterScene extends OverworldScene {
  constructor() { super({ key: 'JewishQuarterScene' }); }

  getConfig(): OverworldConfig {
    return {
      mapWidth: JQ_WIDTH, mapHeight: JQ_HEIGHT,
      tileGrid: jqTileGrid, walkCheck: isJQWalkable,
      npcs: JQ_NPCS, checkpointZones: JQ_CHECKPOINT_ZONES,
      spawnX: 15 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 23 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'budapest-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      jq_ruin_bar: 'Szimpla Kert', jq_synagogue: 'Dohány Synagogue',
      jq_exit: 'Exit', jq_tram_stop: 'Tram Stop',
    };
  }

  create(): void { super.create(); saveCurrentScene('JewishQuarterScene'); }

  onCreateExtras(): void {
    JQ_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });
    JQ_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });

    // Twinkling string light bulbs
    JQ_DECORATIONS.filter(d => d.type === 'bp-string-lights').forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      const colors = [0xFFEE88, 0xFFCC44, 0xFF8844, 0xFFAACC];
      for (let i = 0; i < 5; i++) {
        const bulb = this.add.circle(
          pos.x - 8 + i * 5, pos.y - 4 + i * 3,
          2, colors[i % 4],
        ).setAlpha(0.5).setDepth(-9);
        this.tweens.add({
          targets: bulb,
          alpha: { from: 0.4, to: 0.9 },
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 800,
        });
      }
    });

    // Lamplight glow
    JQ_DECORATIONS.filter(d => d.type === 'bp-lamp').forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      const glow = this.add.circle(pos.x, pos.y - 10, 12, 0xFFEE88)
        .setAlpha(0.15).setDepth(-11);
      this.tweens.add({
        targets: glow,
        alpha: 0.28,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    switch (zone.id) {
      case 'jq_ruin_bar':
        this.fadeToScene('RuinBarScene', { returnX: pos.x, returnY: pos.y });
        break;
      case 'jq_synagogue':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'The Dohány Street Synagogue.',
          'The largest synagogue in Europe!',
          'Built in the 1850s in Moorish Revival style.',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'jq_exit':
        this.fadeToScene('BudapestOverworldScene', {
          returnFromInterior: true,
          returnX: 48 * TILE_SIZE, returnY: 27 * TILE_SIZE,
        });
        break;
      case 'jq_tram_stop':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y, returnScene: 'JewishQuarterScene' });
        break;
    }
  }

  shutdown(): void { super.shutdown(); }
  protected onBack(): void { /* no-op */ }
}
