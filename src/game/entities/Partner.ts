// src/game/entities/Partner.ts
import Phaser from 'phaser';

const FOLLOW_DISTANCE = 64;
const LERP_SPEED = 0.08;
const SNAP_DISTANCE = 6;

export class Partner {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private currentOutfit = 0;
  private positionHistory: Array<{ x: number; y: number }> = [];
  private historySize = 15;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit: number) {
    this.currentOutfit = outfit;
    const key = `partner-outfit-${outfit}`;
    this.sprite = scene.physics.add.sprite(x + FOLLOW_DISTANCE, y, key, 0);
    this.sprite.setSize(36, 36);
    this.sprite.setOffset(14, 22);
    this.sprite.setDepth(9);

    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene): void {
    const key = `partner-outfit-${this.currentOutfit}`;
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, row) => {
      const animKey = `partner-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [
            { key, frame: row * 3 },
            { key, frame: row * 3 + 1 },
            { key, frame: row * 3 + 2 },
            { key, frame: row * 3 + 1 },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }

  update(playerPos: { x: number; y: number }): void {
    // Record player positions
    this.positionHistory.push({ ...playerPos });
    if (this.positionHistory.length > this.historySize) {
      this.positionHistory.shift();
    }

    // Target = oldest position in history (delayed follow)
    const target = this.positionHistory[0];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SNAP_DISTANCE) {
      // Snap — no jitter
      this.sprite.setVelocity(0, 0);
      this.sprite.anims.stop();
      return;
    }

    // Lerp with deceleration curve
    const lerpFactor = dist < 20 ? LERP_SPEED * 0.5 : LERP_SPEED;
    const moveX = dx * lerpFactor * 60; // approximate velocity
    const moveY = dy * lerpFactor * 60;

    this.sprite.setVelocity(moveX, moveY);

    // Animation
    if (Math.abs(moveX) > 5 || Math.abs(moveY) > 5) {
      let dir: string;
      if (Math.abs(moveX) > Math.abs(moveY)) {
        dir = moveX < 0 ? 'left' : 'right';
      } else {
        dir = moveY < 0 ? 'up' : 'down';
      }
      this.sprite.anims.play(`partner-${dir}`, true);
    } else {
      this.sprite.anims.stop();
    }
  }

  setOutfit(outfit: number, scene: Phaser.Scene): void {
    this.currentOutfit = outfit;
    this.sprite.setTexture(`partner-outfit-${outfit}`);
    this.createAnimations(scene);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
