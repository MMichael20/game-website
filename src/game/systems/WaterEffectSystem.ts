// src/game/systems/WaterEffectSystem.ts
import Phaser from 'phaser';
import { TILE_SIZE } from '../../utils/constants';

const BUBBLE_KEY = '__water_bubble';
const FOAM_KEY = '__water_foam';

interface WaterFX {
  overlay: Phaser.GameObjects.Graphics;
  bubbleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  foamEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  depth: number; // 0=dry, 1=wading, 2=swimming
}

interface WaterEffectConfig {
  getTileType: (tileX: number, tileY: number) => number;
  waterTileValue: number;
  wadingSpeed?: number;
  swimmingSpeed?: number;
  isDeepWater?: (tileY: number) => boolean;
}

export class WaterEffectSystem {
  private scene: Phaser.Scene;
  private config: WaterEffectConfig;
  private playerFX!: WaterFX;
  private partnerFX!: WaterFX;
  private wadingSpeed: number;
  private swimmingSpeed: number;

  constructor(scene: Phaser.Scene, config: WaterEffectConfig) {
    this.scene = scene;
    this.config = config;
    this.wadingSpeed = config.wadingSpeed ?? 0.8;
    this.swimmingSpeed = config.swimmingSpeed ?? 0.55;
  }

  create(): void {
    this.createWaterTextures();
    this.playerFX = this.createWaterFX();
    this.partnerFX = this.createWaterFX();
  }

  update(
    player: { sprite: Phaser.GameObjects.Sprite; speedMultiplier: number },
    partner: { sprite: Phaser.GameObjects.Sprite; speedMultiplier: number },
  ): void {
    const ptx = Math.floor(player.sprite.x / TILE_SIZE);
    const pty = Math.floor(player.sprite.y / TILE_SIZE);
    this.updateWaterEffect(player.sprite, ptx, pty, this.playerFX, (m) => { player.speedMultiplier = m; });

    const patx = Math.floor(partner.sprite.x / TILE_SIZE);
    const paty = Math.floor(partner.sprite.y / TILE_SIZE);
    this.updateWaterEffect(partner.sprite, patx, paty, this.partnerFX, (m) => { partner.speedMultiplier = m; });
  }

  shutdown(
    player: { speedMultiplier: number },
    partner: { speedMultiplier: number },
  ): void {
    player.speedMultiplier = 1.0;
    partner.speedMultiplier = 1.0;
  }

  private createWaterTextures(): void {
    if (!this.scene.textures.exists(BUBBLE_KEY)) {
      const c = this.scene.textures.createCanvas(BUBBLE_KEY, 6, 6)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(3, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(2, 2, 1, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }

    if (!this.scene.textures.exists(FOAM_KEY)) {
      const c = this.scene.textures.createCanvas(FOAM_KEY, 8, 4)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(4, 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }

  private createWaterFX(): WaterFX {
    const overlay = this.scene.add.graphics().setDepth(11).setVisible(false);

    const bubbleEmitter = this.scene.add.particles(0, 0, BUBBLE_KEY, {
      speed: { min: 8, max: 20 },
      angle: { min: 240, max: 300 },
      lifespan: { min: 600, max: 1200 },
      frequency: 300,
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.3 },
      emitting: false,
    });
    bubbleEmitter.setDepth(12);

    const foamEmitter = this.scene.add.particles(0, 0, FOAM_KEY, {
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
    const tileType = this.config.getTileType(tileX, tileY);
    if (tileType !== this.config.waterTileValue) {
      fx.overlay.setVisible(false);
      fx.bubbleEmitter.emitting = false;
      fx.foamEmitter.emitting = false;
      if (fx.depth !== 0) setSpeed(1.0);
      fx.depth = 0;
      return;
    }

    const isDeep = this.config.isDeepWater?.(tileY) ?? false;
    const depth = isDeep ? 2 : 1;
    setSpeed(depth === 2 ? this.swimmingSpeed : this.wadingSpeed);
    fx.overlay.setVisible(true);
    fx.depth = depth;

    const gfx = fx.overlay;
    gfx.clear();

    const cx = sprite.x;
    const cy = sprite.y;
    const halfW = 26;
    const t = this.scene.time.now;

    let waterTop: number;
    let waterBottom: number;

    if (depth === 2) {
      const bob = Math.sin(t / 400) * 2;
      waterTop = cy - 2 + bob;
      waterBottom = cy + 28;
    } else {
      waterTop = cy + 10;
      waterBottom = cy + 28;
    }

    const wave1 = Math.sin(t / 300) * 2;
    const wave2 = Math.sin(t / 250 + 1.5) * 1.5;
    const wave3 = Math.sin(t / 350 + 3) * 2;

    gfx.fillStyle(0x1a8ccc, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, waterTop + wave1);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 - 1);
    gfx.lineTo(cx, waterTop + wave3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 1);
    gfx.lineTo(cx + halfW, waterTop + wave1 - 0.5);
    gfx.lineTo(cx + halfW, waterBottom);
    gfx.lineTo(cx - halfW, waterBottom);
    gfx.closePath();
    gfx.fillPath();

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

    const emitY = waterTop + 2;
    fx.bubbleEmitter.setPosition(cx, emitY);
    fx.foamEmitter.setPosition(cx, emitY);

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
}
