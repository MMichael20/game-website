// src/game/scenes/WorldScene.ts
import Phaser from 'phaser';
import { uiManager, CheckpointStatus } from '../../ui/UIManager';
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_PX_WIDTH,
  MAP_PX_HEIGHT,
  getDeviceZoom,
} from '../../utils/constants';
import {
  tileGrid,
  TileType,
  DECORATIONS,
  CHECKPOINT_ZONES,
  CheckpointZone,
  tileToWorld,
  worldToTile,
} from '../data/mapLayout';
import { CHECKPOINTS } from '../data/checkpoints';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { SkyRenderer } from '../rendering/SkyRenderer';
import {
  loadGameState,
  savePlayerPosition,
  markCheckpointVisited,
  clearGameState,
  getPlayerSpawn,
} from '../systems/SaveSystem';

const TILE_COLORS: Record<number, number> = {
  [TileType.Grass]: 0x4a7c4f,
  [TileType.Dirt]: 0xc4a265,
  [TileType.Stone]: 0x8a8a8a,
  [TileType.DarkGrass]: 0x3a6b3f,
};

// Building definitions: name, tile position, tile size
const BUILDINGS = [
  { name: 'restaurant', tileX: 6, tileY: 6, tileW: 3, tileH: 3 },
  { name: 'park-entrance', tileX: 13, tileY: 15, tileW: 3, tileH: 2 },
  { name: 'cinema', tileX: 22, tileY: 6, tileW: 3, tileH: 3 },
];

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private partner!: Partner;
  private inputSystem!: InputSystem;
  private npcSystem!: NPCSystem;
  private skyRenderer!: SkyRenderer;

  private activeZone: CheckpointZone | null = null;
  private interactCooldown = 0;
  private backCooldown = 0;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const state = loadGameState();

    // 1. Sky
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this);

    // 2. Build tile map
    this.buildTileMap();

    // 3. Decorations
    DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    // 4. Buildings
    BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    // 5. Player & Partner
    const spawn = getPlayerSpawn();
    this.player = new Player(this, spawn.x, spawn.y, state.outfits.player);
    this.partner = new Partner(this, spawn.x, spawn.y, state.outfits.partner);

    // 6. NPC system
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this);

    // 7. Input system
    this.inputSystem = new InputSystem(this);

    // 8. Camera
    const cam = this.cameras.main;
    cam.setZoom(getDeviceZoom());
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, MAP_PX_WIDTH, MAP_PX_HEIGHT);

    // 9. Physics world bounds
    this.physics.world.setBounds(0, 0, MAP_PX_WIDTH, MAP_PX_HEIGHT);
    this.player.sprite.setCollideWorldBounds(true);

    // 10. HUD
    this.updateHUD();

    // Settings button handler
    const settingsBtn = document.querySelector('.hud__settings-btn');
    settingsBtn?.addEventListener('click', () => this.openSettings());

    // 11. Resize handler
    this.scale.on('resize', () => {
      cam.setZoom(getDeviceZoom());
    });
  }

  update(time: number, delta: number): void {
    // Cooldown timers
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.backCooldown > 0) this.backCooldown -= delta;

    // 1. Input
    this.inputSystem.update();
    const dir = this.inputSystem.getDirection();

    // 2. Player
    this.player.update(dir);

    // 3. Partner follows player
    this.partner.update(this.player.getPosition());

    // 4. NPCs
    this.npcSystem.update(delta);

    // 5. Checkpoint proximity
    const playerPos = this.player.getPosition();
    const playerTile = worldToTile(playerPos.x, playerPos.y);
    let inZone: CheckpointZone | null = null;

    for (const zone of CHECKPOINT_ZONES) {
      if (
        playerTile.x >= zone.tileX &&
        playerTile.x < zone.tileX + zone.width &&
        playerTile.y >= zone.tileY &&
        playerTile.y < zone.tileY + zone.height
      ) {
        inZone = zone;
        break;
      }
    }

    if (inZone && inZone !== this.activeZone) {
      this.activeZone = inZone;
      uiManager.showInteractionPrompt(inZone.promptText);
    } else if (!inZone && this.activeZone) {
      this.activeZone = null;
      uiManager.hideInteractionPrompt();
    }

    // 6. Interact press
    if (this.inputSystem.isInteractPressed() && this.activeZone && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      this.enterCheckpoint(this.activeZone);
    }

    // 7. Back/ESC press
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      this.openSettings();
    }
  }

  private buildTileMap(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(-50);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = tileGrid[y][x];
        const color = TILE_COLORS[tileType] ?? 0x4a7c4f;
        graphics.fillStyle(color, 1);
        graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private enterCheckpoint(zone: CheckpointZone): void {
    // Save current position
    const pos = this.player.getPosition();
    savePlayerPosition(pos.x, pos.y);

    // Mark visited
    markCheckpointVisited(zone.id);

    // Find checkpoint config
    const checkpoint = CHECKPOINTS.find(cp => cp.id === zone.id);
    if (!checkpoint) return;

    // Hide world UI
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();

    // Map mini-game type to scene key
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

  private openSettings(): void {
    uiManager.showSettings({
      onFullscreen: () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      },
      onNewGame: () => {
        uiManager.hideDialog();
        uiManager.showDialog({
          title: 'New Game',
          message: 'Are you sure? All progress will be lost.',
          buttons: [
            {
              label: 'Yes',
              onClick: () => {
                clearGameState();
                uiManager.hideDialog();
                uiManager.hideHUD();
                this.scene.start('DressingRoomScene', { isNewGame: true });
              },
            },
            {
              label: 'No',
              onClick: () => {
                uiManager.hideDialog();
              },
            },
          ],
        });
      },
      onClose: () => {
        uiManager.hideDialog();
      },
    });
  }

  private updateHUD(): void {
    const state = loadGameState();
    const statuses: CheckpointStatus[] = CHECKPOINTS.map(cp => ({
      id: cp.id,
      name: cp.name,
      visited: state.visitedCheckpoints.includes(cp.id),
    }));

    uiManager.showHUD(statuses);

    // Check completion
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
    this.inputSystem?.destroy();
    this.npcSystem?.destroy();
    this.skyRenderer?.destroy();
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
  }
}
