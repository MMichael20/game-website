import Phaser from 'phaser';

/**
 * Generates small particle textures using offscreen Canvas 2D
 * and registers them with the Phaser texture manager.
 */
export function generateParticleTextures(scene: Phaser.Scene): void {
  // --- Leaf texture (12x12) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 12, 12);
    gradient.addColorStop(0, '#4a7c3f');
    gradient.addColorStop(1, '#2d5a1b');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.bezierCurveTo(10, 2, 12, 6, 6, 12);
    ctx.bezierCurveTo(0, 6, 2, 2, 6, 0);
    ctx.closePath();
    ctx.fill();

    // Vein line down center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(6, 11);
    ctx.stroke();

    scene.textures.addCanvas('particle-leaf', canvas);
  }

  // --- Steam texture (8x8) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(4, 4, 4, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-steam', canvas);
  }

  // --- Sparkle texture (8x8) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 8, 8);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(1, '#ffffff');

    ctx.fillStyle = gradient;

    // Vertical diamond
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(5, 3);
    ctx.lineTo(4, 8);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();

    // Horizontal diamond
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(3, 3);
    ctx.lineTo(8, 4);
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();

    scene.textures.addCanvas('particle-sparkle', canvas);
  }

  // --- Smoke texture (12x12) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    gradient.addColorStop(0, 'rgba(153, 153, 153, 1)');
    gradient.addColorStop(1, 'rgba(153, 153, 153, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(6, 6, 6, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-smoke', canvas);
  }

  // --- Butterfly texture (10x10) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;

    // Body
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(4, 3, 2, 5);

    // Wings (colorful dots)
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.ellipse(2, 4, 2.5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffa07a';
    ctx.beginPath();
    ctx.ellipse(8, 4, 2.5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-butterfly', canvas);
  }

  // --- Fountain water droplet (6x6) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 6;
    canvas.height = 6;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    gradient.addColorStop(0, 'rgba(106, 184, 232, 1)');
    gradient.addColorStop(1, 'rgba(106, 184, 232, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(3, 3, 3, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-water', canvas);
  }
}

/**
 * Phaser 3.60+ particle emitter configurations.
 * Usage: scene.add.particles(x, y, textureKey, config)
 */
export const PARTICLE_CONFIGS = {
  leaves: {
    speed: { min: 10, max: 30 },
    angle: { min: 60, max: 120 },
    rotate: { min: 0, max: 360 },
    lifespan: 4000,
    frequency: 800,
    alpha: { start: 0.8, end: 0 },
    scale: { start: 1, end: 0.5 },
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-60, -60, 120, 40),
    },
  },

  steam: {
    speed: { min: 15, max: 40 },
    angle: { min: 250, max: 290 },
    lifespan: 2000,
    frequency: 300,
    alpha: { start: 0.5, end: 0 },
    scale: { start: 0.5, end: 1.5 },
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-10, -5, 20, 5),
    },
  },

  sparkles: {
    speed: { min: 5, max: 15 },
    angle: { min: 0, max: 360 },
    lifespan: 1500,
    frequency: 400,
    alpha: { start: 1, end: 0 },
    scale: { start: 0.3, end: 0.8 },
    tint: [0xffd700, 0xffffff, 0xffe4b5],
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-40, -40, 80, 80),
    },
  },

  smoke: {
    speed: { min: 10, max: 25 },
    angle: { min: 255, max: 285 },
    lifespan: 3000,
    frequency: 500,
    alpha: { start: 0.4, end: 0 },
    scale: { start: 0.5, end: 2 },
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-5, -5, 10, 5),
    },
  },

  butterflies: {
    speed: { min: 3, max: 8 },
    angle: { min: 0, max: 360 },
    lifespan: 6000,
    frequency: 2000,
    alpha: { start: 0.9, end: 0 },
    scale: { start: 1, end: 0.8 },
    rotate: { min: -15, max: 15 },
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-80, -40, 160, 80),
    },
  },

  fountainWater: {
    speed: { min: 8, max: 20 },
    angle: { min: 240, max: 300 },
    lifespan: 1500,
    frequency: 200,
    alpha: { start: 0.7, end: 0 },
    scale: { start: 0.6, end: 0.3 },
    gravityY: 30,
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-8, -4, 16, 4),
    },
  },
};
