// src/game/rendering/SkyRenderer.ts
import Phaser from 'phaser';

const SKY_COLOR = 0x87ceeb;
const CLOUD_COLOR = 0xffffff;
const CLOUD_ALPHA = 0.6;

interface CloudLayer {
  graphics: Phaser.GameObjects.Graphics;
  scrollFactor: number;
  driftTween: Phaser.Tweens.Tween;
}

export class SkyRenderer {
  private skyRect!: Phaser.GameObjects.Rectangle;
  private cloudLayers: CloudLayer[] = [];

  create(scene: Phaser.Scene): void {
    const cam = scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Sky background rectangle — fixed to camera
    this.skyRect = scene.add.rectangle(w / 2, h / 2, w * 2, h * 2, SKY_COLOR)
      .setScrollFactor(0)
      .setDepth(-100);

    // Three cloud layers with different parallax speeds
    const layerConfigs = [
      { scrollFactor: 0.05, yRange: [30, 80], count: 4, sizeRange: [40, 70] },
      { scrollFactor: 0.15, yRange: [50, 120], count: 3, sizeRange: [50, 90] },
      { scrollFactor: 0.3, yRange: [20, 100], count: 3, sizeRange: [30, 60] },
    ];

    layerConfigs.forEach((cfg) => {
      const g = scene.add.graphics();
      g.setScrollFactor(cfg.scrollFactor);
      g.setDepth(-99);
      g.setAlpha(CLOUD_ALPHA);

      // Draw some cloud shapes
      g.fillStyle(CLOUD_COLOR, 1);
      for (let i = 0; i < cfg.count; i++) {
        const cx = (w / (cfg.count + 1)) * (i + 1) + Phaser.Math.Between(-30, 30);
        const cy = Phaser.Math.Between(cfg.yRange[0], cfg.yRange[1]);
        const size = Phaser.Math.Between(cfg.sizeRange[0], cfg.sizeRange[1]);

        // Simple cloud = overlapping ellipses
        g.fillEllipse(cx, cy, size, size * 0.5);
        g.fillEllipse(cx - size * 0.3, cy + 5, size * 0.7, size * 0.4);
        g.fillEllipse(cx + size * 0.3, cy + 5, size * 0.7, size * 0.4);
      }

      // Slow drift tween — move the graphics x and reset
      const driftTween = scene.tweens.add({
        targets: g,
        x: { from: 0, to: w * 0.3 * cfg.scrollFactor },
        duration: 20000 / cfg.scrollFactor,
        ease: 'Linear',
        repeat: -1,
        yoyo: true,
      });

      this.cloudLayers.push({ graphics: g, scrollFactor: cfg.scrollFactor, driftTween });
    });
  }

  destroy(): void {
    this.skyRect?.destroy();
    this.cloudLayers.forEach(layer => {
      layer.driftTween?.destroy();
      layer.graphics?.destroy();
    });
    this.cloudLayers = [];
  }
}
