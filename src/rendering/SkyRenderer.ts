import Phaser from 'phaser';
import { getSkyColors, lerpColor } from '../utils/canvasUtils';

interface CloudObject {
  graphics: Phaser.GameObjects.Graphics;
  worldX: number;
  speed: number;
  width: number;
  baseY: number;
  alpha: number;
  puffs: Array<{ rx: number; ry: number; rw: number; rh: number }>;
}

export class SkyRenderer {
  private skyBg!: Phaser.GameObjects.Graphics;
  private clouds: CloudObject[] = [];
  private sun!: Phaser.GameObjects.Graphics;
  private haze!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; size: number }> = [];
  private screenW = 0;
  private screenH = 0;
  private worldW = 0;

  create(scene: Phaser.Scene, worldW: number, _worldH: number): void {
    this.screenW = scene.cameras.main.width;
    this.screenH = scene.cameras.main.height;
    this.worldW = worldW;

    // Sky background — fixed to camera
    this.skyBg = scene.add.graphics();
    this.skyBg.setScrollFactor(0);
    this.skyBg.setDepth(-10000);

    // Generate star positions (deterministic via fixed math)
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: ((i * 137 + 53) % this.screenW),
        y: ((i * 97 + 31) % (this.screenH * 0.6)),
        size: (i % 3 === 0) ? 1.5 : 1,
      });
    }

    // Sun/Moon
    this.sun = scene.add.graphics();
    this.sun.setScrollFactor(0);
    this.sun.setDepth(-9998);

    // Clouds — 3 layers with different parallax
    const cloudConfigs = [
      { count: 4, scrollFactor: 0.05, speedMin: 4, speedMax: 8, alphaMin: 0.2, alphaMax: 0.35, yMin: 0.05, yMax: 0.2 },
      { count: 4, scrollFactor: 0.15, speedMin: 8, speedMax: 15, alphaMin: 0.3, alphaMax: 0.5, yMin: 0.1, yMax: 0.3 },
      { count: 3, scrollFactor: 0.3, speedMin: 15, speedMax: 25, alphaMin: 0.4, alphaMax: 0.6, yMin: 0.15, yMax: 0.35 },
    ];

    for (const cfg of cloudConfigs) {
      for (let i = 0; i < cfg.count; i++) {
        const g = scene.add.graphics();
        g.setScrollFactor(cfg.scrollFactor, 0);
        g.setDepth(-9999);

        const cloudW = 60 + (i * 37 % 80);
        const puffs = this.generateCloudPuffs(cloudW);

        const cloud: CloudObject = {
          graphics: g,
          worldX: (i * (worldW / cfg.count)) + (i * 73 % 100),
          speed: cfg.speedMin + (i * 13 % (cfg.speedMax - cfg.speedMin)),
          width: cloudW,
          baseY: this.screenH * (cfg.yMin + (i * 41 % 100) / 100 * (cfg.yMax - cfg.yMin)),
          alpha: cfg.alphaMin + (i * 23 % 100) / 100 * (cfg.alphaMax - cfg.alphaMin),
          puffs,
        };
        this.clouds.push(cloud);
      }
    }

    // Atmospheric haze
    this.haze = scene.add.graphics();
    this.haze.setScrollFactor(0);
    this.haze.setDepth(-9997);
  }

  private generateCloudPuffs(cloudW: number): Array<{ rx: number; ry: number; rw: number; rh: number }> {
    const puffs = [];
    const count = 3 + Math.floor(cloudW / 30);
    for (let i = 0; i < count; i++) {
      puffs.push({
        rx: (i / count) * cloudW - cloudW / 2,
        ry: (i % 2 === 0 ? -5 : 3) + (i * 7 % 6 - 3),
        rw: 20 + (i * 13 % 25),
        rh: 12 + (i * 11 % 10),
      });
    }
    return puffs;
  }

  update(_scene: Phaser.Scene, gameTimeMinutes: number, delta: number): void {
    const colors = getSkyColors(gameTimeMinutes);
    const deltaS = delta / 1000;

    // Draw sky gradient
    this.skyBg.clear();
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(colors.topColor, colors.bottomColor, t);
      const bandH = Math.ceil(this.screenH / steps) + 1;
      this.skyBg.fillStyle(this.cssToHex(color), 1);
      this.skyBg.fillRect(0, Math.floor(t * this.screenH), this.screenW, bandH);
    }

    // Draw stars (only when visible)
    if (colors.starOpacity > 0.01) {
      for (const star of this.stars) {
        this.skyBg.fillStyle(0xffffff, colors.starOpacity * (0.5 + Math.sin(star.x + gameTimeMinutes * 0.1) * 0.5));
        this.skyBg.fillCircle(star.x, star.y, star.size);
      }
    }

    // Sun / Moon
    this.sun.clear();
    const t = gameTimeMinutes % 1440;
    if (t > 360 && t < 1140) {
      // Daytime — draw sun
      const sunProgress = (t - 360) / (1140 - 360);
      const sunAngle = Math.PI * sunProgress;
      const sunX = this.screenW * 0.1 + Math.sin(sunAngle) * this.screenW * 0.8;
      const sunY = this.screenH * 0.45 - Math.sin(sunAngle) * this.screenH * 0.35;

      // Sun glow
      this.sun.fillStyle(0xfff5c0, 0.15);
      this.sun.fillCircle(sunX, sunY, 30);
      this.sun.fillStyle(0xfff5c0, 0.3);
      this.sun.fillCircle(sunX, sunY, 18);
      this.sun.fillStyle(0xfffde0, 0.9);
      this.sun.fillCircle(sunX, sunY, 10);
    } else {
      // Nighttime — draw moon
      const moonProgress = t < 360
        ? (t + 1440 - 1140) / (1440 - 1140 + 360)
        : (t - 1140) / (1440 - 1140 + 360);
      const moonAngle = Math.PI * moonProgress;
      const moonX = this.screenW * 0.2 + Math.sin(moonAngle) * this.screenW * 0.6;
      const moonY = this.screenH * 0.4 - Math.sin(moonAngle) * this.screenH * 0.3;

      // Moon glow
      this.sun.fillStyle(0xc8d8f0, 0.1);
      this.sun.fillCircle(moonX, moonY, 20);
      this.sun.fillStyle(0xe8e8f0, 0.7);
      this.sun.fillCircle(moonX, moonY, 8);
    }

    // Update clouds
    for (const cloud of this.clouds) {
      cloud.worldX += cloud.speed * deltaS;
      if (cloud.worldX > this.worldW + cloud.width) {
        cloud.worldX = -cloud.width;
      }

      cloud.graphics.clear();
      cloud.graphics.fillStyle(0xffffff, cloud.alpha);
      for (const puff of cloud.puffs) {
        cloud.graphics.fillEllipse(
          cloud.worldX + puff.rx,
          cloud.baseY + puff.ry,
          puff.rw,
          puff.rh,
        );
      }
    }

    // Atmospheric haze
    this.haze.clear();
    const hazeAlpha = (t > 300 && t < 480) || (t > 1020 && t < 1200) ? 0.12 : 0.04;
    const hazeTop = this.screenH * 0.8;
    for (let i = 0; i < 8; i++) {
      const frac = i / 8;
      this.haze.fillStyle(0xc8dcff, hazeAlpha * frac);
      this.haze.fillRect(0, hazeTop + frac * (this.screenH - hazeTop), this.screenW, (this.screenH - hazeTop) / 8 + 1);
    }
  }

  private cssToHex(css: string): number {
    // Handle rgb(r,g,b) format
    const match = css.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return (parseInt(match[1]) << 16) | (parseInt(match[2]) << 8) | parseInt(match[3]);
    }
    // Handle #rrggbb format
    return parseInt(css.replace('#', ''), 16);
  }
}
