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
          returnX: 42 * TILE_SIZE, returnY: 25 * TILE_SIZE,
        });
        break;
      case 'jq_tram_stop':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y });
        break;
    }
  }

  shutdown(): void { super.shutdown(); }
  protected onBack(): void { /* no-op */ }
}
