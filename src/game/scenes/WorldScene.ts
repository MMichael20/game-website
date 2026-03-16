// src/game/scenes/WorldScene.ts
import { uiManager } from '../../ui/UIManager';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../utils/constants';
import {
  tileGrid,
  DECORATIONS,
  CHECKPOINT_ZONES,
  NPC_DEFS,
  tileToWorld,
  isWalkable,
  CheckpointZone,
} from '../data/mapLayout';
import { CHECKPOINTS } from '../data/checkpoints';
import { SkyRenderer } from '../rendering/SkyRenderer';
import {
  loadGameState,
  savePlayerPosition,
  markCheckpointVisited,
  clearGameState,
  getPlayerSpawn,
} from '../systems/SaveSystem';
import { OverworldScene, OverworldConfig } from './OverworldScene';

// Building definitions: name, tile position, tile size
const BUILDINGS = [
  { name: 'restaurant', tileX: 7, tileY: 7, tileW: 3, tileH: 3 },
  { name: 'park-entrance', tileX: 18, tileY: 19, tileW: 3, tileH: 2 },
  { name: 'cinema', tileX: 30, tileY: 7, tileW: 3, tileH: 3 },
  { name: 'michaels-house', tileX: 14, tileY: 3, tileW: 3, tileH: 3 },
  { name: 'airport', tileX: 32, tileY: 24, tileW: 3, tileH: 3 },
];

export class WorldScene extends OverworldScene {
  private skyRenderer!: SkyRenderer;

  constructor() {
    super({ key: 'WorldScene' });
  }

  getConfig(): OverworldConfig {
    const spawn = getPlayerSpawn();
    return {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      tileGrid,
      walkCheck: isWalkable,
      npcs: NPC_DEFS,
      checkpointZones: CHECKPOINT_ZONES,
      spawnX: spawn.x,
      spawnY: spawn.y,
      terrainTextureKey: 'terrain',
    };
  }

  onCreateExtras(): void {
    // 1. Sky
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this);

    // 2. Decorations (track lamps for glow effect)
    const lampPositions: Array<{ x: number; y: number }> = [];
    DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
      if (deco.type === 'lamp') {
        lampPositions.push(pos);
      }
    });

    // 3. Buildings
    BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    // 4. Ambient animations
    this.addLampGlow(lampPositions);
    this.addButterflies();
  }

  protected onShowHUD(): void {
    uiManager.showHUD();
    this.checkCompletion();
  }

  protected onBack(): void {
    this.openSettings();
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    savePlayerPosition(pos.x, pos.y);

    // Interior buildings
    const interiorSceneMap: Record<string, string> = {
      michaels_house: 'MichaelsHouseScene',
      airport: 'AirportEntranceScene',
    };

    if (interiorSceneMap[zone.id]) {
      this.fadeToScene(interiorSceneMap[zone.id], {
        returnX: pos.x,
        returnY: pos.y,
      });
      return;
    }

    // Existing mini-game logic
    markCheckpointVisited(zone.id);
    const checkpoint = CHECKPOINTS.find(cp => cp.id === zone.id);
    if (!checkpoint) return;
    uiManager.hideInteractionPrompt();
    const sceneMap: Record<string, string> = {
      quiz: 'QuizScene',
      catch: 'CatchScene',
      match: 'MatchScene',
    };
    const sceneKey = sceneMap[checkpoint.miniGame.type];
    if (sceneKey) {
      this.scene.start(sceneKey, {
        checkpointId: checkpoint.id,
        config: checkpoint.miniGame.config,
      });
    }
  }

  private addLampGlow(lampPositions: Array<{ x: number; y: number }>): void {
    lampPositions.forEach((pos, i) => {
      const glow = this.add.circle(pos.x, pos.y - 8, 12, 0xffee88, 0.15);
      glow.setDepth(-9);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.05 },
        scaleX: { from: 1, to: 1.3 },
        scaleY: { from: 1, to: 1.3 },
        duration: 2000 + i * 300,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
      });
    });
  }

  private addButterflies(): void {
    // Floating butterflies around the park area
    const parkPositions = [
      { x: 16 * TILE_SIZE, y: 22 * TILE_SIZE },
      { x: 24 * TILE_SIZE, y: 25 * TILE_SIZE },
      { x: 20 * TILE_SIZE, y: 20 * TILE_SIZE },
    ];

    parkPositions.forEach((pos, i) => {
      const butterfly = this.add.sprite(pos.x, pos.y, 'catch-butterfly');
      butterfly.setScale(0.6);
      butterfly.setDepth(5);
      butterfly.setAlpha(0.85);

      // Random floating movement
      const xRange = 80 + i * 20;
      const yRange = 60 + i * 15;
      this.tweens.add({
        targets: butterfly,
        x: { from: pos.x - xRange / 2, to: pos.x + xRange / 2 },
        duration: 4000 + i * 1500,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
      });
      this.tweens.add({
        targets: butterfly,
        y: { from: pos.y - yRange / 2, to: pos.y + yRange / 2 },
        duration: 3000 + i * 1200,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
      });
    });
  }

  private checkCompletion(): void {
    const state = loadGameState();
    const allVisited = CHECKPOINTS.every(cp =>
      state.visitedCheckpoints.includes(cp.id),
    );
    if (allVisited && CHECKPOINTS.length > 0) {
      uiManager.showCompletionScreen(state.miniGameScores);
      const restartBtn = document.getElementById('completion-restart');
      restartBtn?.addEventListener('click', () => {
        clearGameState();
        this.scene.start('DressingRoomScene', { isNewGame: true });
      });
    }
  }

  shutdown(): void {
    super.shutdown();
    this.skyRenderer?.destroy();
  }
}
