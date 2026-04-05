// src/game/scenes/InteriorScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, getDeviceZoom, InteriorTileType } from '../../utils/constants';
import { InteriorLayout, createInteriorWalkCheck } from '../data/interiorLayouts';
import { worldToTile, tileToWorld } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { loadGameState, clearGameState } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';
import { audioManager } from '../../audio/AudioManager';
import { FootstepSurface } from '../../audio/audioTypes';

interface InteriorSceneData {
  returnX: number;
  returnY: number;
}

export abstract class InteriorScene extends Phaser.Scene {
  protected player!: Player;
  protected partner!: Partner;
  protected inputSystem!: InputSystem;
  protected layout!: InteriorLayout;

  protected returnData!: InteriorSceneData;
  private interactCooldown = 0;
  private backCooldown = 0;
  private activeExitZone = false;
  private activeForwardZone = false;

  abstract getLayout(): InteriorLayout;

  init(data: InteriorSceneData): void {
    this.returnData = data;
    this.layout = this.getLayout();
  }

  create(): void {
    const state = loadGameState();
    const layout = this.layout;
    const mapPxW = layout.widthInTiles * TILE_SIZE;
    const mapPxH = layout.heightInTiles * TILE_SIZE;

    // 1. Render tile map
    this.buildInteriorTileMap(layout, mapPxW, mapPxH);

    // 2. Render decorations
    layout.decorations.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `interior-${deco.type}`).setDepth(5);
    });

    // 2b. Render exit door
    if (layout.exitDoorStyle) {
      const textureKey = `exit-door-${layout.exitDoorStyle}`;
      const exit = layout.exit;
      const doorY = exit.tileY + exit.height - 1;

      if (layout.exitDoorStyle === 'glass') {
        for (let dx = 0; dx < exit.width; dx++) {
          const pos = tileToWorld(exit.tileX + dx, doorY);
          this.add.image(pos.x, pos.y, textureKey).setDepth(4);
        }
      } else {
        const centerX = exit.tileX + Math.floor(exit.width / 2);
        const pos = tileToWorld(centerX, doorY);
        this.add.image(pos.x, pos.y, textureKey).setDepth(4);
      }
    }

    // 3. Player & Partner at entrance
    const spawnPos = tileToWorld(layout.entrance.tileX, layout.entrance.tileY);
    const walkCheck = this.getWalkCheck(layout);
    this.player = new Player(this, spawnPos.x, spawnPos.y, state.outfits.player, walkCheck);
    this.partner = new Partner(this, spawnPos.x, spawnPos.y, state.outfits.partner);

    // 4. Input
    this.inputSystem = new InputSystem(this);
    this.inputSystem.enableClickToMove(walkCheck, layout.widthInTiles, layout.heightInTiles, () => this.player.getPosition());

    // 5. Camera
    const cam = this.cameras.main;
    cam.setZoom(layout.cameraZoom ? Math.min(layout.cameraZoom, getDeviceZoom()) : getDeviceZoom());
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, mapPxW, mapPxH);

    // 6. Physics bounds
    this.physics.world.setBounds(0, 0, mapPxW, mapPxH);

    // 7. HUD & Settings
    uiManager.setSettingsHandler(() => this.openSettings());
    uiManager.showHUD();

    // 8. Audio — scene transition + door sound
    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('door_open');

    // 9. Register shutdown handler for proper cleanup
    this.events.on('shutdown', this.shutdown, this);

    // 10. Fade in
    cam.fadeIn(400, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.backCooldown > 0) this.backCooldown -= delta;

    // Input
    this.inputSystem.update();
    const dir = this.inputSystem.getDirection();

    // Player & Partner
    this.player.update(dir);
    this.partner.update(this.player.getPosition());

    // Footstep audio
    if (dir.x !== 0 || dir.y !== 0) {
      const pos = this.player.getPosition();
      const tileX = Math.floor(pos.x / TILE_SIZE);
      const tileY = Math.floor(pos.y / TILE_SIZE);
      const surface = this.getInteriorFootstepSurface(tileX, tileY);
      audioManager.playFootstep(surface);
    }

    // Zone detection
    const playerPos = this.player.getPosition();
    const playerTile = worldToTile(playerPos.x, playerPos.y);

    // Back exit zone check
    const exit = this.layout.exit;
    const inExitZone =
      playerTile.x >= exit.tileX &&
      playerTile.x < exit.tileX + exit.width &&
      playerTile.y >= exit.tileY &&
      playerTile.y < exit.tileY + exit.height;

    // Forward exit zone check
    const forwardExit = this.layout.forwardExit;
    const inForwardZone = forwardExit
      ? playerTile.x >= forwardExit.tileX &&
        playerTile.x < forwardExit.tileX + forwardExit.width &&
        playerTile.y >= forwardExit.tileY &&
        playerTile.y < forwardExit.tileY + forwardExit.height
      : false;

    // Update back exit zone prompt (hide if in forward zone)
    if (inExitZone && !inForwardZone && !this.activeExitZone) {
      this.activeExitZone = true;
      this.activeForwardZone = false;
      uiManager.showInteractionPrompt(exit.promptText, () => {
        this.interactCooldown = 500;
        if (this.layout.previousScene) {
          this.transitionToScene(this.layout.previousScene);
        } else {
          this.exitToOverworld();
        }
      });
    } else if ((!inExitZone || inForwardZone) && this.activeExitZone) {
      this.activeExitZone = false;
      uiManager.hideInteractionPrompt();
    }

    // Update forward exit zone prompt (hide if in back zone)
    if (inForwardZone && !inExitZone && !this.activeForwardZone && forwardExit) {
      this.activeForwardZone = true;
      this.activeExitZone = false;
      uiManager.showInteractionPrompt(forwardExit.promptText, () => {
        this.interactCooldown = 500;
        if (this.layout.nextScene) {
          this.transitionToScene(this.layout.nextScene);
        }
      });
    } else if ((!inForwardZone || inExitZone) && this.activeForwardZone) {
      this.activeForwardZone = false;
      uiManager.hideInteractionPrompt();
    }

    // Interact
    if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
      this.interactCooldown = 500;

      // Let subclass handle first
      if (this.onInteractPressed()) {
        // Handled by subclass
      } else if (this.activeForwardZone && this.layout.nextScene) {
        this.transitionToScene(this.layout.nextScene);
      } else if (this.activeExitZone) {
        if (this.layout.previousScene) {
          this.transitionToScene(this.layout.previousScene);
        } else {
          this.exitToOverworld();
        }
      }
    }

    // Back/ESC
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      if (this.layout.previousScene) {
        this.transitionToScene(this.layout.previousScene);
      } else {
        this.exitToOverworld();
      }
    }
  }

  protected buildInteriorTileMap(layout: InteriorLayout, mapPxW: number, mapPxH: number): void {
    const rt = this.add.renderTexture(0, 0, mapPxW, mapPxH);
    rt.setOrigin(0, 0);
    rt.setDepth(-50);

    const floorTypeToFrame: Record<string, number> = {
      wood: InteriorTileType.Wood,
      carpet: InteriorTileType.Carpet,
      carpet_beige: InteriorTileType.CarpetBeige,
      tile_floor: InteriorTileType.TileFloor,
    };

    // First pass: draw walls everywhere (skip window tiles and tarmac zone)
    const windowSet = new Set(
      (layout.windowTiles ?? []).map(t => `${t.tileX},${t.tileY}`)
    );
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        if (layout.wallGrid[y][x] && !windowSet.has(`${x},${y}`)) {
          rt.drawFrame('interior-terrain', InteriorTileType.Wall, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Second pass: draw floor zones (skip tarmac zone)
    for (const fz of layout.floors) {
      const frame = floorTypeToFrame[fz.floorType] ?? InteriorTileType.Wood;
      for (let y = fz.tileY; y < fz.tileY + fz.height; y++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        for (let x = fz.tileX; x < fz.tileX + fz.width; x++) {
          rt.drawFrame('interior-terrain', frame, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Third pass: draw door frames at doorway positions (skip tarmac zone)
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        if (!layout.wallGrid[y][x]) {
          let inFloorZone = false;
          for (const fz of layout.floors) {
            if (x >= fz.tileX && x < fz.tileX + fz.width && y >= fz.tileY && y < fz.tileY + fz.height) {
              inFloorZone = true;
              break;
            }
          }
          if (!inFloorZone) {
            rt.drawFrame('interior-terrain', InteriorTileType.DoorFrame, x * TILE_SIZE, y * TILE_SIZE);
          }
        }
      }
    }
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

  private getInteriorFootstepSurface(tileX: number, tileY: number): FootstepSurface {
    const floorTypeMap: Record<string, FootstepSurface> = {
      wood: 'wood',
      carpet: 'carpet',
      carpet_beige: 'carpet',
      tile_floor: 'tile',
    };
    for (const zone of this.layout.floors) {
      if (tileX >= zone.tileX && tileX < zone.tileX + zone.width &&
          tileY >= zone.tileY && tileY < zone.tileY + zone.height) {
        return floorTypeMap[zone.floorType] ?? 'wood';
      }
    }
    return 'wood'; // default interior surface
  }

  protected getWalkCheck(layout: InteriorLayout): (tileX: number, tileY: number) => boolean {
    return createInteriorWalkCheck(layout);
  }

  protected onInteractPressed(): boolean {
    return false;
  }

  protected transitionToScene(sceneKey: string): void {
    audioManager.playSFX('door_close');
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, {
        returnX: this.returnData.returnX,
        returnY: this.returnData.returnY,
      });
    });
  }

  protected exitToOverworld(): void {
    audioManager.playSFX('door_close');
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene', {
        returnFromInterior: true,
        returnX: this.returnData.returnX,
        returnY: this.returnData.returnY,
      });
    });
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.player?.destroy();
    this.partner?.destroy();
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
  }
}
