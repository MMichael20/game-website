// src/game/scenes/OverworldScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, getDeviceZoom } from '../../utils/constants';
import { CheckpointZone, NPCDef, worldToTile } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { NPC } from '../entities/NPC';
import { InputSystem } from '../systems/InputSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { loadGameState } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';

export interface OverworldConfig {
  mapWidth: number;
  mapHeight: number;
  tileGrid: number[][];
  walkCheck: (tileX: number, tileY: number) => boolean;
  npcs: NPCDef[];
  checkpointZones: CheckpointZone[];
  spawnX: number;
  spawnY: number;
  terrainTextureKey: string;
}

export abstract class OverworldScene extends Phaser.Scene {
  protected player!: Player;
  protected partner!: Partner;
  protected inputSystem!: InputSystem;
  protected npcSystem!: NPCSystem;

  protected activeZone: CheckpointZone | null = null;
  protected interactCooldown = 0;
  protected backCooldown = 0;
  protected cachedConfig!: OverworldConfig;

  private returnFromInteriorData: { returnX: number; returnY: number } | null = null;
  private shouldFadeIn = false;

  // --- Abstract methods subclasses must implement ---
  abstract getConfig(): OverworldConfig;
  abstract onEnterCheckpoint(zone: CheckpointZone): void;
  abstract onCreateExtras(): void;

  // --- Optional hooks subclasses can override ---
  protected onShowHUD(): void { /* no-op by default */ }
  protected onBack(): void { /* no-op by default */ }

  init(data?: { returnFromInterior?: boolean; returnX?: number; returnY?: number }): void {
    if (data?.returnFromInterior && data.returnX != null && data.returnY != null) {
      this.returnFromInteriorData = { returnX: data.returnX, returnY: data.returnY };
      this.shouldFadeIn = true;
    } else {
      this.returnFromInteriorData = null;
      this.shouldFadeIn = false;
    }
  }

  create(): void {
    this.cachedConfig = this.getConfig();
    const config = this.cachedConfig;
    const state = loadGameState();

    const mapPxWidth = config.mapWidth * TILE_SIZE;
    const mapPxHeight = config.mapHeight * TILE_SIZE;

    // 1. Build tile map
    this.buildTileMap(config, mapPxWidth, mapPxHeight);

    // 2. Subclass extras (decorations, buildings, sky, etc.)
    this.onCreateExtras();

    // 3. Player & Partner
    this.player = new Player(this, config.spawnX, config.spawnY, state.outfits.player, config.walkCheck);
    this.partner = new Partner(this, config.spawnX, config.spawnY, state.outfits.partner);

    if (this.returnFromInteriorData) {
      this.player.sprite.setPosition(this.returnFromInteriorData.returnX, this.returnFromInteriorData.returnY);
      this.partner.sprite.setPosition(this.returnFromInteriorData.returnX + 32, this.returnFromInteriorData.returnY);
      this.returnFromInteriorData = null;
    }

    // 4. NPC system
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, config.npcs);

    // 5. Input system
    this.inputSystem = new InputSystem(this);
    this.inputSystem.enableClickToMove(config.walkCheck, config.mapWidth, config.mapHeight, () => this.player.getPosition());

    // 6. Camera
    const cam = this.cameras.main;
    cam.setZoom(getDeviceZoom());
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, mapPxWidth, mapPxHeight);

    // 7. Physics world bounds
    this.physics.world.setBounds(0, 0, mapPxWidth, mapPxHeight);
    this.player.sprite.setCollideWorldBounds(true);

    // 8. HUD
    this.onShowHUD();

    // 9. Resize handler
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(getDeviceZoom());
    });

    // 10. Fade-in from interior transition
    if (this.shouldFadeIn) {
      const cam2 = this.cameras.main;
      cam2.setAlpha(0);
      this.tweens.add({
        targets: cam2,
        alpha: 1,
        duration: 300,
        ease: 'Linear',
      });
      this.shouldFadeIn = false;
    }
  }

  update(_time: number, delta: number): void {
    const config = this.cachedConfig;

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
    const playerPos = this.player.getPosition();
    this.npcSystem.update(delta, playerPos.x, playerPos.y);

    // 5. Checkpoint proximity
    const playerTile = worldToTile(playerPos.x, playerPos.y);
    let inZone: CheckpointZone | null = null;

    for (const zone of config.checkpointZones) {
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
    if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      const npc = this.npcSystem.getInteractableInRange();
      if (npc) {
        this.handleNPCInteract(npc);
      } else if (this.activeZone) {
        this.onEnterCheckpoint(this.activeZone);
      }
    }

    // 7. Back/ESC press
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      this.onBack();
    }
  }

  private handleNPCInteract(npc: NPC): void {
    if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        this.inputSystem.unfreeze();
      });
    } else if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
      this.inputSystem.freeze();
      const sceneKey = npc.interactionData.sceneKey;
      const sceneData = npc.interactionData.sceneData ?? {};
      const triggerCutscene = () => {
        uiManager.hideInteractionPrompt();
        const cam = this.cameras.main;
        this.tweens.add({
          targets: cam, alpha: 0, duration: 300, ease: 'Linear',
          onComplete: () => { this.scene.start(sceneKey, sceneData); },
        });
      };
      if (npc.interactionData.lines?.length) {
        uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
      } else {
        triggerCutscene();
      }
    }
  }

  /** Fade camera to black and start a new scene */
  protected fadeToScene(sceneKey: string, sceneData?: object): void {
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start(sceneKey, sceneData);
      },
    });
  }

  private buildTileMap(config: OverworldConfig, mapPxWidth: number, mapPxHeight: number): void {
    const rt = this.add.renderTexture(0, 0, mapPxWidth, mapPxHeight);
    rt.setOrigin(0, 0);
    rt.setDepth(-50);

    for (let y = 0; y < config.mapHeight; y++) {
      for (let x = 0; x < config.mapWidth; x++) {
        const tileType = config.tileGrid[y][x];
        rt.drawFrame(config.terrainTextureKey, tileType, x * TILE_SIZE, y * TILE_SIZE);
      }
    }
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.npcSystem?.destroy();
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
  }
}
