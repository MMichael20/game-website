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
  { name: 'airport', tileX: 14, tileY: 29, tileW: 12, tileH: 3 },
  { name: 'hadars-house', tileX: 24, tileY: 3, tileW: 3, tileH: 3 },
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

  getLabelMap(): Record<string, string> {
    return {
      restaurant: 'Restaurant',
      park: 'Park',
      cinema: 'Cinema',
      michaels_house: "Michael's",
      hadars_house: "Hadar's",
      airport: 'Airport',
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

    // 5. Airport runway animations
    this.addAirplaneAnimations();

    // 6. Airport cars
    this.addAirportCars();
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
      hadars_house: 'HadarsHouseScene',
      airport: 'AirportInteriorScene',
    };

    if (interiorSceneMap[zone.id]) {
      this.fadeToScene(interiorSceneMap[zone.id], {
        returnX: pos.x,
        returnY: pos.y,
      });
      return;
    }

    if (zone.id === 'fast_travel') {
      this.inputSystem.freeze();
      const destinations = [
        { label: 'Airport', scene: 'AirportInteriorScene', data: { returnX: pos.x, returnY: pos.y } },
        { label: 'Maui', scene: 'MauiOverworldScene', data: { returnFromInterior: true } },
        { label: 'Budapest', scene: 'BudapestOverworldScene', data: { returnFromInterior: true } },
        { label: 'Jewish Quarter', scene: 'JewishQuarterScene', data: { returnFromInterior: true } },
      ];
      uiManager.showDialog({
        title: 'Fast Travel',
        message: 'Where do you want to go?',
        buttons: [
          ...destinations.map(dest => ({
            label: dest.label,
            onClick: () => {
              uiManager.hideDialog();
              this.inputSystem.unfreeze();
              this.cameras.main.fadeOut(300, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start(dest.scene, dest.data ?? {});
              });
            },
          })),
          { label: 'Cancel', onClick: () => { uiManager.hideDialog(); this.inputSystem.unfreeze(); } },
        ],
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

  private addAirplaneAnimations(): void {
    const departX = 18 * TILE_SIZE + TILE_SIZE / 2;
    const arriveX = 20 * TILE_SIZE + TILE_SIZE / 2;
    const apronY = 32 * TILE_SIZE + TILE_SIZE / 2;
    const runwayY = 36 * TILE_SIZE + TILE_SIZE / 2;
    const offScreenRight = MAP_WIDTH * TILE_SIZE + 200;
    const offScreenLeft = -200;

    // Departing plane: taxi south then accelerate east off-screen
    const departingPlane = this.add.image(departX, apronY, 'airplane-taxiing')
      .setDepth(-6)
      .setAlpha(0)
      .setScale(2);

    const startDeparture = () => {
      departingPlane.setPosition(departX, apronY).setAlpha(1);
      this.tweens.add({
        targets: departingPlane,
        y: runwayY,
        duration: 3000,
        ease: 'Linear',
        onComplete: () => {
          this.tweens.add({
            targets: departingPlane,
            x: offScreenRight,
            duration: 4000,
            ease: 'Quad.easeIn',
            onComplete: () => {
              departingPlane.setAlpha(0);
            },
          });
        },
      });
    };

    // Arriving plane: decelerate from left, then taxi north to apron
    const arrivingPlane = this.add.image(offScreenLeft, runwayY, 'airplane-taxiing')
      .setDepth(-6)
      .setAlpha(0)
      .setFlipX(true)
      .setScale(2);

    const startArrival = () => {
      arrivingPlane.setPosition(offScreenLeft, runwayY).setAlpha(1).setFlipX(true);
      this.tweens.add({
        targets: arrivingPlane,
        x: arriveX,
        duration: 4000,
        ease: 'Quad.easeOut',
        onComplete: () => {
          arrivingPlane.setFlipX(false);
          this.tweens.add({
            targets: arrivingPlane,
            y: apronY,
            duration: 3000,
            ease: 'Linear',
            onComplete: () => {
              arrivingPlane.setAlpha(0);
            },
          });
        },
      });
    };

    // Loop departures every 25s, arrivals offset by 17s
    startDeparture();
    this.time.addEvent({ delay: 25000, callback: startDeparture, loop: true });
    this.time.delayedCall(17000, () => {
      startArrival();
      this.time.addEvent({ delay: 25000, callback: startArrival, loop: true });
    });
  }

  private addAirportCars(): void {
    // Red car: right to left
    const carRed = this.add.image(31 * TILE_SIZE, 28 * TILE_SIZE + TILE_SIZE / 2, 'car-red')
      .setDepth(-3);
    this.tweens.add({
      targets: carRed,
      x: 8 * TILE_SIZE,
      duration: 12000,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // Blue car: left to right, delayed 6s
    const carBlue = this.add.image(8 * TILE_SIZE, 28 * TILE_SIZE + TILE_SIZE / 2, 'car-blue')
      .setDepth(-3)
      .setAlpha(0);
    this.time.delayedCall(6000, () => {
      carBlue.setAlpha(1);
      this.tweens.add({
        targets: carBlue,
        x: 31 * TILE_SIZE,
        duration: 12000,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
      });
    });

    // Taxi car: north to south, delayed 3s
    const carTaxi = this.add.image(19 * TILE_SIZE + TILE_SIZE / 2, 24 * TILE_SIZE, 'car-taxi')
      .setDepth(-3)
      .setAlpha(0);
    this.time.delayedCall(3000, () => {
      carTaxi.setAlpha(1);
      this.tweens.add({
        targets: carTaxi,
        y: 28 * TILE_SIZE,
        duration: 5000,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
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
