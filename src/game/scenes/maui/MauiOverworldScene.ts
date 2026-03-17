// src/game/scenes/maui/MauiOverworldScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import {
  MAUI_WIDTH, MAUI_HEIGHT, mauiTileGrid, isMauiWalkable,
  MAUI_NPCS, MAUI_CHECKPOINT_ZONES, MAUI_DECORATIONS, MAUI_BUILDINGS,
  getMauiTileType, MauiTileType,
} from './mauiMap';

const BEACH_TILE_Y = 14;

const BUBBLE_KEY = '__water_bubble';
const FOAM_KEY = '__water_foam';

interface WaterFX {
  overlay: Phaser.GameObjects.Graphics;
  bubbleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  foamEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  depth: number; // 0=dry, 1=wading, 2=swimming
}

export class MauiOverworldScene extends OverworldScene {
  private playerOnBeach = false;
  private partnerOnBeach = false;
  private playerWater!: WaterFX;
  private partnerWater!: WaterFX;

  constructor() {
    super({ key: 'MauiOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: MAUI_WIDTH,
      mapHeight: MAUI_HEIGHT,
      tileGrid: mauiTileGrid,
      walkCheck: isMauiWalkable,
      npcs: MAUI_NPCS,
      checkpointZones: MAUI_CHECKPOINT_ZONES,
      spawnX: 38 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 2 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      maui_hotel: 'Airbnb',
      maui_tennis: 'Tennis',
      maui_surfing: 'Surf Spot',
      maui_taxi: 'Taxi',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiOverworldScene');
  }

  onCreateExtras(): void {
    // Decorations
    MAUI_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    this.addWaveAnimations();
    this.createWaterTextures();
    this.playerWater = this.createWaterFX();
    this.partnerWater = this.createWaterFX();

    // Buildings
    MAUI_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    // Driving cars (visual-only, not NPCs)
    const mapPxWidth = MAUI_WIDTH * TILE_SIZE;
    const carDefs = [
      { key: 'car-red',   y: 12, direction: 1,  delay: 0 },
      { key: 'car-blue',  y: 11, direction: -1, delay: 3000 },
      { key: 'car-white', y: 13, direction: 1,  delay: 6000 },
    ];

    carDefs.forEach(def => {
      const worldY = def.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = def.direction > 0 ? -48 : mapPxWidth + 48;
      const endX = def.direction > 0 ? mapPxWidth + 48 : -48;
      const car = this.add.sprite(startX, worldY, def.key).setDepth(-3);
      if (def.direction < 0) car.setFlipX(true);

      this.time.delayedCall(def.delay, () => {
        this.tweens.add({
          targets: car,
          x: endX,
          duration: 10000,
          ease: 'Linear',
          repeat: -1,
          onRepeat: () => { car.x = startX; },
        });
      });
    });
  }

  private addWaveAnimations(): void {
    const wavePositions = [
      { x: 3, y: 26 }, { x: 10, y: 26 }, { x: 18, y: 26 },
      { x: 26, y: 26 }, { x: 34, y: 26 }, { x: 42, y: 26 },
    ];

    wavePositions.forEach((wp, i) => {
      const pos = tileToWorld(wp.x, wp.y);
      const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
        .setDepth(-8)
        .setAlpha(0.6);

      this.tweens.add({
        targets: wave,
        x: pos.x + 16,
        alpha: 0.25,
        duration: 2000 + i * 200,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
        delay: i * 300,
      });
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Beach swimsuit detection
    const playerTileY = Math.floor(this.player.sprite.y / TILE_SIZE);
    if (playerTileY >= BEACH_TILE_Y && !this.playerOnBeach) {
      this.playerOnBeach = true;
      this.player.setTemporaryTexture('player-swimsuit', this);
    } else if (playerTileY < BEACH_TILE_Y && this.playerOnBeach) {
      this.playerOnBeach = false;
      this.player.restoreTexture(this);
    }

    const partnerTileY = Math.floor(this.partner.sprite.y / TILE_SIZE);
    if (partnerTileY >= BEACH_TILE_Y && !this.partnerOnBeach) {
      this.partnerOnBeach = true;
      this.partner.setTemporaryTexture('partner-swimsuit', this);
    } else if (partnerTileY < BEACH_TILE_Y && this.partnerOnBeach) {
      this.partnerOnBeach = false;
      this.partner.restoreTexture(this);
    }

    // Water overlay effects
    const playerTileX = Math.floor(this.player.sprite.x / TILE_SIZE);
    this.updateWaterEffect(this.player.sprite, playerTileX, playerTileY, this.playerWater,
      (m) => { this.player.speedMultiplier = m; });

    const partnerTileX = Math.floor(this.partner.sprite.x / TILE_SIZE);
    this.updateWaterEffect(this.partner.sprite, partnerTileX, partnerTileY, this.partnerWater,
      (m) => { this.partner.speedMultiplier = m; });
  }

  private createWaterTextures(): void {
    // Small circle for bubbles
    if (!this.textures.exists(BUBBLE_KEY)) {
      const c = this.textures.createCanvas(BUBBLE_KEY, 6, 6)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(3, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(2, 2, 1, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }

    // Small foam splash dot
    if (!this.textures.exists(FOAM_KEY)) {
      const c = this.textures.createCanvas(FOAM_KEY, 8, 4)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(4, 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }

  private createWaterFX(): WaterFX {
    const overlay = this.add.graphics().setDepth(11).setVisible(false);

    const bubbleEmitter = this.add.particles(0, 0, BUBBLE_KEY, {
      speed: { min: 8, max: 20 },
      angle: { min: 240, max: 300 },
      lifespan: { min: 600, max: 1200 },
      frequency: 300,
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.3 },
      emitting: false,
    });
    bubbleEmitter.setDepth(12);

    const foamEmitter = this.add.particles(0, 0, FOAM_KEY, {
      speed: { min: 5, max: 15 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 800 },
      frequency: 500,
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.8, end: 0.2 },
      emitting: false,
    });
    foamEmitter.setDepth(12);

    return { overlay, bubbleEmitter, foamEmitter, depth: 0 };
  }

  private updateWaterEffect(
    sprite: Phaser.GameObjects.Sprite,
    tileX: number,
    tileY: number,
    fx: WaterFX,
    setSpeed: (m: number) => void,
  ): void {
    const tileType = getMauiTileType(tileX, tileY);
    if (tileType !== MauiTileType.ShallowWater) {
      fx.overlay.setVisible(false);
      fx.bubbleEmitter.emitting = false;
      fx.foamEmitter.emitting = false;
      if (fx.depth !== 0) setSpeed(1.0);
      fx.depth = 0;
      return;
    }

    const depth = tileY >= 25 ? 2 : 1;
    setSpeed(depth === 2 ? 0.55 : 0.8);
    fx.overlay.setVisible(true);
    fx.depth = depth;

    // Draw the water overlay with a wavy top edge
    const gfx = fx.overlay;
    gfx.clear();

    const cx = sprite.x;
    const cy = sprite.y;
    const halfW = 26; // slightly wider than sprite
    const t = this.time.now;

    let waterTop: number;
    let waterBottom: number;

    if (depth === 2) {
      // Swimming — water covers from mid-body down, with bobbing
      const bob = Math.sin(t / 400) * 2;
      waterTop = cy - 2 + bob;
      waterBottom = cy + 28;
    } else {
      // Wading — water covers feet/lower legs
      waterTop = cy + 10;
      waterBottom = cy + 28;
    }

    // Wavy top edge using sine offsets
    const wave1 = Math.sin(t / 300) * 2;
    const wave2 = Math.sin(t / 250 + 1.5) * 1.5;
    const wave3 = Math.sin(t / 350 + 3) * 2;

    // Semi-transparent water body with gradient effect
    gfx.fillStyle(0x1a8ccc, 0.4);
    gfx.beginPath();
    // Wavy top edge — 5 control points
    gfx.moveTo(cx - halfW, waterTop + wave1);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 - 1);
    gfx.lineTo(cx, waterTop + wave3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 1);
    gfx.lineTo(cx + halfW, waterTop + wave1 - 0.5);
    // Bottom edge (flat)
    gfx.lineTo(cx + halfW, waterBottom);
    gfx.lineTo(cx - halfW, waterBottom);
    gfx.closePath();
    gfx.fillPath();

    // Lighter highlight near the wavy top for foam line
    gfx.fillStyle(0xffffff, 0.25);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, waterTop + wave1);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 - 1);
    gfx.lineTo(cx, waterTop + wave3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 1);
    gfx.lineTo(cx + halfW, waterTop + wave1 - 0.5);
    gfx.lineTo(cx + halfW, waterTop + wave1 + 3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 4);
    gfx.lineTo(cx, waterTop + wave3 + 3);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 + 2);
    gfx.lineTo(cx - halfW, waterTop + wave1 + 3);
    gfx.closePath();
    gfx.fillPath();

    // Position particle emitters at the character's water line
    const emitY = waterTop + 2;
    fx.bubbleEmitter.setPosition(cx, emitY);
    fx.foamEmitter.setPosition(cx, emitY);

    // Only emit particles — more bubbles when swimming
    fx.bubbleEmitter.emitting = true;
    fx.foamEmitter.emitting = true;

    if (depth === 2) {
      fx.bubbleEmitter.frequency = 200;
      fx.foamEmitter.frequency = 350;
    } else {
      fx.bubbleEmitter.frequency = 500;
      fx.foamEmitter.frequency = 700;
    }
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    if (zone.id === 'maui_hotel') {
      this.fadeToScene('MauiHotelScene', { returnX: pos.x, returnY: pos.y });
    } else if (zone.id === 'maui_tennis') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TennisScene', { returnScene: 'MauiOverworldScene' });
    } else if (zone.id === 'maui_surfing') {
      uiManager.showNPCDialog(['Cowabunga! You caught a gnarly wave!'], () => {
        uiManager.hideNPCDialog();
      });
    } else if (zone.id === 'maui_taxi') {
      uiManager.showNPCDialog(
        ['Ready to head to the airport?', 'Hang loose! Enjoy your flight home!'],
        () => {
          uiManager.hideNPCDialog();
          uiManager.hideHUD();
          uiManager.hideInteractionPrompt();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 500, ease: 'Linear',
            onComplete: () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            },
          });
        },
      );
    }
  }

  shutdown(): void {
    // Restore textures before leaving so other scenes don't get stuck in swimsuits
    if (this.playerOnBeach) {
      this.player.restoreTexture(this);
      this.playerOnBeach = false;
    }
    if (this.partnerOnBeach) {
      this.partner.restoreTexture(this);
      this.partnerOnBeach = false;
    }
    this.player.speedMultiplier = 1.0;
    this.partner.speedMultiplier = 1.0;
    super.shutdown();
  }

  protected onBack(): void {
    // No-op for now
  }
}
