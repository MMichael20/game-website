// src/game/scenes/InteriorScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, INTERIOR_ZOOM, InteriorTileType } from '../../utils/constants';
import { InteriorLayout, createInteriorWalkCheck } from '../data/interiorLayouts';
import { worldToTile, tileToWorld } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { loadGameState } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';

interface InteriorSceneData {
  returnX: number;
  returnY: number;
}

export abstract class InteriorScene extends Phaser.Scene {
  protected player!: Player;
  protected partner!: Partner;
  protected inputSystem!: InputSystem;
  protected layout!: InteriorLayout;

  private returnData!: InteriorSceneData;
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

    // 3. Player & Partner at entrance
    const spawnPos = tileToWorld(layout.entrance.tileX, layout.entrance.tileY);
    const walkCheck = createInteriorWalkCheck(layout);
    this.player = new Player(this, spawnPos.x, spawnPos.y, state.outfits.player, walkCheck);
    this.partner = new Partner(this, spawnPos.x, spawnPos.y, state.outfits.partner);

    // 4. Input
    this.inputSystem = new InputSystem(this);
    this.inputSystem.enableClickToMove(walkCheck, layout.widthInTiles, layout.heightInTiles, () => this.player.getPosition());

    // 5. Camera
    const cam = this.cameras.main;
    cam.setZoom(layout.cameraZoom ?? INTERIOR_ZOOM);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, mapPxW, mapPxH);

    // 6. Physics bounds
    this.physics.world.setBounds(0, 0, mapPxW, mapPxH);
    this.player.sprite.setCollideWorldBounds(true);

    // 7. Fade in
    cam.setAlpha(0);
    this.tweens.add({
      targets: cam,
      alpha: 1,
      duration: 300,
      ease: 'Linear',
    });
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
      uiManager.showInteractionPrompt(exit.promptText);
    } else if ((!inExitZone || inForwardZone) && this.activeExitZone) {
      this.activeExitZone = false;
      uiManager.hideInteractionPrompt();
    }

    // Update forward exit zone prompt (hide if in back zone)
    if (inForwardZone && !inExitZone && !this.activeForwardZone && forwardExit) {
      this.activeForwardZone = true;
      this.activeExitZone = false;
      uiManager.showInteractionPrompt(forwardExit.promptText);
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

  private buildInteriorTileMap(layout: InteriorLayout, mapPxW: number, mapPxH: number): void {
    const rt = this.add.renderTexture(0, 0, mapPxW, mapPxH);
    rt.setOrigin(0, 0);
    rt.setDepth(-50);

    const floorTypeToFrame: Record<string, number> = {
      wood: InteriorTileType.Wood,
      carpet: InteriorTileType.Carpet,
      carpet_beige: InteriorTileType.CarpetBeige,
      tile_floor: InteriorTileType.TileFloor,
    };

    // First pass: draw walls everywhere
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.wallGrid[y][x]) {
          rt.drawFrame('interior-terrain', InteriorTileType.Wall, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Second pass: draw floor zones
    for (const fz of layout.floors) {
      const frame = floorTypeToFrame[fz.floorType] ?? InteriorTileType.Wood;
      for (let y = fz.tileY; y < fz.tileY + fz.height; y++) {
        for (let x = fz.tileX; x < fz.tileX + fz.width; x++) {
          rt.drawFrame('interior-terrain', frame, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Third pass: draw door frames at doorway positions
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
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

  protected onInteractPressed(): boolean {
    return false;
  }

  protected transitionToScene(sceneKey: string): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start(sceneKey, {
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('WorldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.player?.destroy();
    this.partner?.destroy();
    uiManager.hideInteractionPrompt();
  }
}
