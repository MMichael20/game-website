// src/game/scenes/OverworldScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, getDeviceZoom } from '../../utils/constants';
import { CheckpointZone, NPCDef } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { loadGameState, clearGameState, savePlayerPosition } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';
import { MinimapRenderer } from '../../ui/MinimapRenderer';
import { audioManager } from '../../audio/AudioManager';
import { FootstepSurface } from '../../audio/audioTypes';

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
  protected mapCooldown = 0;
  protected cachedConfig!: OverworldConfig;
  protected minimap!: MinimapRenderer;
  private transitioning = false;

  private returnFromInteriorData: { returnX: number; returnY: number } | null = null;
  private shouldFadeIn = false;

  // --- Abstract methods subclasses must implement ---
  abstract getConfig(): OverworldConfig;
  abstract onEnterCheckpoint(zone: CheckpointZone): void;
  abstract onCreateExtras(): void;
  abstract getLabelMap(): Record<string, string>;

  // --- Optional hooks subclasses can override ---
  protected onShowHUD(): void {
    uiManager.showHUD();
  }
  protected onBack(): void { /* no-op by default */ }

  init(data?: { returnFromInterior?: boolean; returnX?: number; returnY?: number }): void {
    if (data?.returnFromInterior) {
      this.shouldFadeIn = true;
      if (data.returnX != null && data.returnY != null) {
        this.returnFromInteriorData = { returnX: data.returnX, returnY: data.returnY };
      } else {
        this.returnFromInteriorData = null;
      }
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
    this.partner = new Partner(this, config.spawnX + 32, config.spawnY, state.outfits.partner);

    if (this.returnFromInteriorData) {
      this.player.sprite.setPosition(this.returnFromInteriorData.returnX, this.returnFromInteriorData.returnY);
      this.partner.sprite.setPosition(this.returnFromInteriorData.returnX + 32, this.returnFromInteriorData.returnY);
      this.returnFromInteriorData = null;
    } else if (state.playerPosition) {
      // Restore saved position (e.g., returning from minigame)
      this.player.sprite.setPosition(state.playerPosition.x, state.playerPosition.y);
      this.partner.sprite.setPosition(state.playerPosition.x + 32, state.playerPosition.y);
    }

    // 4. NPC system
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, config.npcs);

    // Wire dwell trigger callback
    this.npcSystem.onDwellTrigger = (npc) => {
      this.handleNPCInteract(npc);
    };

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

    // 8. HUD & Settings
    uiManager.setSettingsHandler(() => this.openSettings());
    this.onShowHUD();

    // 9. Minimap
    this.minimap = new MinimapRenderer(this, config, this.getLabelMap(), () => this.player.getPosition());
    uiManager.setMinimapHandler(() => this.minimap.toggle());

    // 10. Audio — start scene-specific music & ambient
    audioManager.transitionToScene(this.scene.key);

    // 11. Register shutdown handler for proper cleanup
    this.events.on('shutdown', this.shutdown, this);

    // 12. Resize handler (debounced for mobile orientation changes)
    let resizeTimeout: number | undefined;
    this.scale.on('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.cameras.main.setZoom(getDeviceZoom());
      }, 100);
    });

    // 13. Fade-in from interior transition
    if (this.shouldFadeIn) {
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.shouldFadeIn = false;
    }
  }

  update(_time: number, delta: number): void {
    const config = this.cachedConfig;

    // Cooldown timers
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.backCooldown > 0) this.backCooldown -= delta;
    if (this.mapCooldown > 0) this.mapCooldown -= delta;

    // 1. Input
    this.inputSystem.update();
    const dir = this.inputSystem.getDirection();

    // 2. Player
    this.player.update(dir);

    // 2b. Footstep audio when player is moving
    if (dir.x !== 0 || dir.y !== 0) {
      const surface = this.getFootstepSurface();
      if (surface) audioManager.playFootstep(surface);
    }

    // 3. Partner follows player
    this.partner.update(this.player.getPosition());

    // 4. NPCs (dwell logic runs inside NPCSystem.update)
    const playerPos = this.player.getPosition();
    this.npcSystem.update(delta, playerPos.x, playerPos.y, this.inputSystem.isFrozen);

    // 5. Checkpoint proximity (radius-based)
    let inZone: CheckpointZone | null = null;

    for (const zone of config.checkpointZones) {
      const dx = playerPos.x - zone.centerX;
      const dy = playerPos.y - zone.centerY;
      if (dx * dx + dy * dy <= zone.radius * zone.radius) {
        inZone = zone;
        break;
      }
    }

    if (inZone && inZone !== this.activeZone) {
      this.activeZone = inZone;
      audioManager.playSFX('ui_dialog_open');
      uiManager.showInteractionPrompt(inZone.promptText, () => {
        this.interactCooldown = 500;
        this.onEnterCheckpoint(inZone);
      });
    } else if (!inZone && this.activeZone) {
      this.activeZone = null;
      uiManager.hideInteractionPrompt();
    }

    // 6. Interact press (keyboard E/Space) — checkpoint zones only
    if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      if (this.activeZone) {
        this.onEnterCheckpoint(this.activeZone);
      }
    }

    // 7. Map toggle (M key) — suppress when dialog/settings is open
    if (this.inputSystem.isMapPressed() && this.mapCooldown <= 0 && !uiManager.isDialogActive()) {
      this.mapCooldown = 300;
      this.minimap.toggle();
    }

    // 8. Back/ESC press — close minimap first, then scene-level back
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      if (this.minimap.isOpen) {
        this.minimap.close();
      } else {
        this.onBack();
      }
    }
  }

  private handleNPCInteract(npc: { id: string; onInteract?: string; interactionData?: { lines?: string[]; sceneKey?: string; sceneData?: any } }): void {
    if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      audioManager.playSFX('ui_dialog_open');
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    } else if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
      this.inputSystem.freeze();
      const sceneKey = npc.interactionData.sceneKey;
      const sceneData = npc.interactionData.sceneData ?? {};
      const triggerCutscene = () => {
        this.npcSystem.onDialogueEnd(npc.id);
        uiManager.hideInteractionPrompt();
        const cam = this.cameras.main;
        cam.fadeOut(400, 0, 0, 0);
        cam.once('camerafadeoutcomplete', () => {
          this.scene.start(sceneKey, sceneData);
        });
      };
      if (npc.interactionData.lines?.length) {
        uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
      } else {
        triggerCutscene();
      }
    }
  }

  /** Override in subclasses to return the correct footstep surface for the player's current tile */
  protected getFootstepSurface(): FootstepSurface | null {
    return 'stone';
  }

  protected openSettings(): void {
    uiManager.showSettings({
      audio: {
        masterVolume: audioManager.getMasterVolume(),
        musicVolume: audioManager.getMusicVolume(),
        sfxVolume: audioManager.getSFXVolume(),
        ambientVolume: audioManager.getAmbientVolume(),
        muted: audioManager.isMuted(),
        onMasterVolume: (v) => audioManager.setMasterVolume(v),
        onMusicVolume: (v) => audioManager.setMusicVolume(v),
        onSFXVolume: (v) => audioManager.setSFXVolume(v),
        onAmbientVolume: (v) => audioManager.setAmbientVolume(v),
        onMuteToggle: () => audioManager.setMuted(!audioManager.isMuted()),
      },
      onFullscreen: () => {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
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
            { label: 'No', onClick: () => uiManager.hideDialog() },
          ],
        });
      },
      onClose: () => uiManager.hideDialog(),
    });
  }

  /** Fade camera to black and start a new scene */
  protected fadeToScene(sceneKey: string, sceneData?: object): void {
    if (this.transitioning) return;
    this.transitioning = true;

    // Save player position so we can restore it when returning
    const pos = this.player.getPosition();
    savePlayerPosition(pos.x, pos.y);

    audioManager.playSFX('whoosh');
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    cam.fadeOut(400, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, sceneData);
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

  destroy(): void {
    this.events.off('shutdown', this.shutdown, this);
  }

  shutdown(): void {
    this.minimap?.destroy();
    uiManager.setMinimapHandler(null);
    this.inputSystem?.destroy();
    this.npcSystem?.destroy();
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
  }
}
