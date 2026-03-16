// src/game/rendering/ParticleEffects.ts
import Phaser from 'phaser';

const PETAL_KEY = '__petal_8x8';
const SPARKLE_KEY = '__sparkle_4x4';

export class ParticleEffects {
  private petalEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  createPetals(scene: Phaser.Scene): void {
    // Create 8x8 petal canvas texture (pink ellipse)
    if (!scene.textures.exists(PETAL_KEY)) {
      const canvas = scene.textures.createCanvas(PETAL_KEY, 8, 8)!;
      const ctx = canvas.getContext();
      ctx.fillStyle = '#ffb7c5';
      ctx.beginPath();
      ctx.ellipse(4, 4, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      canvas.refresh();
    }

    this.petalEmitter = scene.add.particles(0, 0, PETAL_KEY, {
      x: { min: 0, max: scene.cameras.main.width },
      y: -10,
      speedX: { min: -20, max: -5 },
      speedY: { min: 15, max: 30 },
      lifespan: 6000,
      frequency: 2000,
      maxParticles: 15,
      alpha: { start: 0.8, end: 0 },
      scale: { start: 1, end: 0.5 },
    });

    this.petalEmitter.setScrollFactor(0.5);
    this.petalEmitter.setDepth(-10);
  }

  createSparkle(scene: Phaser.Scene, x: number, y: number): void {
    // Create 4x4 gold square texture
    if (!scene.textures.exists(SPARKLE_KEY)) {
      const canvas = scene.textures.createCanvas(SPARKLE_KEY, 4, 4)!;
      const ctx = canvas.getContext();
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(0, 0, 4, 4);
      canvas.refresh();
    }

    const emitter = scene.add.particles(x, y, SPARKLE_KEY, {
      speed: { min: 50, max: 100 },
      lifespan: 800,
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0.3 },
      emitting: false,
    });

    emitter.explode(10, x, y);
    this.sparkleEmitters.push(emitter);

    // Auto-cleanup after lifespan
    scene.time.delayedCall(1000, () => {
      emitter.destroy();
      const idx = this.sparkleEmitters.indexOf(emitter);
      if (idx !== -1) this.sparkleEmitters.splice(idx, 1);
    });
  }

  destroy(): void {
    this.petalEmitter?.destroy();
    this.petalEmitter = null;

    this.sparkleEmitters.forEach(e => e.destroy());
    this.sparkleEmitters = [];
  }
}
